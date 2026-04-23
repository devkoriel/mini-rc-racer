import { clamp, sub3, type Vec3 } from "../util/math";
import type { TrackRuntime } from "./track-runtime";
import { emptyInputFrame, type InputFrame } from "../engine/input";

export interface AiDriver {
  readonly carId: string;
  readonly difficulty: number;
}

export interface AiDriverInit {
  readonly carId: string;
  readonly difficulty: number;
}

export const createAiDriver = (init: AiDriverInit): AiDriver => ({
  carId: init.carId,
  difficulty: clamp(init.difficulty, 0, 1)
});

const LOOKAHEAD_T = 0.035;

export const aiInput = (
  ai: AiDriver,
  track: TrackRuntime,
  position: Vec3,
  forward: Vec3,
  previousT: number
): InputFrame => {
  const current = track.sampleProgress(position, previousT);
  const ahead = track.sampleFrame((current.t + LOOKAHEAD_T) % 1);
  const toAhead = sub3(ahead.position, position);
  const forwardDot = forward.x * toAhead.x + forward.z * toAhead.z;
  const rightDot = forward.z * toAhead.x - forward.x * toAhead.z;
  const mag = Math.hypot(toAhead.x, toAhead.z);
  const normalizedLateral = mag === 0 ? 0 : rightDot / mag;
  const steerCommand = clamp(-normalizedLateral * 2.2, -1, 1);
  const throttle = forwardDot > 0 ? 0.6 + 0.4 * ai.difficulty : 0.2;
  const frame = emptyInputFrame();
  return {
    ...frame,
    steer: steerCommand,
    throttle,
    brake: 0
  };
};
