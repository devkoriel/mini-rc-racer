import type { Vec3 } from "../util/math";

export type CarClass = "rookie" | "stock" | "muscle" | "pro";
export type PickupId = "spark-burst" | "pulse-wave" | "slick" | "skip-rocket" | "decoy-cube" | "guard";

export interface CarTuning {
  readonly mass: number;
  readonly wheelbase: number;
  readonly trackWidth: number;
  readonly cgHeight: number;
  readonly gripCeiling: number;
  readonly torqueCurve: ReadonlyArray<readonly [number, number]>;
  readonly downforce: number;
  readonly brakeStrength: number;
  readonly steerAssist: number;
}

export interface CarSnapshot {
  readonly id: string;
  readonly position: Vec3;
  readonly forward: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
  readonly velocity: Vec3;
  readonly angularVelocity: number;
  readonly rpm: number;
  readonly slip: number;
  readonly wheelSpin: number;
  readonly lap: number;
  readonly progress: number;
  readonly totalDistance: number;
  readonly offRoad: boolean;
  readonly flipped: boolean;
  readonly boostRemaining: number;
  readonly pickupHeld: PickupId | null;
  readonly shieldRemaining: number;
}

export type RaceStatus =
  | "grid"
  | "countdown"
  | "running"
  | "paused"
  | "finished";

export interface RaceSnapshot {
  readonly status: RaceStatus;
  readonly raceTime: number;
  readonly countdownRemaining: number;
  readonly cars: ReadonlyArray<CarSnapshot>;
  readonly standings: ReadonlyArray<string>;
  readonly lapsToWin: number;
  readonly bestLap: number | null;
  readonly lastLap: number | null;
}

export interface WorldSnapshot {
  readonly race: RaceSnapshot;
  readonly pickups: ReadonlyArray<{
    readonly id: string;
    readonly pickupId: PickupId;
    readonly position: Vec3;
    readonly active: boolean;
  }>;
  readonly projectiles: ReadonlyArray<{
    readonly id: string;
    readonly position: Vec3;
    readonly velocity: Vec3;
    readonly ownerId: string;
  }>;
}
