import {
  add,
  mod,
  normalize,
  perpendicular,
  projectPointOnSegment,
  scale,
  type Vec2
} from "./math";

export interface TrackSegment {
  start: Vec2;
  end: Vec2;
  direction: Vec2;
  normal: Vec2;
  length: number;
  distanceFromStart: number;
}

export interface TrackDefinition {
  centerline: Vec2[];
  halfWidth: number;
  segments: TrackSegment[];
  totalLength: number;
}

export interface TrackAnalysis {
  distanceToCenter: number;
  progress: number;
  normal: Vec2;
}

export interface TrackFrame {
  center: Vec2;
  direction: Vec2;
  normal: Vec2;
  progress: number;
}

export interface DecorItem {
  kind: "barn" | "haybale" | "house" | "parked-car" | "silo" | "tree";
  position: Vec2;
  size: number;
  tint: number;
  rotation: number;
}

const CENTERLINE: Vec2[] = [
  { x: -330, y: -250 },
  { x: -20, y: -250 },
  { x: 230, y: -180 },
  { x: 340, y: -10 },
  { x: 300, y: 220 },
  { x: 110, y: 340 },
  { x: -150, y: 320 },
  { x: -330, y: 160 },
  { x: -360, y: -70 }
];

function createTrack(centerline: Vec2[], halfWidth: number): TrackDefinition {
  const segments: TrackSegment[] = [];
  let distanceFromStart = 0;

  for (let index = 0; index < centerline.length; index += 1) {
    const start = centerline[index];
    const end = centerline[(index + 1) % centerline.length];
    const rawDirection = { x: end.x - start.x, y: end.y - start.y };
    const direction = normalize(rawDirection);
    const length = Math.hypot(rawDirection.x, rawDirection.y);

    segments.push({
      start,
      end,
      direction,
      normal: perpendicular(direction),
      length,
      distanceFromStart
    });

    distanceFromStart += length;
  }

  return {
    centerline,
    halfWidth,
    segments,
    totalLength: distanceFromStart
  };
}

export const TRACK = createTrack(CENTERLINE, 68);

export const DECOR: DecorItem[] = [
  { kind: "house", position: { x: -560, y: -290 }, size: 138, tint: 24, rotation: 0.06 },
  { kind: "parked-car", position: { x: -510, y: -178 }, size: 84, tint: 212, rotation: 0.08 },
  { kind: "tree", position: { x: -520, y: -68 }, size: 40, tint: 112, rotation: 0 },
  { kind: "house", position: { x: -520, y: 104 }, size: 144, tint: 38, rotation: -0.04 },
  { kind: "tree", position: { x: -520, y: 264 }, size: 42, tint: 126, rotation: 0 },
  { kind: "house", position: { x: -160, y: -430 }, size: 150, tint: 52, rotation: 0.02 },
  { kind: "parked-car", position: { x: 38, y: -418 }, size: 92, tint: 6, rotation: -0.12 },
  { kind: "tree", position: { x: 188, y: -430 }, size: 40, tint: 108, rotation: 0 },
  { kind: "house", position: { x: 440, y: -318 }, size: 146, tint: 18, rotation: 0.1 },
  { kind: "parked-car", position: { x: 560, y: -182 }, size: 88, tint: 210, rotation: -0.2 },
  { kind: "tree", position: { x: 560, y: -18 }, size: 44, tint: 132, rotation: 0 },
  { kind: "house", position: { x: 520, y: 156 }, size: 140, tint: 14, rotation: -0.08 },
  { kind: "tree", position: { x: 560, y: 318 }, size: 42, tint: 118, rotation: 0 },
  { kind: "house", position: { x: 178, y: 500 }, size: 152, tint: 48, rotation: -0.08 },
  { kind: "parked-car", position: { x: -26, y: 510 }, size: 90, tint: 10, rotation: 0.16 },
  { kind: "tree", position: { x: -224, y: 494 }, size: 42, tint: 124, rotation: 0 },
  { kind: "house", position: { x: -520, y: 412 }, size: 144, tint: 34, rotation: 0.1 },
  { kind: "parked-car", position: { x: -596, y: 198 }, size: 86, tint: 220, rotation: 1.08 },
  { kind: "tree", position: { x: -640, y: 24 }, size: 46, tint: 116, rotation: 0 },
  { kind: "tree", position: { x: -650, y: -200 }, size: 48, tint: 108, rotation: 0 }
];

export const PICKUP_PROGRESS = [140, 530, 930, 1290];

function findSegmentForProgress(track: TrackDefinition, progress: number): TrackSegment {
  const normalizedProgress = normalizeProgress(track, progress);

  for (const segment of track.segments) {
    if (normalizedProgress <= segment.distanceFromStart + segment.length) {
      return segment;
    }
  }

  return track.segments[track.segments.length - 1];
}

export function normalizeProgress(track: TrackDefinition, progress: number): number {
  return mod(progress, track.totalLength);
}

export function sampleTrack(track: TrackDefinition, progress: number): Vec2 {
  const normalizedProgress = normalizeProgress(track, progress);
  const segment = findSegmentForProgress(track, normalizedProgress);
  const localDistance = normalizedProgress - segment.distanceFromStart;

  return add(segment.start, scale(segment.direction, localDistance));
}

export function sampleTrackFrame(track: TrackDefinition, progress: number): TrackFrame {
  const normalizedProgress = normalizeProgress(track, progress);
  const segment = findSegmentForProgress(track, normalizedProgress);

  return {
    center: sampleTrack(track, normalizedProgress),
    direction: segment.direction,
    normal: segment.normal,
    progress: normalizedProgress
  };
}

export function sampleOffsetPoint(
  track: TrackDefinition,
  progress: number,
  offset: number
): Vec2 {
  const segment = findSegmentForProgress(track, progress);

  return add(sampleTrack(track, progress), scale(segment.normal, offset));
}

export function analyzeTrack(track: TrackDefinition, position: Vec2): TrackAnalysis {
  let bestDistanceSquared = Number.POSITIVE_INFINITY;
  let bestProgress = 0;
  let bestNormal = track.segments[0].normal;

  for (const segment of track.segments) {
    const projection = projectPointOnSegment(position, segment.start, segment.end);

    if (projection.distanceSquared < bestDistanceSquared) {
      bestDistanceSquared = projection.distanceSquared;
      bestProgress = segment.distanceFromStart + projection.t * segment.length;
      bestNormal = segment.normal;
    }
  }

  return {
    distanceToCenter: Math.sqrt(bestDistanceSquared),
    progress: bestProgress,
    normal: bestNormal
  };
}

export function getStartTransform(
  track: TrackDefinition,
  laneOffset: number
): { angle: number; position: Vec2 } {
  const segment = track.segments[0];
  const angle = Math.atan2(segment.direction.y, segment.direction.x);

  return {
    angle,
    position: add(
      add(segment.start, scale(segment.direction, 30)),
      scale(segment.normal, laneOffset)
    )
  };
}
