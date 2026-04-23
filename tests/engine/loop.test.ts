import { describe, expect, it } from "vitest";
import { tickLoop } from "../../src/engine/loop";

describe("tickLoop", () => {
  it("runs zero sim steps when delta is below step", () => {
    const fixed = 1 / 120;
    const { steps, leftover } = tickLoop(fixed * 0.5, 0, fixed, 10);
    expect(steps).toBe(0);
    expect(leftover).toBeCloseTo(fixed * 0.5, 6);
  });

  it("runs exactly one step when delta equals step", () => {
    const fixed = 1 / 120;
    const { steps, leftover } = tickLoop(fixed, 0, fixed, 10);
    expect(steps).toBe(1);
    expect(leftover).toBeCloseTo(0, 6);
  });

  it("accumulates leftover across calls", () => {
    const fixed = 1 / 120;
    const first = tickLoop(fixed * 1.3, 0, fixed, 10);
    expect(first.steps).toBe(1);
    const second = tickLoop(fixed * 1.0, first.leftover, fixed, 10);
    expect(second.steps).toBe(1);
    expect(second.leftover).toBeCloseTo(fixed * 0.3, 6);
  });

  it("caps steps at maxSteps to avoid spiral of death", () => {
    const fixed = 1 / 120;
    const { steps } = tickLoop(fixed * 50, 0, fixed, 5);
    expect(steps).toBe(5);
  });
});
