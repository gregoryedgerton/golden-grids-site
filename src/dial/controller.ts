/**
 * The dial's depth over time, with no knowledge of the page.
 *
 * Depth is a number from 0 to the last cell. A finger moves it directly, and
 * when it lifts the dial settles on a whole cell. A key or a button names the
 * cell and the dial travels there. A wheel turns it one cell at a time: a
 * scroll is a tick, as a swipe is, and never carries the dial across several
 * cells or leaves it between two.
 *
 * Under reduced motion there is no travel at all: a drag is only counted,
 * and when it ends the dial jumps one whole step in one frame.
 */

/** How far past a cell, in steps, input must carry the dial for it to go on to the next. */
export const COMMIT = 0.15;
/** The time constant of the settle, in milliseconds. */
export const SETTLE_MS = 110;
/** A wheel has ended when it has been quiet this long. */
export const WHEEL_IDLE_MS = 140;
/**
 * Wheel travel, in steps, that turns the dial one tick: 24 pixels. Small
 * enough that one notch of any wheel is a tick, a notch reported as three
 * lines of 16 pixels included.
 */
export const WHEEL_TICK = 0.03;
/** After a tick the wheel turns nothing for this long, while the dial travels. */
export const WHEEL_HOLD_MS = 400;
/** A wheel event smaller than this, in steps, is the tail of a flick and never a new push. */
export const WHEEL_PUSH = 0.01;
/** How much larger than the event before it a wheel event must be to be a new push. */
export const WHEEL_RISE = 1.5;
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
  /** A wheel event's worth of travel. Enough of it turns the dial one tick. */
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
  /** Wheel travel gathered toward the next tick. */
  let gathered = 0;
  /** Whether the wheel has just ticked and is being ignored. */
  let held = false;
  let heldAt = 0;
  /** The size of the wheel event before this one. */
  let lastSize = 0;

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

  /** The wheel has gone quiet: the gesture is over and the next one starts clean. */
  const quiet = () => {
    timer = 0;
    gathered = 0;
    held = false;
    lastSize = 0;
  };

  /**
   * One tick per scroll. Travel is gathered until there is a tick's worth,
   * the dial turns one cell, and then the wheel is latched: nothing more
   * turns until it has gone quiet. A stream of events that never pauses is
   * one scroll, however long it runs, so a wheel held spinning and the tail
   * of a trackpad's flick both turn one cell and stop.
   *
   * The one thing that ends a scroll without a pause is a second push: once
   * the hold is over, an event clearly larger than the one before it. A
   * flick's tail only ever shrinks, and a mouse's notches are all one size,
   * so neither is taken for it; a reader who flicks again before the first
   * flick has died away is.
   */
  const wheel = (steps: number) => {
    if (steps === 0) return;
    if (timer) clock.clearTimer(timer);
    timer = clock.setTimer(quiet, WHEEL_IDLE_MS);
    const size = Math.abs(steps);
    const push = size >= WHEEL_PUSH && size > lastSize * WHEEL_RISE;
    lastSize = size;
    if (held) {
      if (clock.now() - heldAt < WHEEL_HOLD_MS || !push) return;
      held = false;
    }
    // Travel the other way starts again from nothing.
    if (Math.sign(steps) !== Math.sign(gathered)) gathered = 0;
    gathered += steps;
    if (Math.abs(gathered) < WHEEL_TICK) return;
    gathered = 0;
    held = true;
    heldAt = clock.now();
    travel(Math.round(target) + Math.sign(steps));
  };

  return {
    nudge,
    release,
    wheel,
    step(by) {
      travel(Math.round(target) + by);
    },
    goTo: travel,
    depth: () => depth,
    destroy() {
      stop();
      if (timer) clock.clearTimer(timer);
      timer = 0;
    },
  };
}
