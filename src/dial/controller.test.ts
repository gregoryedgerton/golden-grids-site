import { COMMIT, SETTLE_MS, WHEEL_IDLE_MS, WHEEL_PUSH_PX, WHEEL_RISE, WHEEL_TICK_PX, createDial } from "./controller";
import type { DialController } from "./controller";
import { fakeClock } from "../../test/clock";

function setup(count = 10, startReduced = false) {
  const fake = fakeClock();
  const state = { reduced: startReduced };
  const depths: number[] = [];
  const focuses: number[] = [];
  const rests: boolean[] = [];
  const dial = createDial({
    count,
    reduced: () => state.reduced,
    onDepth: (depth) => depths.push(depth),
    onFocus: (index) => focuses.push(index),
    onRest: (resting) => rests.push(resting),
    clock: fake.clock,
  });
  return { ...fake, dial, state, depths, focuses, rests };
}

/**
 * A flick on a trackpad, as the wheel reports it: a quick swell to a peak,
 * then a tail dying away, an event a frame.
 */
function flick(
  dial: DialController,
  advance: (ms: number) => void,
  { peak = 80, tail = 60 }: { peak?: number; tail?: number } = {},
) {
  for (const size of [2, 8, peak * 0.4, peak * 0.75, peak]) {
    dial.wheel(0, size);
    advance(16);
  }
  let size = peak;
  for (let i = 0; i < tail; i++) {
    size *= 0.93;
    dial.wheel(0, size);
    advance(16);
  }
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

  it("stays on a cell that a long drag has only just passed", () => {
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

  it("turns one cell for a scroll, at once, and comes to rest on that cell", () => {
    const { dial, advance, focuses } = setup();
    dial.wheel(0, 100);
    // The journey has begun, toward the next cell and no further.
    advance(32);
    expect(dial.depth()).toBeGreaterThan(0);
    expect(dial.depth()).toBeLessThan(1);
    advance(3000);
    expect(dial.depth()).toBe(1);
    expect(focuses).toEqual([1]);
    dial.wheel(0, -100);
    advance(3000);
    expect(dial.depth()).toBe(0);
  });

  it("goes deeper for a scroll down or right and back for one up or left, by whichever the event has more of", () => {
    const { dial, advance } = setup(20);
    const scroll = (x: number, y: number) => {
      dial.wheel(x, y);
      advance(3000);
      return dial.depth();
    };
    expect(scroll(0, 50)).toBe(1);
    expect(scroll(50, 0)).toBe(2);
    expect(scroll(0, -50)).toBe(1);
    expect(scroll(-50, 0)).toBe(0);
    // The larger of the two is the scroll; the other is the hand's drift.
    expect(scroll(-6, 50)).toBe(1);
    expect(scroll(50, -6)).toBe(2);
    expect(scroll(6, -50)).toBe(1);
  });

  it.each([
    ["one line of a wheel that reports lines", 16],
    ["the slowest notch of a mouse on a Mac", 4.000244140625],
    ["exactly a scroll's worth", WHEEL_TICK_PX],
  ])("takes %s as a scroll, notch after notch", (_, pixels) => {
    const { dial, advance } = setup(20);
    for (let notch = 1; notch <= 4; notch++) {
      dial.wheel(0, pixels);
      // Well after the wheel has gone quiet: each notch is on its own.
      advance(1000);
      expect(dial.depth()).toBe(notch);
    }
  });

  it("does not move for travel too small to be a scroll, and forgets it when the wheel goes quiet", () => {
    const { dial, advance, depths, timers } = setup();
    dial.wheel(0, WHEEL_TICK_PX - 1);
    expect(depths).toEqual([]);
    advance(WHEEL_IDLE_MS + 20);
    expect(timers.size).toBe(0);
    // Not carried over: the same again would make a scroll if it were, and does not.
    dial.wheel(0, WHEEL_TICK_PX - 1);
    advance(3000);
    expect(depths).toEqual([]);
    expect(dial.depth()).toBe(0);
  });

  it("gathers small events into a scroll, and starts again if the wheel turns round first", () => {
    const { dial, advance } = setup();
    dial.goTo(5);
    advance(3000);
    dial.wheel(0, 1);
    dial.wheel(0, 1);
    expect(dial.depth()).toBe(5);
    // Turned round: what was gathered going forward does not count going back.
    dial.wheel(0, -1);
    dial.wheel(0, -1);
    advance(16);
    expect(dial.depth()).toBe(5);
    dial.wheel(0, -1);
    advance(3000);
    expect(dial.depth()).toBe(4);
  });

  it("turns one cell, not several, for a long scroll or a hard flick", () => {
    const { dial, advance } = setup();
    // Four screens' worth of travel in one event.
    dial.wheel(0, 3200);
    advance(3000);
    expect(dial.depth()).toBe(1);
    // A hard flick: a swell to a peak, then a second and more of tail.
    flick(dial, advance, { peak: 240, tail: 90 });
    advance(3000);
    expect(dial.depth()).toBe(2);
  });

  it("turns one cell for a wheel that is kept spinning, however long, until it pauses", () => {
    const { dial, advance } = setup(20);
    // Notch after notch of a mouse wheel, each the same size, 50 ms apart, for two seconds.
    for (let t = 0; t < 2000; t += 50) {
      dial.wheel(0, 100);
      advance(50);
    }
    advance(3000);
    expect(dial.depth()).toBe(1);
    // After the pause, the next notch is the next cell.
    dial.wheel(0, 100);
    advance(3000);
    expect(dial.depth()).toBe(2);
  });

  it("stays latched to a scroll right up to the moment the wheel has been quiet", () => {
    const { dial, advance } = setup();
    dial.wheel(0, 100);
    advance(WHEEL_IDLE_MS - 20);
    dial.wheel(0, 100);
    advance(WHEEL_IDLE_MS - 20);
    dial.wheel(0, 100);
    advance(3000);
    expect(dial.depth()).toBe(1);
  });

  it("is ready for a new scroll as soon as the wheel has been quiet", () => {
    const { dial, advance } = setup();
    dial.wheel(0, 100);
    advance(WHEEL_IDLE_MS + 20);
    // The dial is still on its way, but the first scroll is over.
    expect(dial.depth()).toBeLessThan(1);
    dial.wheel(0, 100);
    advance(3000);
    expect(dial.depth()).toBe(2);
  });

  it("takes a second flick as a second scroll, though the first has not died away", () => {
    const { dial, advance } = setup(20);
    // Each tail is cut short by the next flick: the wheel never goes quiet.
    flick(dial, advance, { tail: 12 });
    flick(dial, advance, { tail: 12 });
    flick(dial, advance);
    advance(3000);
    expect(dial.depth()).toBe(3);
  });

  it("takes the second flick however soon it comes", () => {
    const { dial, advance, clock } = setup(20);
    flick(dial, advance, { tail: 2 });
    // A tenth of a second after the first: there is no wait before a second push counts.
    expect(clock.now()).toBeLessThan(150);
    flick(dial, advance);
    advance(3000);
    expect(dial.depth()).toBe(2);
  });

  it("counts a scroll as fallen away only once it is down to a third of its peak", () => {
    const run = (dip: number) => {
      const { dial, advance } = setup(20);
      for (const size of [90, dip, 100]) {
        dial.wheel(0, size);
        advance(16);
      }
      advance(3000);
      return dial.depth();
    };
    // Down to a little over a third and up again: the same push, still swelling.
    expect(run(90 / WHEEL_RISE + 1)).toBe(1);
    // Down to a third and up to more than three times that: a second push.
    expect(run(90 / WHEEL_RISE)).toBe(2);
  });

  it("measures that fall from the push's peak, which comes after the event that turned the dial", () => {
    const run = (dip: number) => {
      const { dial, advance } = setup(20);
      // Three pixels are enough to turn the dial; the push goes on to ninety.
      for (const size of [3, 40, 90, dip, 100]) {
        dial.wheel(0, size);
        advance(16);
      }
      advance(3000);
      return dial.depth();
    };
    expect(run(90 / WHEEL_RISE + 1)).toBe(1);
    expect(run(90 / WHEEL_RISE)).toBe(2);
  });

  it("takes a climb to more than three times the ebb, from at least a push's size, and nothing less", () => {
    /** A scroll that has fallen away to an ebb, then one more event. */
    const after = (ebb: number, next: number) => {
      const { dial, advance } = setup(20);
      for (const size of [100, ebb, next]) {
        dial.wheel(0, size);
        advance(16);
      }
      advance(3000);
      return dial.depth();
    };
    // Three times the ebb and no more is not a push; a hair over is.
    expect(after(4, 4 * WHEEL_RISE)).toBe(1);
    expect(after(4, 4 * WHEEL_RISE + 0.5)).toBe(2);
    // Many times a one-pixel ebb is still not a push while it is under a push's size.
    expect(after(1, WHEEL_PUSH_PX - 0.5)).toBe(1);
    expect(after(1, WHEEL_PUSH_PX)).toBe(2);
  });

  it("does not take a stumble in a flick's swell, or a wobble or a doubled event in its tail, for a second push", () => {
    const { dial, advance } = setup();
    // The swell dips on its way up.
    for (const size of [3, 8, 30, 25, 60, 80]) {
      dial.wheel(0, size);
      advance(16);
    }
    // The tail wobbles, and twice the browser hands over two events as one.
    for (const size of [70, 52, 58, 40, 31, 26, 22, 44, 19, 16, 18, 13, 11, 22, 9, 8]) {
      dial.wheel(0, size);
      advance(16);
    }
    advance(3000);
    expect(dial.depth()).toBe(1);
  });

  it("does not take the faint end of a flick for a second push, however it flutters", () => {
    const { dial, advance } = setup();
    flick(dial, advance);
    // Still arriving, never quiet: a pixel or two, sometimes several times the one before.
    const flutter = [1, 3, 1, 4, 1, 7, 2, 6, 1, 5];
    expect(Math.max(...flutter)).toBeLessThan(WHEEL_PUSH_PX);
    for (const size of flutter) {
      dial.wheel(0, size);
      advance(60);
    }
    advance(3000);
    expect(dial.depth()).toBe(1);
  });

  it("turns back when the wheel is turned round in mid-scroll, without waiting for it to go quiet", () => {
    const { dial, advance } = setup(20);
    dial.goTo(5);
    advance(3000);
    flick(dial, advance, { tail: 10 });
    // Straight into a scroll the other way, a pixel at a time.
    for (let i = 0; i < 12; i++) {
      dial.wheel(0, -1);
      advance(16);
    }
    advance(3000);
    // Forward one and back one, and no further back for the rest of that scroll.
    expect(dial.depth()).toBe(5);
  });

  it("does not add up stray travel against a scroll across the scroll's own events", () => {
    const { dial, advance } = setup(20);
    dial.wheel(0, 100);
    // One pixel back, now and then, in a stream that is otherwise still going
    // forward. Three of them, a scroll's worth if they were added up, and the
    // third is the last thing the wheel says.
    for (let i = 0; i <= 6; i++) {
      dial.wheel(0, i % 3 === 0 ? -1 : 100);
      advance(16);
    }
    advance(3000);
    expect(dial.depth()).toBe(1);
  });

  it("gathers travel on each axis by itself, so drift across a scroll that is starting does not undo it", () => {
    const { dial, advance } = setup(20);
    // Two pixels down, two to the left, one more down: three pixels down in all, and that is a scroll.
    dial.wheel(0, 2);
    dial.wheel(-2, 0);
    dial.wheel(0, 1);
    advance(3000);
    expect(dial.depth()).toBe(1);
  });

  it("gives a scroll the axis that first has a scroll's worth, not the axis of its first event", () => {
    const { dial, advance } = setup(20);
    dial.goTo(5);
    advance(3000);
    // A stray pixel to the left, then the scroll itself, downward.
    dial.wheel(-1, 0);
    dial.wheel(0, 5);
    // It is a scroll down, so more travel to the left is off its axis and turns nothing.
    for (let i = 0; i < 6; i++) {
      dial.wheel(-4, 1);
      advance(16);
    }
    advance(3000);
    expect(dial.depth()).toBe(6);
  });

  it("takes the axis with more gathered when both have a scroll's worth at once, and the vertical one if they are level", () => {
    const { dial, advance } = setup(20);
    const scroll = (x: number, y: number) => {
      dial.goTo(10);
      advance(3000);
      dial.wheel(x, y);
      advance(3000);
      return dial.depth();
    };
    // More to the left than down: back.
    expect(scroll(-5, 4)).toBe(9);
    // More down than to the left: deeper.
    expect(scroll(-4, 5)).toBe(11);
    // Level: down.
    expect(scroll(-4, 4)).toBe(11);
  });

  it("looks for a second push only after a scroll that was itself a push", () => {
    const run = (sizes: number[]) => {
      const { dial, advance } = setup(20);
      for (const size of sizes) {
        dial.wheel(0, size);
        advance(16);
      }
      advance(3000);
      return dial.depth();
    };
    // A flick that wobbles as it starts: down to a third and up again, all under a push's size, then the swell.
    expect(run([1, 2, 0.6, 3, 8, 20, 40, 60, 50, 35])).toBe(1);
    expect(run([2, 1, 0.6, 3, 8, 20, 40, 60, 50, 35])).toBe(1);
    // Gentle travel that dips and recovers is one scroll, whichever way the numbers fall.
    expect(run([4, 1, 4])).toBe(1);
    expect(run([2, 1, 0.6, 3])).toBe(1);
    expect(run([1, 1, 1, 0.3, 7.9])).toBe(1);
    // A scroll has to have peaked at a push's size before it can fall away from it.
    expect(run([WHEEL_PUSH_PX - 0.1, 2, 30])).toBe(1);
    expect(run([WHEEL_PUSH_PX, 2, 30])).toBe(2);
  });

  it("keeps a scroll to the axis it began on, so a hand that drifts sideways does not scroll back", () => {
    const { dial, advance } = setup(20);
    dial.goTo(5);
    advance(3000);
    dial.wheel(0, 60);
    // The fingers hook to the left as they lift: more sideways travel than downward, and leftward is back.
    for (const [x, y] of [
      [-5, 4],
      [-9, 2],
      [-12, 1],
      [-10, 0],
      [-6, 0],
    ] as const) {
      dial.wheel(x, y);
      advance(16);
    }
    advance(3000);
    expect(dial.depth()).toBe(6);
    // Once the wheel has been quiet, a scroll to the left is a scroll back.
    dial.wheel(-12, 1);
    advance(3000);
    expect(dial.depth()).toBe(5);
  });

  it("holds a sideways scroll to its axis and to one cell in the same way", () => {
    const { dial, advance } = setup(20);
    // A scroll to the right, the hand drifting down and then up at the end.
    dial.wheel(80, 0);
    for (const [x, y] of [
      [60, 5],
      [30, 12],
      [10, 14],
      [0, 9],
      [0, -6],
    ] as const) {
      dial.wheel(x, y);
      advance(16);
    }
    advance(3000);
    expect(dial.depth()).toBe(1);
  });

  it("counts an event off the scroll's axis as the scroll still going on", () => {
    const { dial, advance } = setup(20);
    dial.wheel(0, 100);
    // Sideways only, for half a second: nothing along the scroll's axis, but the wheel is not quiet.
    for (let t = 0; t < 500; t += 100) {
      advance(100);
      dial.wheel(7, 0);
    }
    advance(100);
    // So this is more of the same scroll, and turns nothing.
    dial.wheel(0, 100);
    advance(3000);
    expect(dial.depth()).toBe(1);
  });

  it("ignores a wheel event with no travel at all", () => {
    const { dial, timers, depths } = setup();
    dial.wheel(0, 0);
    expect(timers.size).toBe(0);
    expect(depths).toEqual([]);
  });

  it("lets a key name a cell in the middle of a scroll, and goes there", () => {
    const { dial, advance } = setup(20);
    dial.wheel(0, 100);
    dial.goTo(19);
    advance(5000);
    expect(dial.depth()).toBe(19);
    dial.wheel(0, -1);
    dial.step(-1);
    advance(5000);
    expect(dial.depth()).toBe(18);
  });

  it("lets a finger take over from a scroll, and settles once when it lifts", () => {
    const { dial, advance, frames } = setup();
    dial.wheel(0, 1);
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
    // A wheel waiting to go quiet, short of a scroll.
    const b = setup();
    b.dial.wheel(0, 1);
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

describe("createDial, at rest on a cell and away from it", () => {
  it("starts at rest and says so to nobody", () => {
    const { rests, advance } = setup();
    advance(1000);
    expect(rests).toEqual([]);
  });

  it("leaves rest when it sets off for another cell and is at rest again only when it has arrived", () => {
    const { dial, advance, rests, focuses } = setup();
    dial.step(1);
    expect(rests).toEqual([false]);
    // Past half way the next cell is the nearest, and the dial is still travelling.
    while (focuses.length === 0) advance(16);
    expect(dial.depth()).toBeLessThan(1);
    expect(rests).toEqual([false]);
    advance(2000);
    expect(dial.depth()).toBe(1);
    expect(rests).toEqual([false, true]);
  });

  it("says each once: more travel on the way is not a second departure", () => {
    const { dial, advance, rests } = setup();
    dial.step(1);
    advance(48);
    dial.step(1);
    dial.wheel(0, 40);
    advance(48);
    dial.goTo(5);
    expect(rests).toEqual([false]);
    advance(3000);
    expect(dial.depth()).toBe(5);
    expect(rests).toEqual([false, true]);
  });

  it("is off rest under a finger, and at rest once it has settled after the finger lifts", () => {
    const { dial, advance, rests } = setup();
    dial.nudge(0.05);
    dial.nudge(0.05);
    expect(rests).toEqual([false]);
    dial.release();
    // Settling back to the cell it never really left.
    expect(rests).toEqual([false]);
    advance(2000);
    expect(dial.depth()).toBe(0);
    expect(rests).toEqual([false, true]);

    dial.nudge(0.4);
    dial.release();
    advance(2000);
    expect(dial.depth()).toBe(1);
    expect(rests).toEqual([false, true, false, true]);
  });

  it("never leaves rest when motion is reduced: it is on one cell and then on another", () => {
    const { dial, advance, rests, focuses } = setup(10, true);
    dial.step(1);
    dial.goTo(4);
    dial.nudge(0.6);
    dial.release();
    dial.wheel(0, 40);
    advance(1000);
    expect(focuses.at(-1)).toBe(dial.depth());
    expect(dial.depth()).toBeGreaterThan(4);
    expect(rests).toEqual([]);
  });

  it("tells of the cell before it tells of the rest, when both come in one moment", () => {
    const fake = fakeClock();
    const state = { reduced: false };
    const told: string[] = [];
    const dial = createDial({
      count: 10,
      reduced: () => state.reduced,
      onDepth: () => {},
      onFocus: (index) => told.push(`focus ${index}`),
      onRest: (resting) => told.push(resting ? "at rest" : "off"),
      clock: fake.clock,
    });
    dial.step(1);
    fake.advance(16);
    // Not yet half way, so cell 0 is still the nearest. Motion is reduced now, and the next frame jumps to the end.
    expect(dial.depth()).toBeLessThan(0.5);
    state.reduced = true;
    fake.advance(16);
    expect(dial.depth()).toBe(1);
    expect(told).toEqual(["off", "focus 1", "at rest"]);
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
    dial.wheel(0, 100);
    expect(depths).toEqual([1]);
    for (let i = 1; i < 30; i++) {
      dial.wheel(0, 100 * 0.9 ** i);
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
