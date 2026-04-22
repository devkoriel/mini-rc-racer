import { describe, expect, it, vi } from "vitest";

import {
  BEST_LAP_STORAGE_KEY,
  loadBestLap,
  loadTouchSteeringMode,
  normalizeStoredBestLap,
  normalizeTouchSteeringMode,
  saveBestLap,
  saveTouchSteeringMode,
  TOUCH_STEERING_MODE_STORAGE_KEY
} from "../src/game/persistence";

describe("persistence helpers", () => {
  it("normalizes invalid stored values to infinity", () => {
    expect(normalizeStoredBestLap(null)).toBe(Number.POSITIVE_INFINITY);
    expect(normalizeStoredBestLap("banana")).toBe(Number.POSITIVE_INFINITY);
    expect(normalizeStoredBestLap("-2")).toBe(Number.POSITIVE_INFINITY);
  });

  it("loads the stored best lap when available", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue("65.4321"),
      setItem: vi.fn()
    };

    expect(loadBestLap(storage)).toBeCloseTo(65.4321);
    expect(storage.getItem).toHaveBeenCalledWith(BEST_LAP_STORAGE_KEY);
  });

  it("persists a finite best lap", () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn()
    };

    saveBestLap(storage, 54.3219);

    expect(storage.setItem).toHaveBeenCalledWith(BEST_LAP_STORAGE_KEY, "54.3219");
  });

  it("loads and saves the touch steering mode", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue("tilt"),
      setItem: vi.fn()
    };

    expect(normalizeTouchSteeringMode("unknown")).toBe("buttons");
    expect(loadTouchSteeringMode(storage)).toBe("tilt");

    saveTouchSteeringMode(storage, "buttons");

    expect(storage.setItem).toHaveBeenCalledWith(TOUCH_STEERING_MODE_STORAGE_KEY, "buttons");
  });
});
