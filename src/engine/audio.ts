export interface AudioBuses {
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  engine: GainNode;
  ui: GainNode;
}

export interface AudioSystem {
  context: AudioContext;
  buses: AudioBuses;
  setMasterVolume: (value: number) => void;
  setBusVolume: (bus: keyof Omit<AudioBuses, "master">, value: number) => void;
  resume: () => Promise<void>;
}

export const createAudioSystem = (): AudioSystem => {
  const context = new AudioContext();
  const master = context.createGain();
  const music = context.createGain();
  const sfx = context.createGain();
  const engine = context.createGain();
  const ui = context.createGain();
  master.gain.value = 0.9;
  music.gain.value = 0.8;
  sfx.gain.value = 1.0;
  engine.gain.value = 0.7;
  ui.gain.value = 0.8;
  master.connect(context.destination);
  music.connect(master);
  sfx.connect(master);
  engine.connect(master);
  ui.connect(master);

  const buses: AudioBuses = { master, music, sfx, engine, ui };

  return {
    context,
    buses,
    setMasterVolume: (value: number) => {
      master.gain.value = Math.max(0, Math.min(1, value));
    },
    setBusVolume: (bus, value) => {
      const clamped = Math.max(0, Math.min(1, value));
      (buses[bus] as GainNode).gain.value = clamped;
    },
    resume: async () => {
      if (context.state === "suspended") {
        await context.resume();
      }
    },
  };
};
