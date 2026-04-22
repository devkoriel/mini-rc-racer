export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const vec3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

export const add3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale3 = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });

export const dot3 = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross3 = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x
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

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
