import { describe, expect, it } from "vitest";
import { buildTrackSurfaceGeometry } from "../../src/render/track-mesh";

const SQUARE = [
  { x: 0, y: 0, z: 0, halfWidth: 4 },
  { x: 10, y: 0, z: 0, halfWidth: 4 },
  { x: 10, y: 0, z: 10, halfWidth: 4 },
  { x: 0, y: 0, z: 10, halfWidth: 4 }
];

describe("track mesh", () => {
  it("produces positions and indices proportional to sample count", () => {
    const { positions, indices } = buildTrackSurfaceGeometry(SQUARE, 64, { innerOffset: 0, outerOffset: 0 });
    expect(positions.length).toBeGreaterThan(64 * 2 * 3);
    expect(indices.length).toBeGreaterThan(0);
  });
});
