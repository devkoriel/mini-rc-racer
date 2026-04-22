import { describe, expect, it } from "vitest";
import { TrackSchema } from "../../src/data/schemas";

const VALID_TRACK = {
  id: "sector-18",
  displayName: "Sector 18",
  fantasy: "suburban cul-de-sac",
  recommendedClass: "stock",
  spline: [
    { x: 0, y: 0, z: 0, halfWidth: 4 },
    { x: 10, y: 0, z: 0, halfWidth: 4 },
    { x: 10, y: 0, z: 10, halfWidth: 4 },
    { x: 0, y: 0, z: 10, halfWidth: 4 }
  ],
  surfaces: {
    road:     { innerOffset: 0, outerOffset: 0 },
    curb:     { innerOffset: 0, outerOffset: 0.4 },
    sidewalk: { innerOffset: 0.4, outerOffset: 2 },
    verge:    { innerOffset: 2, outerOffset: 6 }
  },
  props: [],
  pickups: [{ progress: 0.25, sideOffset: 0 }],
  checkpoints: [0.25, 0.5, 0.75],
  lightmapAtlas: "neutral.png",
  lighting: {
    sunDirection: [0.4, 0.8, 0.2],
    hemisphereSky: "#a8c4e0",
    hemisphereGround: "#504030",
    fogDensity: 0.003
  }
};

describe("TrackSchema", () => {
  it("accepts a valid track", () => {
    const parsed = TrackSchema.parse(VALID_TRACK);
    expect(parsed.id).toBe("sector-18");
    expect(parsed.spline).toHaveLength(4);
  });

  it("rejects a track with fewer than 4 spline points", () => {
    const bad = { ...VALID_TRACK, spline: VALID_TRACK.spline.slice(0, 3) };
    expect(() => TrackSchema.parse(bad)).toThrow();
  });

  it("rejects a track with progress values outside [0, 1]", () => {
    const bad = { ...VALID_TRACK, pickups: [{ progress: 1.5, sideOffset: 0 }] };
    expect(() => TrackSchema.parse(bad)).toThrow();
  });
});
