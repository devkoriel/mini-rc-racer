import { describe, expect, it } from "vitest";
import { createPickup, stepPickup } from "../../src/sim/pickups";

describe("pickup system", () => {
  it("pickup starts active", () => {
    const p = createPickup("spark-burst-01", "spark-burst", { x: 0, y: 0, z: 0 });
    expect(p.active).toBe(true);
  });

  it("collected pickup becomes inactive and schedules respawn", () => {
    const p = createPickup("spark-burst-01", "spark-burst", { x: 0, y: 0, z: 0 });
    const next = stepPickup({ ...p, active: false, respawnRemaining: 5 }, 0.5);
    expect(next.active).toBe(false);
    expect(next.respawnRemaining).toBeCloseTo(4.5, 6);
  });

  it("respawn completes when timer expires", () => {
    const p = createPickup("spark-burst-01", "spark-burst", { x: 0, y: 0, z: 0 });
    const next = stepPickup({ ...p, active: false, respawnRemaining: 0.1 }, 0.5);
    expect(next.active).toBe(true);
    expect(next.respawnRemaining).toBe(0);
  });
});
