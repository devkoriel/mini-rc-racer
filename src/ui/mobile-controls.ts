import type { TouchState } from "../engine/input";

export interface MobileControlBindings {
  state: TouchState;
  dispose: () => void;
}

export const bindMobileControls = (root: HTMLElement): MobileControlBindings => {
  const state: TouchState = {
    left: false, right: false, accelerate: false, brake: false, start: false, restart: false
  };
  type Control = keyof TouchState;
  const handlers: Array<() => void> = [];

  const bind = (selector: string, key: Control) => {
    const el = root.querySelector<HTMLElement>(selector);
    if (!el) return;
    const down = (e: Event) => { state[key] = true; e.preventDefault(); };
    const up = (e: Event) => { state[key] = false; e.preventDefault(); };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("pointercancel", up);
    handlers.push(() => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointerleave", up);
      el.removeEventListener("pointercancel", up);
    });
  };

  bind('[data-control="left"]', "left");
  bind('[data-control="right"]', "right");
  bind('[data-control="accelerate"]', "accelerate");
  bind('[data-control="brake"]', "brake");
  bind('[data-control="start"]', "start");
  bind('[data-control="restart"]', "restart");

  return { state, dispose: () => handlers.forEach((h) => h()) };
};
