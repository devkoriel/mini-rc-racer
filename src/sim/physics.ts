import { clamp, type Vec3 } from "../util/math";

export const tireLongitudinalForce = (
  slipRatio: number,
  loadKg: number,
  gripCeiling: number,
): number => {
  const peakSlip = 0.12;
  const normalized = slipRatio / peakSlip;
  const magnitude =
    Math.tanh(Math.abs(normalized) * 1.6) * loadKg * gripCeiling;
  return Math.sign(slipRatio) * magnitude;
};

export const tireLateralForce = (
  slipAngleRad: number,
  loadKg: number,
  gripCeiling: number,
): number => {
  const peakAngle = 0.105;
  const normalized = slipAngleRad / peakAngle;
  const magnitude =
    Math.tanh(Math.abs(normalized) * 1.3) * loadKg * gripCeiling;
  return Math.sign(slipAngleRad) * magnitude;
};

export interface ChassisState {
  readonly position: Vec3;
  readonly velocity: Vec3;
  readonly yaw: number;
  readonly angularVelocity: number;
}

export interface ChassisForce {
  readonly linear: Vec3;
  readonly yawTorque: number;
}

export const integrateChassis = (
  state: ChassisState,
  force: ChassisForce,
  massKg: number,
  stepSeconds: number,
): ChassisState => {
  const invMass = 1 / massKg;
  const accel = {
    x: force.linear.x * invMass,
    y: 0,
    z: force.linear.z * invMass,
  };
  const newVelocity = {
    x: state.velocity.x + accel.x * stepSeconds,
    y: 0,
    z: state.velocity.z + accel.z * stepSeconds,
  };
  const dragLinear = 0.02;
  const dampedVelocity = {
    x: newVelocity.x * (1 - dragLinear * stepSeconds),
    y: 0,
    z: newVelocity.z * (1 - dragLinear * stepSeconds),
  };
  const newPosition = {
    x: state.position.x + dampedVelocity.x * stepSeconds,
    y: state.position.y,
    z: state.position.z + dampedVelocity.z * stepSeconds,
  };
  const yawAccel = force.yawTorque * invMass * 12;
  const newAngularVelocity =
    (state.angularVelocity + yawAccel * stepSeconds) * (1 - 0.8 * stepSeconds);
  const newYaw = state.yaw + newAngularVelocity * stepSeconds;
  return {
    position: newPosition,
    velocity: dampedVelocity,
    yaw: newYaw,
    angularVelocity: clamp(newAngularVelocity, -6, 6),
  };
};
