import { describe, expect, it } from "vitest";
import {
  emptyInputFrame,
  mergeInputFrames,
  gamepadToInputFrame,
  motionGammaToInputFrame
} from "../../src/engine/input";

describe("input frame", () => {
  it("emptyInputFrame has all-zero axes and no buttons held", () => {
    const frame = emptyInputFrame();
    expect(frame.steer).toBe(0);
    expect(frame.throttle).toBe(0);
    expect(frame.brake).toBe(0);
    expect(frame.buttons.start).toBe(false);
    expect(frame.buttons.pickup).toBe(false);
    expect(frame.buttons.restart).toBe(false);
    expect(frame.buttons.pause).toBe(false);
    expect(frame.buttons.look).toBe(false);
  });

  it("mergeInputFrames takes the max magnitude for axes and OR for buttons", () => {
    const a = { ...emptyInputFrame(), steer: -0.3, throttle: 0.5, buttons: { ...emptyInputFrame().buttons, start: true } };
    const b = { ...emptyInputFrame(), steer: 0.7, brake: 1.0, buttons: { ...emptyInputFrame().buttons, pickup: true } };
    const merged = mergeInputFrames(a, b);
    expect(merged.steer).toBe(0.7);
    expect(merged.throttle).toBe(0.5);
    expect(merged.brake).toBe(1.0);
    expect(merged.buttons.start).toBe(true);
    expect(merged.buttons.pickup).toBe(true);
  });

  it("gamepadToInputFrame reads left-stick and triggers", () => {
    const pad = {
      connected: true,
      axes: [-0.8, 0, 0, 0],
      buttons: [
        { pressed: false }, { pressed: false }, { pressed: false }, { pressed: false },
        { pressed: false }, { pressed: false }, { pressed: false, value: 0.0 },
        { pressed: true,  value: 0.9 }, { pressed: false },
        { pressed: true }
      ]
    } as unknown as Gamepad;
    const frame = gamepadToInputFrame(pad);
    expect(frame.steer).toBeCloseTo(-0.8, 2);
    expect(frame.throttle).toBeCloseTo(0.9, 2);
    expect(frame.buttons.start).toBe(true);
  });

  it("motionGammaToInputFrame maps -30..30 deg tilt to -1..1 steer", () => {
    expect(motionGammaToInputFrame(0, true).steer).toBe(0);
    expect(motionGammaToInputFrame(30, true).steer).toBeCloseTo(1, 2);
    expect(motionGammaToInputFrame(-30, true).steer).toBeCloseTo(-1, 2);
    expect(motionGammaToInputFrame(30, false).steer).toBe(0);
  });
});
