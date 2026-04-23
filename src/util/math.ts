export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const vec3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

export const add3 = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});
export const sub3 = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
export const scale3 = (a: Vec3, s: number): Vec3 => ({
  x: a.x * s,
  y: a.y * s,
  z: a.z * s,
});

export const dot3 = (a: Vec3, b: Vec3): number =>
  a.x * b.x + a.y * b.y + a.z * b.z;
export const cross3 = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export const length3 = (a: Vec3): number => Math.sqrt(dot3(a, a));

export const normalize3 = (a: Vec3): Vec3 => {
  const len = length3(a);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return scale3(a, 1 / len);
};

export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

export const wrap01 = (value: number): number => {
  const v = value - Math.floor(value);
  return v < 0 ? v + 1 : v;
};

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

export interface SplineFrame {
  position: Vec3;
  tangent: Vec3;
}

const catmullRom = (
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number => {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
};

const catmullRomDerivative = (
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number => {
  const t2 = t * t;
  return (
    0.5 *
    (-p0 +
      p2 +
      2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t +
      3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t2)
  );
};

const segmentIndices = (
  count: number,
  t: number,
  closed: boolean,
): { i0: number; i1: number; i2: number; i3: number; local: number } => {
  const tWrapped = closed ? wrap01(t) : clamp(t, 0, 1);
  const scaled = tWrapped * (closed ? count : count - 1);
  const segment = closed
    ? Math.floor(scaled) % count
    : clamp(Math.floor(scaled), 0, count - 2);
  const local = scaled - Math.floor(scaled);
  const prev = closed
    ? (segment - 1 + count) % count
    : Math.max(segment - 1, 0);
  const next = closed
    ? (segment + 1) % count
    : Math.min(segment + 1, count - 1);
  const nextNext = closed
    ? (segment + 2) % count
    : Math.min(segment + 2, count - 1);
  return { i0: prev, i1: segment, i2: next, i3: nextNext, local };
};

export const sampleSpline = (
  points: readonly Vec3[],
  t: number,
  closed: boolean,
): Vec3 => {
  const { i0, i1, i2, i3, local } = segmentIndices(points.length, t, closed);
  return {
    x: catmullRom(
      points[i0].x,
      points[i1].x,
      points[i2].x,
      points[i3].x,
      local,
    ),
    y: catmullRom(
      points[i0].y,
      points[i1].y,
      points[i2].y,
      points[i3].y,
      local,
    ),
    z: catmullRom(
      points[i0].z,
      points[i1].z,
      points[i2].z,
      points[i3].z,
      local,
    ),
  };
};

export const sampleSplineTangent = (
  points: readonly Vec3[],
  t: number,
  closed: boolean,
): Vec3 => {
  const { i0, i1, i2, i3, local } = segmentIndices(points.length, t, closed);
  return normalize3({
    x: catmullRomDerivative(
      points[i0].x,
      points[i1].x,
      points[i2].x,
      points[i3].x,
      local,
    ),
    y: catmullRomDerivative(
      points[i0].y,
      points[i1].y,
      points[i2].y,
      points[i3].y,
      local,
    ),
    z: catmullRomDerivative(
      points[i0].z,
      points[i1].z,
      points[i2].z,
      points[i3].z,
      local,
    ),
  });
};

export const sampleSplineFrame = (
  points: readonly Vec3[],
  t: number,
  closed: boolean,
): SplineFrame => ({
  position: sampleSpline(points, t, closed),
  tangent: sampleSplineTangent(points, t, closed),
});

export const splineLength = (
  points: readonly Vec3[],
  samples: number,
  closed: boolean,
): number => {
  let total = 0;
  let previous = sampleSpline(points, 0, closed);
  for (let i = 1; i <= samples; i += 1) {
    const t = i / samples;
    const current = sampleSpline(points, t, closed);
    total += length3(sub3(current, previous));
    previous = current;
  }
  return total;
};

export interface ClosestPointResult {
  t: number;
  position: Vec3;
  distance: number;
}

export const closestPointOnSpline = (
  points: readonly Vec3[],
  query: Vec3,
  samples: number,
  closed: boolean,
): ClosestPointResult => {
  let bestT = 0;
  let bestPos = sampleSpline(points, 0, closed);
  let bestDist = length3(sub3(bestPos, query));
  for (let i = 1; i < samples; i += 1) {
    const t = i / samples;
    const position = sampleSpline(points, t, closed);
    const distance = length3(sub3(position, query));
    if (distance < bestDist) {
      bestDist = distance;
      bestT = t;
      bestPos = position;
    }
  }
  return { t: bestT, position: bestPos, distance: bestDist };
};
