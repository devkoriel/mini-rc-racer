import { describe, expect, it } from "vitest";
import { createAiDriver, aiInput } from "../../src/sim/ai";
import { createTrackRuntime } from "../../src/sim/track-runtime";

const SQUARE = [
  { x: 0, y: 0, z: 0, halfWidth: 4 },
  { x: 10, y: 0, z: 0, halfWidth: 4 },
  { x: 10, y: 0, z: 10, halfWidth: 4 },
  { x: 0, y: 0, z: 10, halfWidth: 4 }
];

describe("ai driver", () => {
  it("steers toward the next centerline point", () => {
    const rt = createTrackRuntime(SQUARE, 256);
    const ai = createAiDriver({ carId: "ai-1", difficulty: 0.5 });
    const frame = aiInput(ai, rt, { x: 2, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 0);
    expect(frame.throttle).toBeGreaterThan(0);
    expect(frame.steer).not.toBe(0);
  });
});
