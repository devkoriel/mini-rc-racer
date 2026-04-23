import { describe, expect, it } from "vitest";
import {
  vec3,
  add3,
  sub3,
  scale3,
  length3,
  normalize3,
  dot3,
  cross3,
} from "../../src/util/math";

const approxEqual = (a: number, b: number, eps = 1e-9): boolean =>
  Math.abs(a - b) < eps;

describe("vec3 basics", () => {
  it("constructs a Vec3 literal", () => {
    expect(vec3(1, 2, 3)).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("adds two Vec3s", () => {
    expect(add3(vec3(1, 2, 3), vec3(10, 20, 30))).toEqual({
      x: 11,
      y: 22,
      z: 33,
    });
  });

  it("subtracts two Vec3s", () => {
    expect(sub3(vec3(5, 6, 7), vec3(1, 2, 3))).toEqual({ x: 4, y: 4, z: 4 });
  });

  it("scales a Vec3 by a scalar", () => {
    expect(scale3(vec3(1, 2, 3), 2)).toEqual({ x: 2, y: 4, z: 6 });
  });

  it("computes length", () => {
    expect(length3(vec3(3, 0, 4))).toBe(5);
  });

  it("normalizes to unit length (except zero vector)", () => {
    const n = normalize3(vec3(3, 0, 4));
    expect(approxEqual(length3(n), 1)).toBe(true);
    expect(normalize3(vec3(0, 0, 0))).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("computes dot product", () => {
    expect(dot3(vec3(1, 2, 3), vec3(4, 5, 6))).toBe(32);
  });

  it("computes cross product", () => {
    expect(cross3(vec3(1, 0, 0), vec3(0, 1, 0))).toEqual({ x: 0, y: 0, z: 1 });
  });
});

import {
  sampleSpline,
  splineLength,
  sampleSplineFrame,
  closestPointOnSpline,
  type Vec3 as Vec3T,
} from "../../src/util/math";

const STRAIGHT_SQUARE: Vec3T[] = [
  { x: 0, y: 0, z: 0 },
  { x: 10, y: 0, z: 0 },
  { x: 10, y: 0, z: 10 },
  { x: 0, y: 0, z: 10 },
];

describe("spline sampling", () => {
  it("samples the first control point at t=0 (closed loop)", () => {
    const p = sampleSpline(STRAIGHT_SQUARE, 0, true);
    expect(p.x).toBeCloseTo(0, 4);
    expect(p.z).toBeCloseTo(0, 4);
  });

  it("samples a non-zero point somewhere between control points", () => {
    const p = sampleSpline(STRAIGHT_SQUARE, 0.25, true);
    expect(p.x).toBeGreaterThan(5);
  });

  it("computes a positive total length for a closed square loop", () => {
    const len = splineLength(STRAIGHT_SQUARE, 64, true);
    expect(len).toBeGreaterThan(35);
    expect(len).toBeLessThan(45);
  });

  it("sampleSplineFrame returns a tangent of unit length", () => {
    const frame = sampleSplineFrame(STRAIGHT_SQUARE, 0.1, true);
    const mag = Math.hypot(frame.tangent.x, frame.tangent.y, frame.tangent.z);
    expect(mag).toBeCloseTo(1, 4);
  });

  it("closestPointOnSpline finds a query point near a control", () => {
    const query = { x: 0, y: 0, z: 0 };
    const result = closestPointOnSpline(STRAIGHT_SQUARE, query, 128, true);
    expect(result.distance).toBeLessThan(1);
    expect(result.t).toBeLessThan(0.05);
  });
});
