import { describe, expect, it } from "vitest";
import { createTrackRuntime } from "../../src/sim/track-runtime";

const SQUARE = [
  { x: 0, y: 0, z: 0, halfWidth: 4 },
  { x: 10, y: 0, z: 0, halfWidth: 4 },
  { x: 10, y: 0, z: 10, halfWidth: 4 },
  { x: 0, y: 0, z: 10, halfWidth: 4 }
];

describe("track runtime", () => {
  it("initial progress at corner 0 is near 0", () => {
    const rt = createTrackRuntime(SQUARE, 512);
    const snap = rt.sampleProgress({ x: 0, y: 0, z: 0 }, 0);
    expect(snap.t).toBeLessThan(0.05);
    expect(snap.offTrack).toBe(false);
  });

  it("off-track flag set when far from centerline", () => {
    const rt = createTrackRuntime(SQUARE, 512);
    const snap = rt.sampleProgress({ x: 50, y: 0, z: 0 }, 0);
    expect(snap.offTrack).toBe(true);
  });

  it("progress advances monotonically along a traversal", () => {
    const rt = createTrackRuntime(SQUARE, 512);
    const a = rt.sampleProgress({ x: 5, y: 0, z: 0 }, 0);
    const b = rt.sampleProgress({ x: 10, y: 0, z: 5 }, a.t);
    expect(b.totalDistance).toBeGreaterThan(a.totalDistance);
  });
});
