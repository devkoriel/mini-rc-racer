export const BEST_LAP_STORAGE_KEY = "mini-rc-racer.best-lap";
export const TOUCH_STEERING_MODE_STORAGE_KEY = "mini-rc-racer.touch-steering-mode";

export type TouchSteeringMode = "buttons" | "tilt";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function normalizeStoredBestLap(value: string | null): number {
  if (value === null) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return parsed;
}

export function loadBestLap(storage: StorageLike | null | undefined): number {
  if (!storage) {
    return Number.POSITIVE_INFINITY;
  }

  try {
    return normalizeStoredBestLap(storage.getItem(BEST_LAP_STORAGE_KEY));
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function normalizeTouchSteeringMode(value: string | null): TouchSteeringMode {
  return value === "tilt" ? "tilt" : "buttons";
}

export function loadTouchSteeringMode(storage: StorageLike | null | undefined): TouchSteeringMode {
  if (!storage) {
    return "buttons";
  }

  try {
    return normalizeTouchSteeringMode(storage.getItem(TOUCH_STEERING_MODE_STORAGE_KEY));
  } catch {
    return "buttons";
  }
}

export function saveBestLap(
  storage: StorageLike | null | undefined,
  bestLapTime: number
): void {
  if (!storage || !Number.isFinite(bestLapTime) || bestLapTime <= 0) {
    return;
  }

  try {
    storage.setItem(BEST_LAP_STORAGE_KEY, bestLapTime.toFixed(4));
  } catch {
    // Browser privacy settings can block storage writes. Ignore and continue.
  }
}

export function saveTouchSteeringMode(
  storage: StorageLike | null | undefined,
  mode: TouchSteeringMode
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(TOUCH_STEERING_MODE_STORAGE_KEY, mode);
  } catch {
    // Browser privacy settings can block storage writes. Ignore and continue.
  }
}
