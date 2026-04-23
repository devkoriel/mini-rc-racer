import { z } from "zod";

const SETTINGS_KEY = "mini-rc-racer:settings";
const BEST_LAP_PREFIX = "mini-rc-racer:best:";

const AudioSettingsSchema = z.object({
  master: z.number().min(0).max(1),
  music: z.number().min(0).max(1),
  sfx: z.number().min(0).max(1),
  engine: z.number().min(0).max(1),
  ui: z.number().min(0).max(1),
});

const SettingsSchema = z.object({
  touchSteering: z.enum(["buttons", "tilt"]),
  audio: AudioSettingsSchema,
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  touchSteering: "buttons",
  audio: { master: 0.8, music: 0.7, sfx: 0.9, engine: 0.7, ui: 0.8 },
};

export const loadSettings = (storage: Storage): Settings => {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = SettingsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return DEFAULT_SETTINGS;
    return parsed.data;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (storage: Storage, settings: Settings): void => {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const loadBestLap = (
  storage: Storage,
  trackId: string,
): number | null => {
  const raw = storage.getItem(`${BEST_LAP_PREFIX}${trackId}`);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const saveBestLap = (
  storage: Storage,
  trackId: string,
  seconds: number,
): void => {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  storage.setItem(`${BEST_LAP_PREFIX}${trackId}`, seconds.toString());
};
