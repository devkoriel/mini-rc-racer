import {
  emptyInputFrame,
  emptyKeyboardState,
  emptyTouchState,
  gamepadToInputFrame,
  keyboardToInputFrame,
  mergeInputFrames,
  motionGammaToInputFrame,
  touchToInputFrame,
  type InputFrame,
  type KeyboardState,
  type TouchState
} from "../engine/input";

export interface ShellInputs {
  readonly getInput: () => InputFrame;
  readonly keyboard: KeyboardState;
  readonly touch: TouchState;
  setTouchSteeringEnabled: (enabled: boolean) => void;
  setMotionGamma: (gamma: number | null) => void;
  dispose: () => void;
}

const KEY_MAP: Record<string, keyof KeyboardState> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
  Space: "space",
  KeyR: "r",
  KeyP: "p",
  KeyC: "c"
};

export const bootShellInputs = (touch: TouchState): ShellInputs => {
  const keyboard = emptyKeyboardState();
  let motionGamma: number | null = null;
  let tiltEnabled = false;

  const onKeyDown = (event: KeyboardEvent): void => {
    const key = KEY_MAP[event.code];
    if (!key) return;
    keyboard[key] = true;
    event.preventDefault();
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    const key = KEY_MAP[event.code];
    if (!key) return;
    keyboard[key] = false;
    event.preventDefault();
  };
  const onBlur = (): void => {
    for (const key of Object.keys(keyboard) as Array<keyof KeyboardState>) {
      keyboard[key] = false;
    }
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  const getInput = (): InputFrame => {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    const pad = pads.find((p) => p && p.connected) ?? null;
    return mergeInputFrames(
      keyboardToInputFrame(keyboard),
      touchToInputFrame(touch),
      gamepadToInputFrame(pad),
      motionGammaToInputFrame(motionGamma, tiltEnabled),
      emptyInputFrame()
    );
  };

  return {
    getInput,
    keyboard,
    touch,
    setTouchSteeringEnabled: (enabled: boolean) => {
      tiltEnabled = enabled;
    },
    setMotionGamma: (gamma: number | null) => {
      motionGamma = gamma;
    },
    dispose: () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    }
  };
};

export const createEmptyTouch = (): TouchState => emptyTouchState();
