import { describe, expect, it } from "vitest";

import { projectGroundPoint, projectRaisedY, toViewSpace } from "../src/game/view";

describe("view helpers", () => {
  it("converts world space into depth and lateral offsets", () => {
    const viewPoint = toViewSpace({ x: 0, y: 0 }, 0, { x: 120, y: 24 });

    expect(viewPoint.depth).toBeCloseTo(120);
    expect(viewPoint.lateral).toBeCloseTo(24);
  });

  it("projects farther ground points closer to the horizon", () => {
    const near = projectGroundPoint(
      { depth: 120, lateral: 30 },
      { cameraHeight: 80, focalLength: 720, horizonY: 200, viewportWidth: 1280 }
    );
    const far = projectGroundPoint(
      { depth: 480, lateral: 30 },
      { cameraHeight: 80, focalLength: 720, horizonY: 200, viewportWidth: 1280 }
    );

    expect(near).not.toBeNull();
    expect(far).not.toBeNull();

    if (!near || !far) {
      return;
    }

    expect(near.groundY).toBeGreaterThan(far.groundY);
    expect(Math.abs(near.screenX - 640)).toBeGreaterThan(Math.abs(far.screenX - 640));
  });

  it("raises objects upward from the projected ground point", () => {
    const ground = projectGroundPoint(
      { depth: 200, lateral: 0 },
      { cameraHeight: 80, focalLength: 720, horizonY: 200, viewportWidth: 1280 }
    );

    expect(ground).not.toBeNull();

    if (!ground) {
      return;
    }

    expect(projectRaisedY(ground, 24)).toBeLessThan(ground.groundY);
  });
});
