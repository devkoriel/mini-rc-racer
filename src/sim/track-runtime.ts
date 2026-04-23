import {
  closestPointOnSpline,
  length3,
  sampleSplineFrame,
  splineLength,
  sub3,
  type Vec3,
} from "../util/math";

export interface SplineControl extends Vec3 {
  halfWidth: number;
}

export interface ProgressSample {
  readonly t: number;
  readonly totalDistance: number;
  readonly centerline: Vec3;
  readonly tangent: Vec3;
  readonly halfWidth: number;
  readonly offTrack: boolean;
  readonly distanceToCenter: number;
}

export interface TrackRuntime {
  readonly totalLength: number;
  sampleProgress: (worldPosition: Vec3, previousT: number) => ProgressSample;
  sampleFrame: (t: number) => {
    position: Vec3;
    tangent: Vec3;
    halfWidth: number;
  };
}

const interpolateHalfWidth = (
  controls: readonly SplineControl[],
  t: number,
): number => {
  const n = controls.length;
  const scaled = (((t % 1) + 1) % 1) * n;
  const i0 = Math.floor(scaled) % n;
  const i1 = (i0 + 1) % n;
  const local = scaled - Math.floor(scaled);
  return controls[i0].halfWidth * (1 - local) + controls[i1].halfWidth * local;
};

const WINDOW_RADIUS = 0.08;

export const createTrackRuntime = (
  controls: readonly SplineControl[],
  sampleCount: number,
): TrackRuntime => {
  const totalLength = splineLength(
    controls as unknown as Vec3[],
    sampleCount,
    true,
  );

  const sampleProgress = (
    position: Vec3,
    previousT: number,
  ): ProgressSample => {
    const windowSamples = Math.max(
      16,
      Math.floor(sampleCount * WINDOW_RADIUS * 2),
    );
    let bestT = 0;
    let bestPos = sampleSplineFrame(
      controls as unknown as Vec3[],
      previousT,
      true,
    ).position;
    let bestDist = length3(sub3(bestPos, position));
    for (let i = 0; i < windowSamples; i += 1) {
      const offset = (i / (windowSamples - 1) - 0.5) * WINDOW_RADIUS * 2;
      const t = (((previousT + offset) % 1) + 1) % 1;
      const frame = sampleSplineFrame(controls as unknown as Vec3[], t, true);
      const d = length3(sub3(frame.position, position));
      if (d < bestDist) {
        bestDist = d;
        bestT = t;
        bestPos = frame.position;
      }
    }
    if (bestDist > 20) {
      const global = closestPointOnSpline(
        controls as unknown as Vec3[],
        position,
        sampleCount,
        true,
      );
      if (global.distance < bestDist) {
        bestDist = global.distance;
        bestT = global.t;
        bestPos = global.position;
      }
    }
    const halfWidth = interpolateHalfWidth(controls, bestT);
    const frame = sampleSplineFrame(controls as unknown as Vec3[], bestT, true);
    return {
      t: bestT,
      totalDistance: bestT * totalLength,
      centerline: frame.position,
      tangent: frame.tangent,
      halfWidth,
      offTrack: bestDist > halfWidth,
      distanceToCenter: bestDist,
    };
  };

  const sampleFrame = (t: number) => {
    const frame = sampleSplineFrame(controls as unknown as Vec3[], t, true);
    return {
      position: frame.position,
      tangent: frame.tangent,
      halfWidth: interpolateHalfWidth(controls, t),
    };
  };

  return { totalLength, sampleProgress, sampleFrame };
};
