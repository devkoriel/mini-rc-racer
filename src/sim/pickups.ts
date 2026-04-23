import type { Vec3 } from "../util/math";
import type { PickupId } from "./types";

export interface PickupRuntime {
  readonly id: string;
  readonly pickupId: PickupId;
  readonly position: Vec3;
  readonly active: boolean;
  readonly respawnRemaining: number;
}

const DEFAULT_RESPAWN_SECONDS = 4;

export const createPickup = (id: string, pickupId: PickupId, position: Vec3): PickupRuntime => ({
  id,
  pickupId,
  position,
  active: true,
  respawnRemaining: 0
});

export const stepPickup = (pickup: PickupRuntime, stepSeconds: number): PickupRuntime => {
  if (pickup.active) return pickup;
  const remaining = pickup.respawnRemaining - stepSeconds;
  if (remaining <= 0) {
    return { ...pickup, active: true, respawnRemaining: 0 };
  }
  return { ...pickup, respawnRemaining: remaining };
};

export const collectPickup = (pickup: PickupRuntime): PickupRuntime => {
  if (!pickup.active) return pickup;
  return { ...pickup, active: false, respawnRemaining: DEFAULT_RESPAWN_SECONDS };
};
