export interface Vec2 {
  x: number;
  y: number;
}

export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

export function add(left: Vec2, right: Vec2): Vec2 {
  return { x: left.x + right.x, y: left.y + right.y };
}

export function subtract(left: Vec2, right: Vec2): Vec2 {
  return { x: left.x - right.x, y: left.y - right.y };
}

export function scale(vector: Vec2, amount: number): Vec2 {
  return { x: vector.x * amount, y: vector.y * amount };
}

export function dot(left: Vec2, right: Vec2): number {
  return left.x * right.x + left.y * right.y;
}

export function length(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}

export function normalize(vector: Vec2): Vec2 {
  const size = length(vector);

  if (size === 0) {
    return { x: 0, y: 0 };
  }

  return { x: vector.x / size, y: vector.y / size };
}

export function perpendicular(vector: Vec2): Vec2 {
  return { x: -vector.y, y: vector.x };
}

export function distance(left: Vec2, right: Vec2): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

export function distanceSquared(left: Vec2, right: Vec2): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;

  return dx * dx + dy * dy;
}

export function wrapAngle(angle: number): number {
  let nextAngle = angle;

  while (nextAngle > Math.PI) {
    nextAngle -= TAU;
  }

  while (nextAngle < -Math.PI) {
    nextAngle += TAU;
  }

  return nextAngle;
}

export function projectPointOnSegment(point: Vec2, start: Vec2, end: Vec2): {
  closestPoint: Vec2;
  distanceSquared: number;
  t: number;
} {
  const span = subtract(end, start);
  const spanLengthSquared = dot(span, span);

  if (spanLengthSquared === 0) {
    return {
      closestPoint: start,
      distanceSquared: distanceSquared(point, start),
      t: 0
    };
  }

  const t = clamp(dot(subtract(point, start), span) / spanLengthSquared, 0, 1);
  const closestPoint = add(start, scale(span, t));

  return {
    closestPoint,
    distanceSquared: distanceSquared(point, closestPoint),
    t
  };
}
