import type { InputState } from "./game";

export const CONTROL_KEYS: Array<keyof InputState> = [
  "accelerate",
  "brake",
  "left",
  "restart",
  "right",
  "start"
];

export type TouchSteeringMode = "buttons" | "tilt";

export interface VirtualGamepadButton {
  pressed: boolean;
  value: number;
}

export interface VirtualGamepad {
  axes: readonly number[];
  buttons: readonly VirtualGamepadButton[];
  connected: boolean;
  id?: string;
}

export function createEmptyInputState(): InputState {
  return {
    accelerate: false,
    brake: false,
    left: false,
    restart: false,
    right: false,
    start: false
  };
}

export function clearInputState(target: InputState): void {
  for (const key of CONTROL_KEYS) {
    target[key] = false;
  }
}

export function copyInputState(target: InputState, source: InputState): void {
  for (const key of CONTROL_KEYS) {
    target[key] = source[key];
  }
}

export function mergeInputStates(...states: InputState[]): InputState {
  const nextState = createEmptyInputState();

  for (const key of CONTROL_KEYS) {
    nextState[key] = states.some((state) => state[key]);
  }

  return nextState;
}

export function hasActiveInput(state: InputState): boolean {
  return CONTROL_KEYS.some((key) => state[key]);
}

function isPressed(
  buttons: readonly VirtualGamepadButton[],
  index: number,
  threshold = 0.5
): boolean {
  const button = buttons[index];

  if (!button) {
    return false;
  }

  return button.pressed || button.value >= threshold;
}

export function mapGamepadsToInput(gamepads: readonly (VirtualGamepad | null | undefined)[]): InputState {
  const state = createEmptyInputState();
  const gamepad = gamepads.find((candidate) => candidate?.connected);

  if (!gamepad) {
    return state;
  }

  const horizontalAxis = gamepad.axes[0] ?? 0;
  const leftStickLeft = horizontalAxis <= -0.35;
  const leftStickRight = horizontalAxis >= 0.35;
  const left = leftStickLeft || isPressed(gamepad.buttons, 14);
  const right = leftStickRight || isPressed(gamepad.buttons, 15);
  const accelerate =
    isPressed(gamepad.buttons, 7, 0.18) ||
    isPressed(gamepad.buttons, 0) ||
    isPressed(gamepad.buttons, 12);
  const brake = isPressed(gamepad.buttons, 6, 0.18) || isPressed(gamepad.buttons, 1);

  state.left = left;
  state.right = right;
  state.accelerate = accelerate;
  state.brake = brake || isPressed(gamepad.buttons, 13);
  state.start = isPressed(gamepad.buttons, 9);
  state.restart = isPressed(gamepad.buttons, 3) || isPressed(gamepad.buttons, 8);

  return state;
}

export function mapMotionToInput(
  gamma: number | null,
  isEnabled: boolean,
  threshold = 9
): InputState {
  const state = createEmptyInputState();

  if (!isEnabled || gamma === null || !Number.isFinite(gamma)) {
    return state;
  }

  state.left = gamma <= -threshold;
  state.right = gamma >= threshold;

  return state;
}
