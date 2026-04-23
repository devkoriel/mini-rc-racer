import { describe, expect, it } from "vitest";
import { stepCar, type CarRuntime } from "../../src/sim/car";
import type { InputFrame } from "../../src/engine/input";
import { emptyInputFrame } from "../../src/engine/input";

const STOCK_TUNING = {
  mass: 1.2,
  wheelbase: 0.22,
  trackWidth: 0.14,
  cgHeight: 0.05,
  gripCeiling: 1.0,
  torqueCurve: [[0, 0.4], [0.5, 1.0], [1.0, 0.65]] as const,
  downforce: 0.2,
  brakeStrength: 1.0,
  steerAssist: 0.3
};

const initial = (): CarRuntime => ({
  id: "player",
  tuning: STOCK_TUNING,
  chassis: {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    yaw: 0,
    angularVelocity: 0
  },
  rpm: 0,
  wheelSpin: 0,
  pickupHeld: null,
  boostRemaining: 0,
  shieldRemaining: 0
});

describe("stepCar", () => {
  it("full throttle accelerates the car forward", () => {
    const input: InputFrame = { ...emptyInputFrame(), throttle: 1 };
    let runtime = initial();
    for (let i = 0; i < 60; i += 1) {
      runtime = stepCar(runtime, input, 1 / 120, false);
    }
    expect(runtime.chassis.velocity.z).toBeGreaterThan(0);
    expect(runtime.chassis.position.z).toBeGreaterThan(0);
  });

  it("steering input builds angular velocity", () => {
    const input: InputFrame = { ...emptyInputFrame(), throttle: 1, steer: 0.8 };
    let runtime = initial();
    for (let i = 0; i < 60; i += 1) {
      runtime = stepCar(runtime, input, 1 / 120, false);
    }
    expect(Math.abs(runtime.chassis.angularVelocity)).toBeGreaterThan(0);
  });

  it("brakes reduce forward velocity", () => {
    let runtime = initial();
    runtime = {
      ...runtime,
      chassis: { ...runtime.chassis, velocity: { x: 0, y: 0, z: 20 } }
    };
    const brakeInput: InputFrame = { ...emptyInputFrame(), brake: 1 };
    for (let i = 0; i < 60; i += 1) {
      runtime = stepCar(runtime, brakeInput, 1 / 120, false);
    }
    expect(runtime.chassis.velocity.z).toBeLessThan(20);
  });
});
