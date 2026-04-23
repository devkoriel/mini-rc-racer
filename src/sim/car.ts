import { clamp, length3, type Vec3 } from "../util/math";
import { integrateChassis, type ChassisState } from "./physics";
import type { InputFrame } from "../engine/input";
import type { CarTuning, PickupId } from "./types";

export interface CarRuntime {
  readonly id: string;
  readonly tuning: CarTuning;
  readonly chassis: ChassisState;
  readonly rpm: number;
  readonly wheelSpin: number;
  readonly pickupHeld: PickupId | null;
  readonly boostRemaining: number;
  readonly shieldRemaining: number;
}

const sampleTorque = (curve: ReadonlyArray<readonly [number, number]>, rpmNormalized: number): number => {
  const r = clamp(rpmNormalized, 0, 1);
  for (let i = 1; i < curve.length; i += 1) {
    const [x0, y0] = curve[i - 1];
    const [x1, y1] = curve[i];
    if (r <= x1) {
      const span = x1 - x0 || 1;
      const local = (r - x0) / span;
      return y0 + (y1 - y0) * local;
    }
  }
  return curve[curve.length - 1][1];
};

const forwardVector = (yaw: number): Vec3 => ({ x: Math.sin(yaw), y: 0, z: Math.cos(yaw) });
const rightVector = (yaw: number): Vec3 => ({ x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) });

const MAX_SPEED_MPS = 26;
const STEER_RATE = 3.2;

export const stepCar = (
  runtime: CarRuntime,
  input: InputFrame,
  stepSeconds: number,
  offRoad: boolean
): CarRuntime => {
  const forward = forwardVector(runtime.chassis.yaw);
  const right = rightVector(runtime.chassis.yaw);
  const speed = length3(runtime.chassis.velocity);
  const forwardSpeed = runtime.chassis.velocity.x * forward.x + runtime.chassis.velocity.z * forward.z;
  const lateralSpeed = runtime.chassis.velocity.x * right.x + runtime.chassis.velocity.z * right.z;

  const rpmNormalized = clamp(speed / MAX_SPEED_MPS, 0, 1);
  const rpm = rpmNormalized * 8000;

  const boostActive = runtime.boostRemaining > 0;
  const boostMul = boostActive ? 1.6 : 1.0;
  const gripMul = (offRoad ? 0.5 : 1.0) * (boostActive ? 1.15 : 1.0);

  const throttleForce = sampleTorque(runtime.tuning.torqueCurve, rpmNormalized) * input.throttle * runtime.tuning.mass * 18 * boostMul;
  const brakeForce = input.brake * runtime.tuning.brakeStrength * runtime.tuning.mass * 22;

  const lateralForce = -lateralSpeed * runtime.tuning.mass * 8 * gripMul;

  const linear = {
    x: forward.x * (throttleForce - brakeForce) + right.x * lateralForce,
    y: 0,
    z: forward.z * (throttleForce - brakeForce) + right.z * lateralForce
  };
  const assist = 1 + runtime.tuning.steerAssist * (1 - clamp(speed / MAX_SPEED_MPS, 0, 1));
  const yawTorque = input.steer * STEER_RATE * runtime.tuning.mass * assist - runtime.chassis.angularVelocity * 1.4;

  const nextChassis = integrateChassis(
    runtime.chassis,
    { linear, yawTorque },
    runtime.tuning.mass,
    stepSeconds
  );

  return {
    ...runtime,
    chassis: nextChassis,
    rpm,
    wheelSpin: runtime.wheelSpin + forwardSpeed * stepSeconds * 14,
    boostRemaining: Math.max(0, runtime.boostRemaining - stepSeconds),
    shieldRemaining: Math.max(0, runtime.shieldRemaining - stepSeconds)
  };
};

export const grantPickup = (runtime: CarRuntime, pickup: PickupId): CarRuntime => ({
  ...runtime,
  pickupHeld: pickup
});

export const activateSparkBurst = (runtime: CarRuntime): CarRuntime => {
  if (runtime.pickupHeld !== "spark-burst") return runtime;
  return { ...runtime, pickupHeld: null, boostRemaining: Math.max(runtime.boostRemaining, 2.0) };
};
