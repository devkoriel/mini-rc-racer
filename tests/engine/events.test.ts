import { describe, expect, it, vi } from "vitest";
import { createEventBus } from "../../src/engine/events";

type Events = {
  "race:start": { at: number };
  "pickup:collected": { pickupId: string };
};

describe("event bus", () => {
  it("calls listeners registered for an event", () => {
    const bus = createEventBus<Events>();
    const spy = vi.fn();
    bus.on("race:start", spy);
    bus.emit("race:start", { at: 1000 });
    expect(spy).toHaveBeenCalledWith({ at: 1000 });
  });

  it("does not call listeners for other events", () => {
    const bus = createEventBus<Events>();
    const spy = vi.fn();
    bus.on("pickup:collected", spy);
    bus.emit("race:start", { at: 1 });
    expect(spy).not.toHaveBeenCalled();
  });

  it("off() unsubscribes a listener", () => {
    const bus = createEventBus<Events>();
    const spy = vi.fn();
    const off = bus.on("race:start", spy);
    off();
    bus.emit("race:start", { at: 1 });
    expect(spy).not.toHaveBeenCalled();
  });

  it("supports multiple listeners on the same event", () => {
    const bus = createEventBus<Events>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on("race:start", a);
    bus.on("race:start", b);
    bus.emit("race:start", { at: 42 });
    expect(a).toHaveBeenCalledWith({ at: 42 });
    expect(b).toHaveBeenCalledWith({ at: 42 });
  });
});
