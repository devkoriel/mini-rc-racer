import "./style.css";
import { RacerGame, type HudRefs, type InputState } from "./game/game3d";
import {
  clearInputState,
  copyInputState,
  createEmptyInputState,
  hasActiveInput,
  mapGamepadsToInput,
  mapMotionToInput,
  mergeInputStates
} from "./game/controls";
import {
  loadTouchSteeringMode,
  saveTouchSteeringMode,
  type TouchSteeringMode
} from "./game/persistence";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");

if (!canvas) {
  throw new Error("Expected #game-canvas to exist.");
}

const hud: HudRefs = {
  bestValue: requireElement("best-value"),
  boostValue: requireElement("boost-value"),
  lapValue: requireElement("lap-value"),
  overlayBody: requireElement("overlay-body"),
  overlayKicker: requireElement("overlay-kicker"),
  overlayPanel: requireElement("overlay-panel"),
  overlayTitle: requireElement("overlay-title"),
  placeValue: requireElement("place-value"),
  speedValue: requireElement("speed-value"),
  timerValue: requireElement("timer-value")
};

const controlStatus = requireElement("control-status");
const motionStatus = requireElement("motion-status");
const keyboardChip = requireElement("mode-keyboard");
const touchChip = requireElement("mode-touch");
const gamepadChip = requireElement("mode-gamepad");
const motionChip = requireElement("mode-motion");
const touchModeButtons = requireElement("touch-mode-buttons") as HTMLButtonElement;
const touchModeTilt = requireElement("touch-mode-tilt") as HTMLButtonElement;
const motionAccessButton = requireElement("motion-access-btn") as HTMLButtonElement;
const overlayPanel = requireElement("overlay-panel");
const touchControlsElement = document.querySelector<HTMLElement>(".touch-controls");

if (!touchControlsElement) {
  throw new Error("Expected .touch-controls to exist.");
}

const touchControls: HTMLElement = touchControlsElement;

const input: InputState = createEmptyInputState();
const keyboardState = createEmptyInputState();
const touchState = createEmptyInputState();
let gamepadState = createEmptyInputState();
let motionState = createEmptyInputState();
let gamepadConnected = false;
let touchSteeringMode: TouchSteeringMode = loadTouchSteeringMode(globalThis.localStorage);
let motionGamma: number | null = null;
let motionListenerRegistered = false;

const isTouchCapable =
  navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
const supportsDeviceOrientation = typeof DeviceOrientationEvent !== "undefined";
type MotionPermissionState = "denied" | "granted" | "prompt" | "unsupported";
let motionPermissionState: MotionPermissionState = supportsDeviceOrientation ? "prompt" : "unsupported";

const keyMap: Record<string, keyof InputState> = {
  ArrowDown: "brake",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "accelerate",
  KeyA: "left",
  KeyD: "right",
  KeyR: "restart",
  KeyS: "brake",
  KeyW: "accelerate",
  Space: "start"
};

window.addEventListener("keydown", (event) => {
  const control = keyMap[event.code];

  if (!control) {
    return;
  }

  keyboardState[control] = true;
  syncInputState();
  event.preventDefault();
});

window.addEventListener("keyup", (event) => {
  const control = keyMap[event.code];

  if (!control) {
    return;
  }

  keyboardState[control] = false;
  syncInputState();
  event.preventDefault();
});

window.addEventListener("blur", () => {
  clearInputState(keyboardState);
  clearInputState(touchState);
  gamepadState = createEmptyInputState();
  motionState = createEmptyInputState();
  syncInputState();
});

document.querySelectorAll<HTMLButtonElement>("[data-control]").forEach((button) => {
  const control = button.dataset.control as keyof InputState | undefined;

  if (!control) {
    return;
  }

  const press = (event: Event) => {
    touchState[control] = true;
    syncInputState();
    event.preventDefault();
  };

  const release = (event: Event) => {
    touchState[control] = false;
    syncInputState();
    event.preventDefault();
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("pointercancel", release);
});

overlayPanel.addEventListener("pointerdown", (event) => {
  touchState.start = true;
  syncInputState();
  event.preventDefault();
});

overlayPanel.addEventListener("pointerup", (event) => {
  touchState.start = false;
  syncInputState();
  event.preventDefault();
});

overlayPanel.addEventListener("pointerleave", (event) => {
  touchState.start = false;
  syncInputState();
  event.preventDefault();
});

window.addEventListener("gamepadconnected", () => {
  gamepadConnected = true;
  updateControlUi();
});

window.addEventListener("gamepaddisconnected", () => {
  gamepadConnected = false;
  gamepadState = createEmptyInputState();
  syncInputState();
});

touchModeButtons.addEventListener("click", () => {
  touchSteeringMode = "buttons";
  saveTouchSteeringMode(globalThis.localStorage, touchSteeringMode);
  updateMotionState();
  updateControlUi();
});

touchModeTilt.addEventListener("click", async () => {
  if (!supportsDeviceOrientation) {
    updateControlUi();
    return;
  }

  touchSteeringMode = "tilt";
  saveTouchSteeringMode(globalThis.localStorage, touchSteeringMode);
  await ensureMotionAccess(false);
  updateMotionState();
  updateControlUi();
});

motionAccessButton.addEventListener("click", async () => {
  await ensureMotionAccess(true);
  updateMotionState();
  updateControlUi();
});

if (touchSteeringMode === "tilt" && !supportsDeviceOrientation) {
  touchSteeringMode = "buttons";
}

if (touchSteeringMode === "tilt") {
  void ensureMotionAccess(false).then(() => {
    updateMotionState();
    syncInputState();
  });
}

pollGamepads();
syncInputState();
new RacerGame(canvas, hud, input);

function pollGamepads(): void {
  const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];

  gamepadConnected = pads.some((pad) => pad?.connected);
  gamepadState = mapGamepadsToInput(pads);
  syncInputState();
  requestAnimationFrame(pollGamepads);
}

