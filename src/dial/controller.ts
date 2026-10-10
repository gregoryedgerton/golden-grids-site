import type { Axis } from "./input";

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
 * Wheel travel, in CSS pixels, that makes a scroll. Small, so that the least
 * notch of any wheel turns the dial: one line is sixteen pixels, and the
 * slowest notch of a mouse on a Mac is about four. Less than this is a hand
 * resting on a trackpad.
 */
export const WHEEL_TICK_PX = 3;
/**
 * The size, in CSS pixels, of a push: what an event of a scroll has to reach
 * before the scroll can be said to fall away, and what a second push has to
 * reach to be one. Below this a stream of wheel events wobbles by a factor of
 * three on its own: as a flick starts, in the faint end of its tail, and all
 * through a slow drag. So gentle travel is one scroll until the wheel goes
 * quiet, and a second push is looked for only after a hard one.
 */
export const WHEEL_PUSH_PX = 8;
/**
 * How far a scroll falls and climbs for the climb to be a second push: down
 * to a third of its peak, then up to more than three times its lowest ebb. A
 * tail does not triple, and neither does a browser handing over two or three
 * events as one.
 */
export const WHEEL_RISE = 3;
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
  /**
   * Called with the cell the dial is heading for: the one it is at rest on or
   * travelling to. Called with null while a finger holds the dial, which may
   * yet let it go to either side, and with a cell again when the finger
   * lifts. A dial starts headed for its first cell, at rest on it.
   */
  onHeading: (index: number | null) => void;
  clock: DialClock;
};

export type DialController = {
  /** A finger's travel: move by a fraction of a step. Positive is deeper. */
  nudge: (steps: number) => void;
  /** The finger has lifted: settle on a cell. */
  release: () => void;
  /** A wheel event's travel on each axis, in CSS pixels. Right and down are deeper. A scroll turns one cell. */
  wheel: (x: number, y: number) => void;
  /** Go a whole number of cells deeper, or back if negative. */
  step: (by: number) => void;
  /** Go to a cell. */
  goTo: (index: number) => void;
  /** Where the dial is. */
  depth: () => number;
  /** Stop everything pending. */
  destroy: () => void;
};

