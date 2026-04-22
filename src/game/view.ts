import { dot, subtract, type Vec2 } from "./math";

export interface ViewPoint {
  depth: number;
  lateral: number;
}

export interface ProjectionOptions {
  cameraHeight: number;
  focalLength: number;
  horizonY: number;
  viewportWidth: number;
}

export interface GroundProjection {
  depth: number;
  groundY: number;
  scale: number;
  screenX: number;
}

export function toViewSpace(origin: Vec2, angle: number, point: Vec2): ViewPoint {
  const forward = { x: Math.cos(angle), y: Math.sin(angle) };
  const right = { x: -forward.y, y: forward.x };
  const delta = subtract(point, origin);

  return {
    depth: dot(delta, forward),
    lateral: dot(delta, right)
  };
}

export function projectGroundPoint(
  viewPoint: ViewPoint,
  options: ProjectionOptions
): GroundProjection | null {
  if (viewPoint.depth <= 1) {
    return null;
  }

  const scale = options.focalLength / viewPoint.depth;

  return {
    depth: viewPoint.depth,
    groundY: options.horizonY + options.cameraHeight * scale,
    scale,
    screenX: options.viewportWidth * 0.5 + viewPoint.lateral * scale
  };
}

export function projectRaisedY(projection: GroundProjection, height: number): number {
  return projection.groundY - height * projection.scale;
}