function syncInputState(): void {
  copyInputState(input, mergeInputStates(keyboardState, touchState, gamepadState, motionState));
  updateControlUi();
}

function updateControlUi(): void {
  touchControls.dataset.steeringMode =
    touchSteeringMode === "tilt" && motionPermissionState === "granted" ? "tilt" : "buttons";
  touchModeButtons.dataset.state = touchSteeringMode === "buttons" ? "active" : "idle";
  touchModeTilt.dataset.state = touchSteeringMode === "tilt" ? "active" : "idle";
  touchModeTilt.disabled = !supportsDeviceOrientation;
  motionAccessButton.disabled = !supportsDeviceOrientation || motionPermissionState === "granted";
  motionAccessButton.textContent =
    motionPermissionState === "granted" ? "Sensor Ready" : "Enable Sensor";

  setChipState(keyboardChip, hasActiveInput(keyboardState) ? "active" : "ready");
  setChipState(touchChip, hasActiveInput(touchState) ? "active" : isTouchCapable ? "ready" : "idle");
  setChipState(gamepadChip, hasActiveInput(gamepadState) ? "active" : gamepadConnected ? "ready" : "idle");
  setChipState(
    motionChip,
    hasActiveInput(motionState)
      ? "active"
      : motionPermissionState === "granted"
        ? "ready"
        : "idle"
  );

  if (hasActiveInput(keyboardState)) {
    controlStatus.textContent = "Keyboard active. WASD or arrows steer, Space launches, R resets.";
  } else if (hasActiveInput(motionState)) {
    controlStatus.textContent =
      "Tilt active. Rotate the device to steer while touch buttons or triggers handle speed.";
  } else if (hasActiveInput(touchState)) {
    controlStatus.textContent = "Touch active. Dual-thumb drive cluster is live, with start and reset on-screen.";
  } else if (hasActiveInput(gamepadState)) {
    controlStatus.textContent = "Gamepad active. Left stick or D-pad steer, triggers drive, Start launches, Y resets.";
  } else if (gamepadConnected) {
    controlStatus.textContent = "Gamepad connected. Keyboard and touch remain available too.";
  } else {
    controlStatus.textContent = isTouchCapable
      ? "Ready for keyboard, touch, gamepad, or tilt where supported."
      : "Ready for keyboard or gamepad. Touch controls appear on mobile devices.";
  }

  if (!supportsDeviceOrientation) {
    motionStatus.textContent = "Tilt steering is unavailable on this browser or device. Button steering stays active.";
  } else if (touchSteeringMode === "buttons") {
    motionStatus.textContent = "Touch buttons are active. Switch to tilt if you want motion steering on supported mobile browsers.";
  } else if (motionPermissionState === "granted") {
    motionStatus.textContent = "Tilt steering is live. Hold the device flatter for neutral steering.";
  } else if (motionPermissionState === "denied") {
    motionStatus.textContent = "Tilt access was denied. You can keep using touch buttons, keyboard, or gamepad.";
  } else {
    motionStatus.textContent = "Tilt mode selected. Tap Enable Sensor to allow device motion steering.";
  }
}

function setChipState(element: HTMLElement, state: "active" | "idle" | "ready"): void {
  element.dataset.state = state;
}

async function ensureMotionAccess(fromButton: boolean): Promise<void> {
  if (!supportsDeviceOrientation) {
    motionPermissionState = "unsupported";
    return;
  }

  const motionEventType = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<"denied" | "granted">;
  };

  if (typeof motionEventType.requestPermission === "function") {
    if (!fromButton && motionPermissionState !== "granted") {
      motionPermissionState = "prompt";
      return;
    }

    try {
      const permission = await motionEventType.requestPermission();
      motionPermissionState = permission === "granted" ? "granted" : "denied";
    } catch {
      motionPermissionState = "denied";
    }
  } else {
    motionPermissionState = "granted";
  }

  if (motionPermissionState === "granted" && !motionListenerRegistered) {
    window.addEventListener("deviceorientation", handleDeviceOrientation);
    motionListenerRegistered = true;
  }
}

function handleDeviceOrientation(event: DeviceOrientationEvent): void {
  motionGamma = event.gamma ?? null;
  updateMotionState();
  syncInputState();
}

function updateMotionState(): void {
  motionState = mapMotionToInput(
    motionGamma,
    touchSteeringMode === "tilt" && motionPermissionState === "granted"
  );
}

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Expected element #${id} to exist.`);
  }

  return element;
}