export function createDial({ count, reduced, onDepth, onFocus, onHeading, clock }: DialOptions): DialController {
  const last = count - 1;
  const clamp = (v: number) => Math.min(Math.max(v, 0), last);

  let depth = 0;
  let target = 0;
  /** The direction of the latest continuous input. */
  let direction = 1;
  /** Continuous input counted but not shown, under reduced motion. */
  let pending = 0;
  let focus = 0;
  /** The cell the dial is at rest on or travelling to, or null while a finger holds it. */
  let heading: number | null = 0;
  let frame = 0;
  let stamp = 0;
  let timer = 0;
  /** Wheel travel gathered toward a scroll on each axis: before one has turned the dial, or against the way it turned. */
  const gathered = { x: 0, y: 0 };
  /** The way the scroll in progress turned the dial, 1 or -1, or 0 when there is none. */
  let latched = 0;
  /** The axis that scroll is on. */
  let axis: Axis = "y";
  /** The largest event of the push that last turned the dial. */
  let peak = 0;
  /** The smallest event since that push fell away, or 0 while it has not. */
  let ebb = 0;

  const emit = () => {
    onDepth(depth);
    const nearest = Math.round(depth);
    if (nearest !== focus) {
      focus = nearest;
      onFocus(nearest);
    }
  };

  const head = (to: number | null) => {
    if (to === heading) return;
    heading = to;
    onHeading(to);
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
    head(target);
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
    // A finger has the dial, and where it will let go is not known. That is
    // so under reduced motion too, where the finger moves nothing until it
    // lifts: travel already under way may still arrive beneath it, and the
    // cell it arrives on is not yet where the dial is staying.
    head(null);
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
      // Already on the cell, with nowhere to go. The finger has lifted, and
      // this cell is where the dial is headed again.
      else head(to);
      return;
    }
    // The cell the input last passed, and the one it is heading for. A long
    // scroll that stops just past a cell stays on that cell.
    const passed = direction > 0 ? Math.floor(depth) : Math.ceil(depth);
    const ahead = direction > 0 ? Math.ceil(depth) : Math.floor(depth);
    travel(Math.abs(depth - passed) < COMMIT ? passed : ahead);
  };

  /** The wheel has gone quiet: the scroll is over and the next one starts clean. */
  const quiet = () => {
    timer = 0;
    gathered.x = 0;
    gathered.y = 0;
    latched = 0;
  };

  /** Adds travel on one axis to what is gathered there, starting again from nothing if it has turned round. */
  const gather = (along: Axis, pixels: number) => {
    if (pixels * gathered[along] < 0) gathered[along] = 0;
    gathered[along] += pixels;
    return Math.abs(gathered[along]);
  };

  /** A scroll, or a new push of one, turns the dial one cell and latches the wheel to it. */
  const turn = (way: number, size: number, along: Axis) => {
    gathered.x = 0;
    gathered.y = 0;
    latched = way;
    axis = along;
    peak = size;
    ebb = 0;
    travel(Math.round(target) + way);
  };

  /**
   * One cell per scroll. Travel is gathered until there is a scroll's worth,
   * the dial turns one cell, and the wheel is latched to that scroll: more of
   * it turns nothing. A stream of events that never pauses is one scroll
   * however long it runs, so a wheel held spinning and the tail of a
   * trackpad's flick each turn one cell and stop. The latch lifts when the
   * wheel has gone quiet.
   *
   * Two things in an unbroken stream are the reader and not the scroll
   * running on, and each turns the dial again:
   *
   * - A second push. A scroll that peaked at a push's size falls to a third
   *   of that peak, and then an event is more than three times its lowest
   *   ebb and a push's size itself. A flick's tail only shrinks and a
   *   mouse's notches are all one size, so neither does that. A second flick
   *   made before the first has died away does, however soon it comes.
   * - The wheel turned round. Travel against the scroll is gathered as travel
   *   toward a new one is.
   *
   * A scroll has one axis, as a swipe does. Before it turns the dial, travel
   * is gathered on each axis by itself and the first to have a scroll's worth
   * is the scroll's; after, only that axis is read. A hand that drifts
   * sideways, as it starts or as it lifts, neither undoes the scroll nor
   * scrolls back.
   */
  const wheel = (x: number, y: number) => {
    if (x === 0 && y === 0) return;
    if (timer) clock.clearTimer(timer);
    timer = clock.setTimer(quiet, WHEEL_IDLE_MS);

    if (!latched) {
      const across = gather("x", x);
      const down = gather("y", y);
      if (Math.max(across, down) < WHEEL_TICK_PX) return;
      const along: Axis = across > down ? "x" : "y";
      turn(Math.sign(gathered[along]), Math.abs(along === "x" ? x : y), along);
      return;
    }

    const pixels = axis === "x" ? x : y;
    // Off the scroll's axis altogether: it keeps the scroll alive and turns nothing.
    if (pixels === 0) return;
    const way = Math.sign(pixels);
    const size = Math.abs(pixels);

    if (way !== latched) {
      // The wheel has turned round.
      if (gather(axis, pixels) >= WHEEL_TICK_PX) turn(way, size, axis);
      return;
    }

    // More of the scroll that has already turned the dial. Whatever was
    // gathered against it was a stray, not the wheel turning round.
    gathered[axis] = 0;
    if (ebb === 0) {
      peak = Math.max(peak, size);
      // Only a scroll that has been a push can fall away from being one.
      if (peak >= WHEEL_PUSH_PX && size * WHEEL_RISE <= peak) ebb = size;
      return;
    }
    ebb = Math.min(ebb, size);
    if (size >= WHEEL_PUSH_PX && size > ebb * WHEEL_RISE) turn(way, size, axis);
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
