import { describe, expect, it } from "vitest";

import {
  TRACK,
  analyzeTrack,
  getStartTransform,
  normalizeProgress,
  sampleOffsetPoint,
  sampleTrack
} from "../src/game/track";

describe("track helpers", () => {
  it("wraps progress into the valid loop range", () => {
    expect(normalizeProgress(TRACK, -25)).toBeCloseTo(TRACK.totalLength - 25);
    expect(normalizeProgress(TRACK, TRACK.totalLength + 10)).toBeCloseTo(10);
  });

  it("places the start transform on the track", () => {
    const start = getStartTransform(TRACK, 0);
    const analysis = analyzeTrack(TRACK, start.position);

    expect(analysis.distanceToCenter).toBeLessThan(0.001);
  });

  it("samples a usable offset point for pickups", () => {
    const basePoint = sampleTrack(TRACK, 180);
    const offsetPoint = sampleOffsetPoint(TRACK, 180, 24);

    expect(basePoint).not.toEqual(offsetPoint);
    expect(analyzeTrack(TRACK, offsetPoint).distanceToCenter).toBeLessThan(24.001);
  });
});
