import type { DialClock } from "./controller";

/** The browser's clock: its time, its frames and its timers. Tests hand a controller one they turn by hand. */
export const clock: DialClock = {
  now: () => performance.now(),
  requestFrame: (tick) => requestAnimationFrame(tick),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
  setTimer: (fire, ms) => window.setTimeout(fire, ms),
  clearTimer: (handle) => window.clearTimeout(handle),
};
