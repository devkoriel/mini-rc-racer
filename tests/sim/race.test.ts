import { describe, expect, it } from "vitest";
import { createRace, stepRace, onStartPressed, onPausePressed } from "../../src/sim/race";
import { emptyInputFrame } from "../../src/engine/input";

describe("race FSM", () => {
  it("starts in grid state", () => {
    const race = createRace({ lapsToWin: 3, countdownSeconds: 3 });
    expect(race.status).toBe("grid");
  });

  it("onStartPressed from grid moves to countdown", () => {
    let race = createRace({ lapsToWin: 3, countdownSeconds: 3 });
    race = onStartPressed(race);
    expect(race.status).toBe("countdown");
    expect(race.countdownRemaining).toBeCloseTo(3, 6);
  });

  it("countdown ticks down and transitions to running", () => {
    let race = createRace({ lapsToWin: 3, countdownSeconds: 1 });
    race = onStartPressed(race);
    const step = 1 / 120;
    for (let i = 0; i < 121; i += 1) {
      race = stepRace(race, emptyInputFrame(), step);
    }
    expect(race.status).toBe("running");
  });

  it("onPausePressed from running toggles to paused", () => {
    let race = createRace({ lapsToWin: 3, countdownSeconds: 0 });
    race = onStartPressed(race);
    race = stepRace(race, emptyInputFrame(), 1 / 60);
    race = onPausePressed(race);
    expect(race.status).toBe("paused");
    race = onPausePressed(race);
    expect(race.status).toBe("running");
  });
});
