import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadSettings, saveSettings } from "../../src/data/storage";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  length = 0;
  clear(): void { this.store.clear(); this.length = 0; }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); this.length = this.store.size; }
  setItem(key: string, value: string): void { this.store.set(key, value); this.length = this.store.size; }
}

describe("settings storage", () => {
  let storage: MemoryStorage;
  beforeEach(() => { storage = new MemoryStorage(); });
  afterEach(() => { storage.clear(); });

  it("returns defaults when storage is empty", () => {
    const settings = loadSettings(storage);
    expect(settings.touchSteering).toBe("buttons");
    expect(settings.audio.master).toBeCloseTo(0.8, 2);
  });

  it("round-trips saved settings", () => {
    saveSettings(storage, { touchSteering: "tilt", audio: { master: 0.3, music: 0.5, sfx: 0.9, engine: 0.7, ui: 0.6 } });
    const loaded = loadSettings(storage);
    expect(loaded.touchSteering).toBe("tilt");
    expect(loaded.audio.master).toBeCloseTo(0.3, 2);
  });

  it("falls back to defaults when stored JSON is malformed", () => {
    storage.setItem("mini-rc-racer:settings", "{not json");
    const loaded = loadSettings(storage);
    expect(loaded.touchSteering).toBe("buttons");
  });
});
