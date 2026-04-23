import type { InputFrame } from "../engine/input";
import type { RaceStatus } from "./types";

export interface RaceConfig {
  readonly lapsToWin: number;
  readonly countdownSeconds: number;
}

export interface RaceState {
  readonly status: RaceStatus;
  readonly raceTime: number;
  readonly countdownRemaining: number;
  readonly lapsToWin: number;
  readonly startInitialCountdown: number;
}

export const createRace = (config: RaceConfig): RaceState => ({
  status: "grid",
  raceTime: 0,
  countdownRemaining: 0,
  lapsToWin: config.lapsToWin,
  startInitialCountdown: config.countdownSeconds,
});

export const onStartPressed = (race: RaceState): RaceState => {
  if (race.status !== "grid") return race;
  return {
    ...race,
    status: "countdown",
    countdownRemaining: race.startInitialCountdown,
  };
};

export const onPausePressed = (race: RaceState): RaceState => {
  if (race.status === "running") return { ...race, status: "paused" };
  if (race.status === "paused") return { ...race, status: "running" };
  return race;
};

export const onFinishReached = (race: RaceState): RaceState => {
  if (race.status !== "running") return race;
  return { ...race, status: "finished" };
};

export const stepRace = (
  race: RaceState,
  _input: InputFrame,
  stepSeconds: number,
): RaceState => {
  if (race.status === "countdown") {
    const remaining = race.countdownRemaining - stepSeconds;
    if (remaining <= 0) {
      return { ...race, status: "running", countdownRemaining: 0 };
    }
    return { ...race, countdownRemaining: remaining };
  }
  if (race.status === "running") {
    return { ...race, raceTime: race.raceTime + stepSeconds };
  }
  return race;
};
