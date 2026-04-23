import { describe, expect, it } from "vitest";
import { integrateChassis, tireLongitudinalForce, tireLateralForce } from "../../src/sim/physics";

describe("tire model", () => {
  it("longitudinal force is zero at zero slip", () => {
    expect(tireLongitudinalForce(0, 1, 1)).toBe(0);
  });

  it("longitudinal force saturates at grip ceiling", () => {
    expect(Math.abs(tireLongitudinalForce(10, 1, 1))).toBeCloseTo(1, 2);
  });

  it("lateral force reverses sign with slip angle", () => {
    expect(Math.sign(tireLateralForce(0.1, 1, 1))).toBe(1);
    expect(Math.sign(tireLateralForce(-0.1, 1, 1))).toBe(-1);
  });
});

describe("chassis integrator", () => {
  it("stationary chassis with no forces stays put", () => {
    const next = integrateChassis(
      { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, yaw: 0, angularVelocity: 0 },
      { linear: { x: 0, y: 0, z: 0 }, yawTorque: 0 },
      1.0,
      1 / 120
    );
    expect(next.position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("applied forward force accelerates the chassis along +z", () => {
    const next = integrateChassis(
      { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, yaw: 0, angularVelocity: 0 },
      { linear: { x: 0, y: 0, z: 10 }, yawTorque: 0 },
      1.0,
      1 / 120
    );
    expect(next.velocity.z).toBeGreaterThan(0);
    expect(next.position.z).toBeGreaterThan(0);
  });
});
