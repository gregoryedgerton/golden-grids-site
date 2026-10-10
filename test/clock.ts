import type { DialClock } from "../src/dial/controller";

/**
 * A clock the test turns by hand. `advance` moves it on, running the timers
 * that fall due and then one frame, every `step` milliseconds: sixteen unless
 * a test wants to land on an exact moment.
 */
export function fakeClock() {
  let time = 0;
  let handle = 0;
  const frames = new Map<number, (time: number) => void>();
  const timers = new Map<number, { fire: () => void; at: number }>();
  const clock: DialClock = {
    now: () => time,
    requestFrame: (tick) => {
      frames.set(++handle, tick);
      return handle;
    },
    cancelFrame: (h) => void frames.delete(h),
    setTimer: (fire, ms) => {
      timers.set(++handle, { fire, at: time + ms });
      return handle;
    },
    clearTimer: (h) => void timers.delete(h),
  };
  const advance = (ms: number, step = 16) => {
    const end = time + ms;
    while (time < end) {
      time = Math.min(end, time + step);
      for (const [h, timer] of [...timers]) {
        if (timer.at <= time) {
          timers.delete(h);
          timer.fire();
        }
      }
      for (const [h, tick] of [...frames]) {
        frames.delete(h);
        tick(time);
      }
    }
  };
  return { clock, advance, frames, timers };
}
