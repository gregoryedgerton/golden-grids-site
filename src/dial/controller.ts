/**
 * The dial's depth over time, with no knowledge of the page.
 *
 * Depth is a number from 0 to the last cell. Continuous input (a finger, a
 * wheel) moves it directly; when the input ends the dial settles on a whole
 * cell. Discrete input (a key, a button) names the cell and the dial travels
 * there.
 *
 * Under reduced motion there is no travel at all: continuous input is only
 * counted, and when it ends the dial jumps one whole step in one frame.
 */

/** How far past a cell, in steps, input must carry the dial for it to go on to the next. */
export const COMMIT = 0.15;
/** The time constant of the settle, in milliseconds. */
export const SETTLE_MS = 110;
/** A wheel has ended when it has been quiet this long. */
export const WHEEL_IDLE_MS = 140;
/** Close enough to the target to stop. */
const ARRIVED = 0.001;

export type DialClock = {
  now: () => number;
  requestFrame: (tick: (time: number) => void) => number;
  cancelFrame: (handle: number) => void;
  setTimer: (fire: () => void, ms: number) => number;
  clearTimer: (handle: number) => void;
};

export type DialOptions = {
  /** How many cells. At least one. */
  count: number;
  /** Read on every move, so a change of preference takes effect at once. */
  reduced: () => boolean;
  /** Called with every new depth. */
  onDepth: (depth: number) => void;
  /** Called when the nearest cell changes. */
  onFocus: (index: number) => void;
  clock: DialClock;
};

export type DialController = {
  /** Continuous input: move by a fraction of a step. Positive is deeper. */
  nudge: (steps: number) => void;
  /** Continuous input has ended: settle on a cell. */
  release: () => void;
  /** A wheel event's worth of input. The wheel has no end of its own, so quiet ends it. */
  wheel: (steps: number) => void;
  /** Go a whole number of cells deeper, or back if negative. */
  step: (by: number) => void;
  /** Go to a cell. */
  goTo: (index: number) => void;
  /** Where the dial is. */
  depth: () => number;
  /** Stop everything pending. */
  destroy: () => void;
};

export function createDial({ count, reduced, onDepth, onFocus, clock }: DialOptions): DialController {
  const last = count - 1;
  const clamp = (v: number) => Math.min(Math.max(v, 0), last);

  let depth = 0;
  let target = 0;
  /** The direction of the latest continuous input. */
  let direction = 1;
  /** Continuous input counted but not shown, under reduced motion. */
  let pending = 0;
  let focus = 0;
  let frame = 0;
  let stamp = 0;
  let timer = 0;

  const emit = () => {
    onDepth(depth);
    const nearest = Math.round(depth);
    if (nearest !== focus) {
      focus = nearest;
      onFocus(nearest);
    }
  };

  const stop = () => {
    if (frame) clock.cancelFrame(frame);
    frame = 0;
  };

  const arrive = () => {
    depth = target;
    frame = 0;
    emit();
  };

  const tick = (time: number) => {
    const elapsed = Math.max(0, time - stamp);
    stamp = time;
    depth += (target - depth) * (1 - Math.exp(-elapsed / SETTLE_MS));
    if (reduced() || Math.abs(target - depth) < ARRIVED) {
      arrive();
      return;
    }
    emit();
    frame = clock.requestFrame(tick);
  };

  const travel = (to: number) => {
    target = clamp(to);
    pending = 0;
    if (reduced()) {
      stop();
      arrive();
      return;
    }
    if (frame) return;
    stamp = clock.now();
    frame = clock.requestFrame(tick);
  };

  const nudge = (steps: number) => {
    if (steps === 0) return;
    direction = Math.sign(steps);
    if (reduced()) {
      pending += steps;
      return;
    }
    stop();
    depth = clamp(depth + steps);
    target = depth;
    emit();
  };

  const release = () => {
    if (reduced()) {
      const counted = pending;
      pending = 0;
      // From the nearest cell, in case the preference changed in mid-drag and
      // left the dial between two.
      const to = clamp(Math.round(depth) + (Math.abs(counted) >= COMMIT ? Math.sign(counted) : 0));
      if (to !== depth) travel(to);
      return;
    }
    // The cell the input last passed, and the one it is heading for. A long
    // scroll that stops just past a cell stays on that cell.
    const passed = direction > 0 ? Math.floor(depth) : Math.ceil(depth);
    const ahead = direction > 0 ? Math.ceil(depth) : Math.floor(depth);
    travel(Math.abs(depth - passed) < COMMIT ? passed : ahead);
  };

  const quiet = () => {
    timer = 0;
    release();
  };

  /**
   * A wheel gesture is over the moment anything else moves the dial. Left
   * pending, its quiet timer would settle a journey it knows nothing about.
   */
  const forgetWheel = () => {
    if (timer) clock.clearTimer(timer);
    timer = 0;
  };

  return {
    nudge(steps) {
      forgetWheel();
      nudge(steps);
    },
    release() {
      forgetWheel();
      release();
    },
    wheel(steps) {
      forgetWheel();
      nudge(steps);
      timer = clock.setTimer(quiet, WHEEL_IDLE_MS);
    },
    step(by) {
      forgetWheel();
      travel(Math.round(target) + by);
    },
    goTo(index) {
      forgetWheel();
      travel(index);
    },
    depth: () => depth,
    destroy() {
      stop();
      forgetWheel();
    },
  };
}
