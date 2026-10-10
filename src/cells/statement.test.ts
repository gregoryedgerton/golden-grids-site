import { fakeClock } from "../../test/clock";
import { AT_FIRST, LEAD_MS, SAID_MS, SPOKEN, createStatement, crossedAt, opposite } from "./statement";
import type { Look } from "./statement";

function setup(startReduced = false) {
  const fake = fakeClock();
  const state = { reduced: startReduced };
  const looks: Look[] = [];
  const statement = createStatement({
    reduced: () => state.reduced,
    onLook: (look) => looks.push(look),
    clock: fake.clock,
  });
  /** Move the clock on by exactly this much, in one step, so a look can be taken at a known moment. */
  const to = (ms: number) => fake.advance(ms, ms);
  const latest = () => looks.at(-1);
  return { ...fake, to, statement, state, looks, latest };
}

/** Enter, and move on to the very start of the first crossing. */
function started(startReduced = false) {
  const made = setup(startReduced);
  made.statement.enter();
  made.to(LEAD_MS);
  return made;
}

describe("how the statement is said", () => {
  it("says its three words one after another, and takes as long as the last of them", () => {
    expect(SPOKEN).toHaveLength(3);
    for (const [word, { at }] of SPOKEN.entries()) {
      const before = SPOKEN[word - 1];
      if (before) expect(at).toBeGreaterThan(before.at + before.lasts);
    }
    expect(SAID_MS).toBe(1140);
    // About as long as it takes to say three words with some weight on the last.
    expect(SAID_MS).toBeGreaterThan(900);
    expect(SAID_MS).toBeLessThan(1500);
  });

  it("has none of the colour on a word before it is said and all of it once it has been", () => {
    expect(crossedAt(0, false)).toEqual([0, 0, 0]);
    expect(crossedAt(300, false)).toEqual([1, 0, 0]);
    // The breath between THESE and ARE.
    expect(crossedAt(379, false)).toEqual([1, 0, 0]);
    expect(crossedAt(600, false)).toEqual([1, 1, 0]);
    expect(crossedAt(699, false)).toEqual([1, 1, 0]);
    expect(crossedAt(SAID_MS, false)).toEqual([1, 1, 1]);
    expect(crossedAt(SAID_MS + 5000, false)).toEqual([1, 1, 1]);
  });

  it("strikes a word and carries it through: most of it early, the rest more slowly", () => {
    // THESE takes 300 ms. A quarter of the way through its time it is 7/16 crossed, half way 3/4.
    expect(crossedAt(75, false)[0]).toBeCloseTo(0.4375, 10);
    expect(crossedAt(150, false)[0]).toBeCloseTo(0.75, 10);
    expect(crossedAt(225, false)[0]).toBeCloseTo(0.9375, 10);
    // ARE starts at 380 and takes 220; FAKE at 700 and takes 440.
    expect(crossedAt(380 + 110, false)).toEqual([1, 0.75, 0]);
    expect(crossedAt(700 + 220, false)).toEqual([1, 1, 0.75]);
  });

  it("changes a word whole on its beat when motion is reduced, with nothing part of the way", () => {
    expect(crossedAt(0, true)).toEqual([1, 0, 0]);
    expect(crossedAt(150, true)).toEqual([1, 0, 0]);
    expect(crossedAt(379, true)).toEqual([1, 0, 0]);
    expect(crossedAt(380, true)).toEqual([1, 1, 0]);
    expect(crossedAt(699, true)).toEqual([1, 1, 0]);
    expect(crossedAt(700, true)).toEqual([1, 1, 1]);
  });

  it("is black before anything is said, and its two colours are each other's opposite", () => {
    expect(AT_FIRST).toEqual({ ink: "black", crossed: [0, 0, 0] });
    expect(opposite("black")).toBe("white");
    expect(opposite("white")).toBe("black");
  });
});

