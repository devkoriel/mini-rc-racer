export interface TickResult {
  steps: number;
  leftover: number;
}

export const tickLoop = (
  deltaSeconds: number,
  accumulator: number,
  fixedStep: number,
  maxSteps: number,
): TickResult => {
  let remaining = accumulator + deltaSeconds;
  let steps = 0;
  while (remaining >= fixedStep && steps < maxSteps) {
    remaining -= fixedStep;
    steps += 1;
  }
  return { steps, leftover: remaining };
};

export interface LoopRunnerOptions {
  fixedStep: number;
  maxStepsPerFrame: number;
  onStep: (stepSeconds: number) => void;
  onRender: (interpolation: number) => void;
}

export interface LoopRunner {
  start: () => void;
  stop: () => void;
}

export const createLoopRunner = (opts: LoopRunnerOptions): LoopRunner => {
  let rafHandle = 0;
  let previousMs = 0;
  let accumulator = 0;
  let running = false;

  const tick = (nowMs: number): void => {
    if (!running) return;
    const deltaSeconds = Math.min((nowMs - previousMs) / 1000, 0.25);
    previousMs = nowMs;
    const { steps, leftover } = tickLoop(
      deltaSeconds,
      accumulator,
      opts.fixedStep,
      opts.maxStepsPerFrame,
    );
    accumulator = leftover;
    for (let i = 0; i < steps; i += 1) {
      opts.onStep(opts.fixedStep);
    }
    const interpolation = opts.fixedStep > 0 ? accumulator / opts.fixedStep : 0;
    opts.onRender(interpolation);
    rafHandle = requestAnimationFrame(tick);
  };

  const start = (): void => {
    if (running) return;
    running = true;
    previousMs = performance.now();
    accumulator = 0;
    rafHandle = requestAnimationFrame(tick);
  };

  const stop = (): void => {
    running = false;
    cancelAnimationFrame(rafHandle);
  };

  return { start, stop };
};
