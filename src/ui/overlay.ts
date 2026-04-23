import { hideOverlay, setOverlay, type HudRefs } from "../render/hud";
import type { RaceStatus } from "../sim/types";

const COPY = {
  grid: {
    kicker: "Grid Set",
    title: "Boulevard on pole",
    body: "Three laps around the block. Grab the Spark Burst on the back straight."
  },
  finished: {
    kicker: "Checker",
    title: "Race over",
    body: "Press R to race again, or Esc to return to the menu."
  },
  paused: {
    kicker: "Paused",
    title: "Breath",
    body: "P to resume. R to restart. Esc to quit to menu."
  }
} as const;

export const renderOverlay = (refs: HudRefs, status: RaceStatus, countdownRemaining: number): void => {
  if (status === "grid") {
    setOverlay(refs, COPY.grid.kicker, COPY.grid.title, COPY.grid.body);
    refs.overlayPanel.dataset.variant = "grid";
    return;
  }
  if (status === "countdown") {
    const bigNumber = Math.max(1, Math.ceil(countdownRemaining));
    setOverlay(refs, "", String(bigNumber), "");
    refs.overlayPanel.dataset.variant = "countdown";
    return;
  }
  if (status === "paused") {
    setOverlay(refs, COPY.paused.kicker, COPY.paused.title, COPY.paused.body);
    refs.overlayPanel.dataset.variant = "paused";
    return;
  }
  if (status === "finished") {
    setOverlay(refs, COPY.finished.kicker, COPY.finished.title, COPY.finished.body);
    refs.overlayPanel.dataset.variant = "finished";
    return;
  }
  hideOverlay(refs);
  refs.overlayPanel.dataset.variant = "hidden";
};
