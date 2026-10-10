import {
  COMMIT,
  SETTLE_MS,
  WHEEL_HOLD_MS,
  WHEEL_IDLE_MS,
  WHEEL_PUSH,
  WHEEL_RISE,
  WHEEL_TICK,
  createDial,
} from "./controller";
import type { DialClock } from "./controller";

/** A clock the test turns by hand. */
function fakeClock() {
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
  /** Advance by `ms`, running due timers and one frame per 16 ms. */
  const advance = (ms: number) => {
    const end = time + ms;
    while (time < end) {
      time = Math.min(end, time + 16);
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

function setup(count = 10, startReduced = false) {
  const fake = fakeClock();
  const state = { reduced: startReduced };
  const depths: number[] = [];
  const focuses: number[] = [];
  const dial = createDial({
    count,
    reduced: () => state.reduced,
    onDepth: (depth) => depths.push(depth),
    onFocus: (index) => focuses.push(index),
    clock: fake.clock,
  });
  return { ...fake, dial, state, depths, focuses };
}

describe("createDial, with motion", () => {
  it("starts at the first cell and reports nothing until it moves", () => {
    const { dial, depths, focuses } = setup();
    expect(dial.depth()).toBe(0);
    expect(depths).toEqual([]);
    expect(focuses).toEqual([]);
  });

  it("travels to the next cell over several frames and arrives exactly", () => {
    const { dial, advance, depths, focuses, frames } = setup();
    dial.step(1);
    expect(dial.depth()).toBe(0);
    advance(32);
    expect(dial.depth()).toBeGreaterThan(0);
    expect(dial.depth()).toBeLessThan(1);
    advance(2000);
    expect(dial.depth()).toBe(1);
    expect(frames.size).toBe(0);
    // Every frame moved it closer; none overshot.
    expect(depths.every((d, i) => i === 0 || d >= (depths[i - 1] as number))).toBe(true);
    expect(Math.max(...depths)).toBe(1);
    expect(focuses).toEqual([1]);
  });

  it("eases by the time that has passed, whatever the frame rate", () => {
    const a = setup();
    a.dial.step(1);
    a.advance(SETTLE_MS);
    // One time constant covers 1 - 1/e of the way, in 16 ms frames or in one.
    expect(a.dial.depth()).toBeCloseTo(1 - Math.exp(-(Math.ceil(SETTLE_MS / 16) * 16) / SETTLE_MS), 1);
    expect(a.dial.depth()).toBeGreaterThan(0.6);
    expect(a.dial.depth()).toBeLessThan(0.7);
  });

  it("does not move backwards if a frame reports a time before the last", () => {
    const { dial, clock, frames } = setup();
    dial.step(1);
    const [tick] = [...frames.values()] as [(time: number) => void];
    tick(clock.now() - 50);
    expect(dial.depth()).toBe(0);
  });

  it("retargets a journey already under way without starting a second one", () => {
    const { dial, advance, frames } = setup();
    dial.step(1);
    advance(48);
    dial.step(1);
    dial.step(1);
    expect(frames.size).toBe(1);
    advance(3000);
    expect(dial.depth()).toBe(3);
  });

  it("stays within the first and last cells", () => {
    const { dial, advance } = setup(4);
    dial.step(-1);
    advance(1000);
    expect(dial.depth()).toBe(0);
    dial.goTo(99);
    advance(3000);
    expect(dial.depth()).toBe(3);
    dial.step(1);
    advance(1000);
    expect(dial.depth()).toBe(3);
    dial.nudge(5);
    expect(dial.depth()).toBe(3);
    dial.nudge(-50);
    expect(dial.depth()).toBe(0);
  });

  it("follows continuous input at once and ignores an empty nudge", () => {
    const { dial, depths, frames } = setup();
    dial.nudge(0);
    expect(depths).toEqual([]);
    dial.nudge(0.3);
    dial.nudge(0.3);
    expect(dial.depth()).toBeCloseTo(0.6, 9);
    expect(depths).toHaveLength(2);
    expect(frames.size).toBe(0);
  });

  it("goes on to the next cell once input has carried it past the commit point", () => {
    const { dial, advance, focuses } = setup();
    dial.nudge(COMMIT + 0.01);
    dial.release();
    advance(3000);
    expect(dial.depth()).toBe(1);
    expect(focuses).toEqual([1]);
  });

  it("returns to the cell it left if input stops short of the commit point", () => {
    const { dial, advance, focuses } = setup();
    dial.nudge(COMMIT - 0.01);
    dial.release();
    advance(3000);
    expect(dial.depth()).toBe(0);
    expect(focuses).toEqual([]);
  });

  it("settles in the direction the input was last moving", () => {
    const { dial, advance } = setup();
    dial.goTo(4);
    advance(3000);
    // Dragged on to 5.4, then pulled back a little: the hand has turned round.
    dial.nudge(1.4);
    dial.nudge(-0.1);
    dial.release();
    advance(3000);
    expect(dial.depth()).toBe(5);
    // Dragged back past the commit point: the previous cell.
    dial.nudge(-0.3);
    dial.release();
    advance(3000);
    expect(dial.depth()).toBe(4);
  });

  it("stays on a cell that a long scroll has only just passed", () => {
    const { dial, advance } = setup();
    // Two cells and a little: the reader stopped on the third, not short of the fourth.
    dial.nudge(2.05);
    dial.release();
    advance(3000);
    expect(dial.depth()).toBe(2);
    // And the same going back.
    dial.nudge(-1.05);
    dial.release();
    advance(3000);
    expect(dial.depth()).toBe(1);
    // Well past it, the dial goes on.
    dial.nudge(1.5);
    dial.release();
    advance(3000);
    expect(dial.depth()).toBe(3);
  });

  it("takes over from a journey when a finger lands", () => {
    const { dial, advance, frames } = setup();
    dial.step(3);
    advance(48);
    const caught = dial.depth();
    dial.nudge(0.05);
    expect(frames.size).toBe(0);
    expect(dial.depth()).toBeCloseTo(caught + 0.05, 9);
  });

  it("turns one tick for a scroll, at once, and comes to rest on that cell", () => {
    const { dial, advance, focuses } = setup();
    dial.wheel(WHEEL_TICK);
    // The journey has begun, toward the next cell and no further.
    advance(32);
    expect(dial.depth()).toBeGreaterThan(0);
    advance(3000);
    expect(dial.depth()).toBe(1);
    expect(focuses).toEqual([1]);
    dial.wheel(-WHEEL_TICK);
    advance(3000);
    expect(dial.depth()).toBe(0);
  });

  it("does not move for a scroll too small to be a tick, and forgets it when the wheel goes quiet", () => {
    const { dial, advance, depths, timers } = setup();
    dial.wheel(WHEEL_TICK * 0.6);
    expect(depths).toEqual([]);
    advance(WHEEL_IDLE_MS + 20);
    expect(timers.size).toBe(0);
    // Not carried over: the same again is still short of a tick.
    dial.wheel(WHEEL_TICK * 0.6);
    advance(3000);
    expect(depths).toEqual([]);
    expect(dial.depth()).toBe(0);
  });

  it("gathers small scrolls into a tick, and starts again when the wheel turns round", () => {
    const { dial, advance } = setup();
    dial.goTo(5);
    advance(3000);
    dial.wheel(WHEEL_TICK * 0.4);
    dial.wheel(WHEEL_TICK * 0.4);
    expect(dial.depth()).toBe(5);
    // Turned round: what was gathered going forward does not count going back.
    dial.wheel(-WHEEL_TICK * 0.4);
    dial.wheel(-WHEEL_TICK * 0.4);
    advance(16);
    expect(dial.depth()).toBe(5);
    dial.wheel(-WHEEL_TICK * 0.4);
    advance(3000);
    expect(dial.depth()).toBe(4);
  });

  it("turns one tick, not several, for a long scroll or a hard flick", () => {
    const { dial, advance } = setup();
    // Four cells' worth of travel in one event.
    dial.wheel(4);
    advance(3000);
    expect(dial.depth()).toBe(1);
    // And as a flick: a burst, then a long tail of ever smaller events.
    let size = 0.6;
    for (let i = 0; i < 80; i++) {
      dial.wheel(size);
      advance(16);
      size *= 0.93;
    }
    advance(3000);
    expect(dial.depth()).toBe(2);
  });

  it("turns one cell for a wheel that is kept spinning, however long, until it pauses", () => {
    const { dial, advance } = setup(20);
    // Notch after notch of a mouse wheel, each the same size, 50 ms apart, for well over three holds.
    for (let t = 0; t < WHEEL_HOLD_MS * 3 + 100; t += 50) {
      dial.wheel(0.125);
      advance(50);
    }
    advance(3000);
    expect(dial.depth()).toBe(1);
    // After the pause, the next notch is the next cell.
    dial.wheel(0.125);
    advance(3000);
    expect(dial.depth()).toBe(2);
  });

  it("turns a cell for each notch of a wheel turned a notch at a time, small notches included", () => {
    const { dial, advance } = setup(20);
    // Three lines of sixteen pixels: 48 pixels, 0.06 of a step.
    for (let notch = 1; notch <= 4; notch++) {
      dial.wheel(0.06);
      advance(WHEEL_IDLE_MS + 60);
      advance(1000);
      expect(dial.depth()).toBe(notch);
    }
  });

  it("takes a second flick, made before the first has died away, as a second scroll", () => {
    const { dial, advance } = setup(20);
    const flick = () => {
      let size = 0.5;
      for (let i = 0; i < 30; i++) {
        dial.wheel(size);
        advance(16);
        size *= 0.93;
      }
    };
    // The tail of the first is still arriving when the second begins: the wheel never goes quiet.
    flick();
    flick();
    advance(3000);
    expect(dial.depth()).toBe(2);
  });

  it("does not take an event only a little larger than the last for a second push", () => {
    const { dial, advance } = setup();
    dial.wheel(0.1);
    for (let t = 0; t < WHEEL_HOLD_MS * 3; t += 50) {
      advance(50);
      // A tail that wobbles: up and down by less than the rise a new push needs.
      dial.wheel(t % 100 === 0 ? 0.1 : 0.1 * (WHEEL_RISE - 0.1));
    }
    advance(3000);
    expect(dial.depth()).toBe(1);
  });

  it("ignores the wheel during the hold, however hard it is pushed", () => {
    const { dial, advance } = setup();
    dial.wheel(WHEEL_TICK);
    // The wheel never goes quiet, and every event is twice the push of the last.
    let size = WHEEL_TICK;
    for (let t = 50; t < WHEEL_HOLD_MS; t += 50) {
      advance(50);
      size *= 2;
      dial.wheel(size);
    }
    advance(3000);
    expect(dial.depth()).toBe(1);
  });

  it("does not take the faint end of a flick for a new push, even after the hold", () => {
    const { dial, advance } = setup();
    dial.wheel(WHEEL_TICK);
    // Still arriving long after the hold, never quiet, each no larger than a
    // pixel or two and no smaller than the one before.
    for (let t = 0; t < WHEEL_HOLD_MS * 4; t += 60) {
      advance(60);
      dial.wheel(WHEEL_PUSH * 0.5);
    }
    advance(3000);
    expect(dial.depth()).toBe(1);
  });

  it("is ready for a new scroll as soon as the wheel has been quiet", () => {
    const { dial, advance } = setup();
    dial.wheel(WHEEL_TICK);
    advance(WHEEL_IDLE_MS + 20);
    // Well inside the hold, but the first gesture is over.
    dial.wheel(WHEEL_TICK);
    advance(3000);
    expect(dial.depth()).toBe(2);
  });

  it("ignores an empty wheel event", () => {
    const { dial, timers, depths } = setup();
    dial.wheel(0);
    expect(timers.size).toBe(0);
    expect(depths).toEqual([]);
  });

  it("lets a key name a cell in the middle of a scroll, and goes there", () => {
    const { dial, advance } = setup(20);
    dial.wheel(WHEEL_TICK);
    dial.goTo(19);
    advance(5000);
    expect(dial.depth()).toBe(19);
    dial.wheel(-WHEEL_TICK * 0.5);
    dial.step(-1);
    advance(5000);
    expect(dial.depth()).toBe(18);
  });

  it("lets a finger take over from a scroll, and settles once when it lifts", () => {
    const { dial, advance, frames } = setup();
    dial.wheel(WHEEL_TICK * 0.5);
    dial.nudge(0.3);
    advance(1000);
    // Still held: nothing settled it under the finger.
    expect(dial.depth()).toBeCloseTo(0.3, 9);
    expect(frames.size).toBe(0);
    dial.release();
    advance(3000);
    expect(dial.depth()).toBe(1);
  });

  it("stops everything pending when destroyed", () => {
    // A journey under way.
    const a = setup();
    a.dial.step(1);
    expect(a.frames.size).toBe(1);
    a.dial.destroy();
    expect(a.frames.size).toBe(0);
    a.advance(3000);
    expect(a.depths).toEqual([]);
    // A wheel waiting to go quiet, short of a tick.
    const b = setup();
    b.dial.wheel(WHEEL_TICK * 0.5);
    expect(b.timers.size).toBe(1);
    b.dial.destroy();
    expect(b.timers.size).toBe(0);
    b.advance(3000);
    expect(b.depths).toEqual([]);
  });

  it("is safe to destroy at rest", () => {
    const { dial, frames, timers } = setup();
    dial.destroy();
    expect(frames.size + timers.size).toBe(0);
  });
});

describe("createDial, with motion reduced", () => {
  it("jumps a whole step in one report, with no travel", () => {
    const { dial, depths, focuses, frames } = setup(10, true);
    dial.step(1);
    expect(depths).toEqual([1]);
    expect(focuses).toEqual([1]);
    expect(frames.size).toBe(0);
    dial.goTo(7);
    expect(depths).toEqual([1, 7]);
    expect(dial.depth()).toBe(7);
  });

  it("counts a drag without showing it, and jumps one step on release", () => {
    const { dial, depths } = setup(10, true);
    dial.nudge(0.4);
    dial.nudge(0.9);
    expect(depths).toEqual([]);
    dial.release();
    // One step, however far the finger went.
    expect(depths).toEqual([1]);
    dial.nudge(-0.5);
    dial.release();
    expect(depths).toEqual([1, 0]);
  });

  it("does nothing for a drag that stops short of the commit point, and forgets it", () => {
    const { dial, depths } = setup(10, true);
    dial.nudge(COMMIT - 0.01);
    dial.release();
    expect(depths).toEqual([]);
    // The short drag is not carried into the next one.
    dial.nudge(COMMIT - 0.01);
    dial.release();
    expect(depths).toEqual([]);
  });

  it("settles on the nearest cell if the preference changes in mid-drag", () => {
    const { dial, state, depths } = setup();
    dial.nudge(0.4);
    state.reduced = true;
    dial.release();
    expect(dial.depth()).toBe(0);
    state.reduced = false;
    dial.nudge(0.7);
    state.reduced = true;
    // The rest of the drag is counted from where the dial stands.
    dial.nudge(0.5);
    dial.release();
    expect(dial.depth()).toBe(2);
    expect(depths.at(-1)).toBe(2);
  });

  it("does not jump past either end", () => {
    const { dial, depths } = setup(3, true);
    dial.nudge(-1);
    dial.release();
    expect(depths).toEqual([]);
    dial.goTo(2);
    dial.nudge(1);
    dial.release();
    expect(depths).toEqual([2]);
  });

  it("forgets a counted drag when a key names a cell", () => {
    const { dial, depths } = setup(10, true);
    dial.nudge(0.9);
    dial.step(1);
    dial.release();
    expect(depths).toEqual([1]);
  });

  it("jumps one step for a scroll, at once, and one only", () => {
    const { dial, advance, depths } = setup(10, true);
    dial.wheel(WHEEL_TICK);
    expect(depths).toEqual([1]);
    for (let i = 0; i < 20; i++) {
      dial.wheel(0.2 * 0.9 ** i);
      advance(16);
    }
    advance(WHEEL_IDLE_MS + 16);
    expect(depths).toEqual([1]);
  });

  it("finishes a journey at once if the preference changes on the way", () => {
    const { dial, advance, state, frames } = setup();
    dial.step(1);
    advance(32);
    expect(dial.depth()).toBeLessThan(1);
    state.reduced = true;
    advance(16);
    expect(dial.depth()).toBe(1);
    expect(frames.size).toBe(0);
    // And a new one made while a frame is still pending arrives without waiting for it.
    state.reduced = false;
    dial.step(1);
    state.reduced = true;
    dial.step(1);
    expect(dial.depth()).toBe(3);
    expect(frames.size).toBe(0);
  });
});