describe("the statement", () => {
  it("says nothing until the dial has come to rest on its cell", () => {
    const { advance, looks, timers, frames } = setup();
    advance(10_000);
    expect(looks).toEqual([]);
    expect(timers.size + frames.size).toBe(0);
  });

  it("waits a moment after the dial comes to rest, then crosses THESE, ARE and FAKE with white in turn", () => {
    const { statement, to, looks, latest } = setup();
    statement.enter();
    to(LEAD_MS - 1);
    expect(looks).toEqual([]);
    to(1);
    // The crossing has begun and has covered nothing yet.
    expect(looks).toEqual([]);

    to(150);
    expect(latest()).toEqual({ ink: "black", crossed: [0.75, 0, 0] });
    to(150);
    expect(latest()).toEqual({ ink: "black", crossed: [1, 0, 0] });
    to(190);
    expect(latest()).toEqual({ ink: "black", crossed: [1, 0.75, 0] });
    to(430);
    expect(latest()).toEqual({ ink: "black", crossed: [1, 1, 0.75] });
    to(219);
    expect(latest()?.ink).toBe("black");
    // Said: it is white, with nothing crossing it.
    to(1);
    expect(latest()).toEqual({ ink: "white", crossed: [0, 0, 0] });
  });

  it("only ever goes forward across a word", () => {
    const { advance, looks } = started();
    advance(SAID_MS - 1);
    expect(looks.length).toBeGreaterThan(30);
    for (const [i, look] of looks.entries()) {
      const before = looks[i - 1];
      if (before) look.crossed.forEach((share, word) => expect(share).toBeGreaterThanOrEqual(before.crossed[word] as number));
    }
  });

  it("says nothing new while nothing changes: in the breath between two words", () => {
    const { to, looks } = started();
    to(300);
    const said = looks.length;
    // Frames go by between THESE and ARE, and none of them is a new look.
    to(20);
    to(20);
    to(39);
    expect(looks).toHaveLength(said);
    to(11);
    expect(looks).toHaveLength(said + 1);
  });

  it("rests white for as long as it took to say, then black crosses it the same way, and so on round", () => {
    const { to, looks, latest, timers, frames } = started();
    to(SAID_MS);
    expect(latest()).toEqual({ ink: "white", crossed: [0, 0, 0] });
    const said = looks.length;

    // The rest: one timer, no frames, nothing shown.
    expect([timers.size, frames.size]).toEqual([1, 0]);
    to(SAID_MS - 1);
    expect(looks).toHaveLength(said);
    expect([timers.size, frames.size]).toEqual([1, 0]);

    // Black, crossing white.
    to(1);
    to(150);
    expect(latest()).toEqual({ ink: "white", crossed: [0.75, 0, 0] });
    to(SAID_MS - 150);
    expect(latest()).toEqual({ ink: "black", crossed: [0, 0, 0] });

    // And white again after the same rest.
    to(SAID_MS);
    to(150);
    expect(latest()).toEqual({ ink: "black", crossed: [0.75, 0, 0] });
    to(SAID_MS - 150);
    expect(latest()).toEqual({ ink: "white", crossed: [0, 0, 0] });
  });

  it("finishes the crossing under way when its cell loses the focus, and then stays the colour it reached", () => {
    const { statement, to, advance, looks, latest, timers, frames } = started();
    to(400);
    expect(latest()).toEqual({ ink: "black", crossed: [1, expect.closeTo(0.174, 3), 0] });
    statement.leave();

    // It goes on to the end of FAKE, a frame at a time.
    const left = looks.length;
    advance(SAID_MS - 400);
    expect(looks.length).toBeGreaterThan(left + 10);
    expect(latest()).toEqual({ ink: "white", crossed: [0, 0, 0] });

    // And that is all: nothing is pending, and nothing more is shown however long it is left.
    const said = looks.length;
    expect([timers.size, frames.size]).toEqual([0, 0]);
    advance(20_000);
    expect(looks).toHaveLength(said);
  });

  it("is never left part white and part black", () => {
    for (const leftAt of [1, 150, 299, 300, 380, 500, 650, 700, 900, SAID_MS - 1]) {
      const { statement, to, advance, latest } = started();
      to(leftAt);
      statement.leave();
      advance(10_000);
      expect(latest()).toEqual({ ink: "white", crossed: [0, 0, 0] });
    }
  });

  it("calls off the crossing that was to come if its cell loses the focus while it rests", () => {
    const { statement, to, advance, looks, latest, timers, frames } = started();
    to(SAID_MS);
    to(SAID_MS / 2);
    statement.leave();
    expect([timers.size, frames.size]).toEqual([0, 0]);
    const said = looks.length;
    advance(20_000);
    expect(looks).toHaveLength(said);
    expect(latest()).toEqual({ ink: "white", crossed: [0, 0, 0] });
  });

  it("does not begin at all if the reader moves on before the first word", () => {
    const { statement, advance, looks, timers, frames } = setup();
    statement.enter();
    advance(LEAD_MS - 50);
    statement.leave();
    expect([timers.size, frames.size]).toEqual([0, 0]);
    advance(20_000);
    expect(looks).toEqual([]);
  });

  it("takes up from the colour it was left in when the dial rests on its cell again: black next, after white", () => {
    const { statement, to, advance, latest } = started();
    to(500);
    statement.leave();
    advance(5_000);
    expect(latest()).toEqual({ ink: "white", crossed: [0, 0, 0] });

    statement.enter();
    to(LEAD_MS);
    to(150);
    expect(latest()).toEqual({ ink: "white", crossed: [0.75, 0, 0] });
    to(SAID_MS - 150);
    expect(latest()).toEqual({ ink: "black", crossed: [0, 0, 0] });
  });

  it("goes on round if its cell has the focus again before the crossing it was left in has finished", () => {
    const { statement, to, latest, timers } = started();
    to(300);
    statement.leave();
    to(200);
    statement.enter();
    // Nothing new is arranged: the crossing under way is the one that counts.
    expect(timers.size).toBe(0);
    to(SAID_MS - 500);
    expect(latest()).toEqual({ ink: "white", crossed: [0, 0, 0] });
    expect(timers.size).toBe(1);
    to(SAID_MS);
    to(150);
    expect(latest()).toEqual({ ink: "white", crossed: [0.75, 0, 0] });
  });

  it("begins once, however often it is told the dial is at rest", () => {
    const { statement, to, looks, timers, frames } = setup();
    statement.enter();
    statement.enter();
    expect(timers.size).toBe(1);
    to(LEAD_MS);
    statement.enter();
    expect([timers.size, frames.size]).toEqual([0, 1]);
    to(150);
    statement.enter();
    expect(looks).toEqual([{ ink: "black", crossed: [0.75, 0, 0] }]);
    expect([timers.size, frames.size]).toEqual([0, 1]);
  });

  it("changes each word whole, on its beat, when motion is reduced, and runs nothing in between", () => {
    const { statement, to, looks, timers, frames, clock } = setup(true);
    const waits = vi.spyOn(clock, "setTimer");
    statement.enter();
    to(LEAD_MS);
    // THESE at once, and then a timer for ARE's beat: no frame is ever asked for.
    expect(looks).toEqual([{ ink: "black", crossed: [1, 0, 0] }]);
    expect([timers.size, frames.size]).toEqual([1, 0]);
    to(379);
    expect(looks).toHaveLength(1);
    to(1);
    expect(looks.at(-1)).toEqual({ ink: "black", crossed: [1, 1, 0] });
    expect([timers.size, frames.size]).toEqual([1, 0]);
    to(319);
    expect(looks).toHaveLength(2);
    to(1);
    expect(looks.at(-1)).toEqual({ ink: "black", crossed: [1, 1, 1] });
    expect([timers.size, frames.size]).toEqual([1, 0]);
    // It still takes as long as the statement takes to say.
    to(439);
    expect(looks).toHaveLength(3);
    to(1);
    expect(looks.at(-1)).toEqual({ ink: "white", crossed: [0, 0, 0] });
    expect(looks).toHaveLength(4);
    // It woke five times in all and no more: to begin, at ARE, at FAKE, at the end, and it now waits out the rest.
    expect(waits.mock.calls.map(([, ms]) => ms)).toEqual([LEAD_MS, 380, 320, 440, SAID_MS]);
    // And it goes round as it does with motion: black next, a word at a time.
    to(SAID_MS);
    expect(looks.at(-1)).toEqual({ ink: "white", crossed: [1, 0, 0] });
    expect(frames.size).toBe(0);
  });

  it("finishes a crossing it was left in under reduced motion too, a word at a time", () => {
    const { statement, to, advance, looks, timers, frames } = started(true);
    to(100);
    statement.leave();
    advance(SAID_MS);
    expect(looks).toEqual([
      { ink: "black", crossed: [1, 0, 0] },
      { ink: "black", crossed: [1, 1, 0] },
      { ink: "black", crossed: [1, 1, 1] },
      { ink: "white", crossed: [0, 0, 0] },
    ]);
    expect([timers.size, frames.size]).toEqual([0, 0]);
  });

  it("follows the preference if it changes in the middle of a crossing, either way", () => {
    const toReduced = started();
    toReduced.to(100);
    expect(toReduced.latest()?.crossed[0]).toBeCloseTo(0.5556, 3);
    toReduced.state.reduced = true;
    // The next frame is the last: THESE is whole, and a timer waits for ARE.
    toReduced.to(16);
    expect(toReduced.latest()).toEqual({ ink: "black", crossed: [1, 0, 0] });
    expect([toReduced.timers.size, toReduced.frames.size]).toEqual([1, 0]);

    const toMotion = started(true);
    toMotion.to(400);
    expect(toMotion.latest()).toEqual({ ink: "black", crossed: [1, 1, 0] });
    toMotion.state.reduced = false;
    // At FAKE's beat it is back to frames, and FAKE is crossed by degrees.
    toMotion.to(300);
    expect([toMotion.timers.size, toMotion.frames.size]).toEqual([0, 1]);
    toMotion.to(220);
    expect(toMotion.latest()).toEqual({ ink: "black", crossed: [1, 1, 0.75] });
  });

  it("stops everything pending when it is destroyed: the wait, a crossing or a rest", () => {
    const waiting = setup();
    waiting.statement.enter();
    waiting.statement.destroy();
    expect([waiting.timers.size, waiting.frames.size]).toEqual([0, 0]);

    const crossing = started();
    crossing.to(200);
    const said = crossing.looks.length;
    crossing.statement.destroy();
    expect([crossing.timers.size, crossing.frames.size]).toEqual([0, 0]);
    crossing.advance(20_000);
    expect(crossing.looks).toHaveLength(said);

    const resting = started();
    resting.to(SAID_MS);
    resting.statement.destroy();
    expect([resting.timers.size, resting.frames.size]).toEqual([0, 0]);

    const stepping = started(true);
    stepping.statement.destroy();
    expect([stepping.timers.size, stepping.frames.size]).toEqual([0, 0]);
  });
});
