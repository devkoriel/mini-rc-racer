import { describe, expect, it } from "vitest";

import {
  clearInputState,
  createEmptyInputState,
  hasActiveInput,
  mapGamepadsToInput,
  mapMotionToInput,
  mergeInputStates
} from "../src/game/controls";

describe("control helpers", () => {
  it("merges multiple control sources without losing pressed buttons", () => {
    const keyboard = createEmptyInputState();
    const touch = createEmptyInputState();

    keyboard.left = true;
    touch.accelerate = true;

    expect(mergeInputStates(keyboard, touch)).toMatchObject({
      accelerate: true,
      left: true,
      brake: false,
      restart: false,
      right: false,
      start: false
    });
  });

  it("maps a connected gamepad to racer controls", () => {
    const state = mapGamepadsToInput([
      {
        axes: [-0.8, 0],
        buttons: Array.from({ length: 16 }, (_, index) => ({
          pressed: index === 7 || index === 9,
          value: index === 7 ? 1 : 0
        })),
        connected: true
      }
    ]);

    expect(state.left).toBe(true);
    expect(state.accelerate).toBe(true);
    expect(state.start).toBe(true);
  });

  it("clears and detects activity on an input state", () => {
    const state = createEmptyInputState();

    state.restart = true;
    expect(hasActiveInput(state)).toBe(true);

    clearInputState(state);
    expect(hasActiveInput(state)).toBe(false);
  });

  it("maps motion gamma into steering booleans", () => {
    expect(mapMotionToInput(-14, true)).toMatchObject({ left: true, right: false });
    expect(mapMotionToInput(14, true)).toMatchObject({ left: false, right: true });
    expect(mapMotionToInput(2, true)).toMatchObject({ left: false, right: false });
  });
});
