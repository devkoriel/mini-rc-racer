export type Listener<Payload> = (payload: Payload) => void;

export interface EventBus<Events extends Record<string, unknown>> {
  on<K extends keyof Events>(
    event: K,
    listener: Listener<Events[K]>,
  ): () => void;
  emit<K extends keyof Events>(event: K, payload: Events[K]): void;
}

export const createEventBus = <
  Events extends Record<string, unknown>,
>(): EventBus<Events> => {
  const listeners = new Map<keyof Events, Set<Listener<never>>>();

  const on = <K extends keyof Events>(
    event: K,
    listener: Listener<Events[K]>,
  ): (() => void) => {
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    set.add(listener as Listener<never>);
    return () => {
      set!.delete(listener as Listener<never>);
    };
  };

  const emit = <K extends keyof Events>(event: K, payload: Events[K]): void => {
    const set = listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      (listener as Listener<Events[K]>)(payload);
    }
  };

  return { on, emit };
};

export type GameEvents = {
  "race:grid": { trackId: string };
  "race:countdown": { remaining: number };
  "race:start": { at: number };
  "race:finish": { placings: string[]; totalTime: number };
  "race:pause": Record<string, never>;
  "race:resume": Record<string, never>;
  "lap:complete": { carId: string; lapIndex: number; lapTime: number };
  "pickup:armed": { carId: string; pickupId: string };
  "pickup:fired": { carId: string; pickupId: string };
  "car:collided": {
    carId: string;
    otherId: string | null;
    impactSpeed: number;
  };
  "car:flipped": { carId: string };
  "ui:intent:start": Record<string, never>;
  "ui:intent:pause": Record<string, never>;
  "ui:intent:restart": Record<string, never>;
  "ui:intent:quit": Record<string, never>;
};
