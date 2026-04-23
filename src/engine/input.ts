export interface InputButtons {
  start: boolean;
  pickup: boolean;
  restart: boolean;
  pause: boolean;
  look: boolean;
}

export interface InputFrame {
  steer: number;
  throttle: number;
  brake: number;
  buttons: InputButtons;
}

export const emptyInputFrame = (): InputFrame => ({
  steer: 0,
  throttle: 0,
  brake: 0,
  buttons: { start: false, pickup: false, restart: false, pause: false, look: false }
});

const pickMax = (a: number, b: number): number => (Math.abs(b) > Math.abs(a) ? b : a);

export const mergeInputFrames = (...frames: readonly InputFrame[]): InputFrame => {
  const out = emptyInputFrame();
  for (const frame of frames) {
    out.steer = pickMax(out.steer, frame.steer);
    out.throttle = Math.max(out.throttle, frame.throttle);
    out.brake = Math.max(out.brake, frame.brake);
    out.buttons = {
      start: out.buttons.start || frame.buttons.start,
      pickup: out.buttons.pickup || frame.buttons.pickup,
      restart: out.buttons.restart || frame.buttons.restart,
      pause: out.buttons.pause || frame.buttons.pause,
      look: out.buttons.look || frame.buttons.look
    };
  }
  return out;
};

const DEADZONE = 0.12;
const applyDeadzone = (v: number): number => (Math.abs(v) < DEADZONE ? 0 : v);

export const gamepadToInputFrame = (pad: Gamepad | null | undefined): InputFrame => {
  const out = emptyInputFrame();
  if (!pad || !pad.connected) return out;
  out.steer = applyDeadzone(pad.axes[0] ?? 0);
  out.throttle = pad.buttons[7]?.value ?? 0;
  out.brake = pad.buttons[6]?.value ?? 0;
  if ((pad.buttons[12]?.pressed) && !out.throttle) out.throttle = 1;
  if ((pad.buttons[13]?.pressed) && !out.brake) out.brake = 1;
  const padLeft  = pad.buttons[14]?.pressed ?? false;
  const padRight = pad.buttons[15]?.pressed ?? false;
  if (out.steer === 0) {
    if (padLeft) out.steer = -1;
    else if (padRight) out.steer = 1;
  }
  out.buttons.start = pad.buttons[9]?.pressed ?? false;
  out.buttons.pickup = pad.buttons[0]?.pressed ?? false;
  out.buttons.restart = pad.buttons[3]?.pressed ?? false;
  out.buttons.pause = pad.buttons[8]?.pressed ?? false;
  out.buttons.look = pad.buttons[1]?.pressed ?? false;
  return out;
};

export const motionGammaToInputFrame = (gammaDeg: number | null, enabled: boolean): InputFrame => {
  const out = emptyInputFrame();
  if (!enabled || gammaDeg === null || !Number.isFinite(gammaDeg)) return out;
  const clamped = Math.max(-30, Math.min(30, gammaDeg));
  out.steer = clamped / 30;
  return out;
};

export interface KeyboardState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  space: boolean;
  r: boolean;
  p: boolean;
  c: boolean;
}

export const emptyKeyboardState = (): KeyboardState => ({
  up: false, down: false, left: false, right: false, space: false, r: false, p: false, c: false
});

export const keyboardToInputFrame = (keys: KeyboardState): InputFrame => {
  const out = emptyInputFrame();
  const left = keys.left ? 1 : 0;
  const right = keys.right ? 1 : 0;
  out.steer = right - left;
  out.throttle = keys.up ? 1 : 0;
  out.brake = keys.down ? 1 : 0;
  out.buttons.start = keys.space;
  out.buttons.pickup = keys.space;
  out.buttons.restart = keys.r;
  out.buttons.pause = keys.p;
  out.buttons.look = keys.c;
  return out;
};

export interface TouchState {
  left: boolean;
  right: boolean;
  accelerate: boolean;
  brake: boolean;
  start: boolean;
  restart: boolean;
}

export const emptyTouchState = (): TouchState => ({
  left: false, right: false, accelerate: false, brake: false, start: false, restart: false
});

export const touchToInputFrame = (touch: TouchState): InputFrame => {
  const out = emptyInputFrame();
  const left = touch.left ? 1 : 0;
  const right = touch.right ? 1 : 0;
  out.steer = right - left;
  out.throttle = touch.accelerate ? 1 : 0;
  out.brake = touch.brake ? 1 : 0;
  out.buttons.start = touch.start;
  out.buttons.restart = touch.restart;
  return out;
};
