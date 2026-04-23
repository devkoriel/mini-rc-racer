import type { CarSnapshot, RaceSnapshot } from "../sim/types";

export interface HudRefs {
  readonly lap: HTMLElement;
  readonly place: HTMLElement;
  readonly speed: HTMLElement;
  readonly speedBar: HTMLElement;
  readonly pickup: HTMLElement;
  readonly pickupSlot: HTMLElement;
  readonly timer: HTMLElement;
  readonly best: HTMLElement;
  readonly overlayKicker: HTMLElement;
  readonly overlayTitle: HTMLElement;
  readonly overlayBody: HTMLElement;
  readonly overlayPanel: HTMLElement;
}

const SPEED_MAX_KMH = 94; // Phase-1 Stock class ceiling ≈ 26 m/s → 94 km/h

const formatTime = (seconds: number): string => {
  const clamped = Math.max(0, seconds);
  const minutes = Math.floor(clamped / 60).toString().padStart(2, "0");
  const rest = clamped % 60;
  const whole = Math.floor(rest).toString().padStart(2, "0");
  const hundredths = Math.floor((rest - Math.floor(rest)) * 100)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${whole}.${hundredths}`;
};

const speedKmh = (car: CarSnapshot): number => {
  const magnitude = Math.hypot(car.velocity.x, car.velocity.z);
  return magnitude * 3.6;
};

export const updateSpeedBar = (refs: HudRefs, kmh: number): void => {
  refs.speedBar.style.setProperty(
    "--speed-pct",
    String(Math.min(1, Math.max(0, kmh / SPEED_MAX_KMH))),
  );
};

export const updateHud = (
  refs: HudRefs,
  race: RaceSnapshot,
  playerId: string,
): void => {
  const player = race.cars.find((c) => c.id === playerId);
  if (!player) return;

  refs.lap.textContent = `${player.lap + 1}/${race.lapsToWin}`;

  const placeIndex = race.standings.indexOf(player.id);
  refs.place.textContent = `${placeIndex + 1}/${race.cars.length}`;

  const kmh = speedKmh(player);
  refs.speed.textContent = `${Math.round(kmh)}`;
  updateSpeedBar(refs, kmh);

  if (player.pickupHeld) {
    refs.pickup.textContent = player.pickupHeld;
    refs.pickupSlot.dataset.state = "armed";
  } else if (player.boostRemaining > 0) {
    refs.pickup.textContent = `Boost ${player.boostRemaining.toFixed(1)}s`;
    refs.pickupSlot.dataset.state = "active";
  } else {
    refs.pickup.textContent = "Find a pickup";
    refs.pickupSlot.dataset.state = "empty";
  }

  refs.timer.textContent = formatTime(race.raceTime);
  refs.best.textContent =
    race.bestLap === null ? "—:——.——" : formatTime(race.bestLap);
};

export const setOverlay = (
  refs: HudRefs,
  kicker: string,
  title: string,
  body: string,
): void => {
  refs.overlayKicker.textContent = kicker;
  refs.overlayTitle.textContent = title;
  refs.overlayBody.textContent = body;
  refs.overlayPanel.dataset.state = "visible";
};

export const hideOverlay = (refs: HudRefs): void => {
  refs.overlayPanel.dataset.state = "hidden";
};
