import { fakeClock } from "../../test/clock";
import { AT_FIRST, SAID_MS, SPOKEN, createStatement, crossedAt, opposite } from "./statement";
import type { Look } from "./statement";

function setup(startReduced = false) {
  const fake = fakeClock();
  const state = { reduced: startReduced };
  const looks: Look[] = [];
  const statement = createStatement({ reduced: () => state.reduced, clock: fake.clock });
  statement.subscribe(() => looks.push(statement.look()));
  /** Move the clock on by exactly this much, in one step, so a look can be taken at a known moment. */
  const to = (ms: number) => fake.advance(ms, ms);
  const latest = () => looks.at(-1);
  /** What is pending: timers, then frames. */
  const pending = () => [fake.timers.size, fake.frames.size];
  return { ...fake, to, statement, state, looks, latest, pending };
}

/** The dial has just landed on the cell: the first crossing is at its very start. */
function started(startReduced = false) {
  const made = setup(startReduced);
  made.statement.enter();
  return made;
}

const WHITE: Look = { ink: "white", crossed: [0, 0, 0] };
const BLACK: Look = { ink: "black", crossed: [0, 0, 0] };

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
    // White, a rest, and black: all of it is over inside five seconds.
    expect(3 * SAID_MS).toBeLessThan(5000);
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
    expect(AT_FIRST).toEqual(BLACK);
    expect(opposite("black")).toBe("white");
    expect(opposite("white")).toBe("black");
  });
});

describe("the statement", () => {
  it("says nothing until the dial lands on its cell", () => {
    const { advance, looks, pending } = setup();
    advance(10_000);
    expect(looks).toEqual([]);
    expect(pending()).toEqual([0, 0]);
  });

  it("begins the moment the dial lands, with no wait, and crosses THESE, ARE and FAKE with white in turn", () => {
    const { statement, to, looks, latest, pending } = setup();
    statement.enter();
    // Under way already: a frame is asked for, and nothing is waited on.
    expect(pending()).toEqual([0, 1]);
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
    expect(latest()).toEqual(WHITE);
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

  it("rests white for as long as it took to say, is crossed by black the same way, and then stays black: it is said once", () => {
    const { statement, to, advance, looks, latest, pending, clock } = started();
    const cancelled = vi.spyOn(clock, "clearTimer");
    to(SAID_MS);
    expect(latest()).toEqual(WHITE);
    const said = looks.length;

    // The rest: one timer, no frames, nothing shown.
    expect(pending()).toEqual([1, 0]);
    to(SAID_MS - 1);
    expect(looks).toHaveLength(said);
    expect(pending()).toEqual([1, 0]);

    // Black, crossing white.
    to(1);
    to(150);
    expect(latest()).toEqual({ ink: "white", crossed: [0.75, 0, 0] });
    to(SAID_MS - 150);
    expect(latest()).toEqual(BLACK);

    // Back to black, and that is the end of it: nothing pending, nothing more shown, however long the reader stays.
    const done = looks.length;
    expect(pending()).toEqual([0, 0]);
    advance(120_000);
    expect(looks).toHaveLength(done);
    expect(pending()).toEqual([0, 0]);
    // The reader goes at last. Nothing was waiting, so nothing is called off: the rest it once waited out is long over.
    statement.leave();
    expect(cancelled).not.toHaveBeenCalled();
  });

  it("is not said again by the dial stirring on a cell the reader never left", () => {
    const { statement, to, advance, looks, pending } = started();
    // While it is being said, landing again changes nothing: one frame pending, as before.
    to(200);
    statement.enter();
    expect(pending()).toEqual([0, 1]);
    // While it rests white: the one rest, as before.
    to(SAID_MS);
    statement.enter();
    expect(pending()).toEqual([1, 0]);
    // And when it is done.
    advance(3 * SAID_MS);
    expect(looks.at(-1)).toEqual(BLACK);
    const done = looks.length;
    statement.enter();
    statement.enter();
    expect(pending()).toEqual([0, 0]);
    advance(60_000);
    expect(looks).toHaveLength(done);
  });

  it("is said again, from the start, to a reader who has left the cell and come back", () => {
    const { statement, to, advance, latest, pending } = started();
    advance(4 * SAID_MS);
    expect(latest()).toEqual(BLACK);
    statement.leave();
    advance(30_000);
    statement.enter();
    expect(pending()).toEqual([0, 1]);
    to(150);
    expect(latest()).toEqual({ ink: "black", crossed: [0.75, 0, 0] });
    to(SAID_MS - 150);
    expect(latest()).toEqual(WHITE);
    to(SAID_MS);
    to(SAID_MS);
    expect(latest()).toEqual(BLACK);
    expect(pending()).toEqual([0, 0]);
  });

  it("finishes the crossing under way when its cell loses the focus, and then stays the colour it reached", () => {
    const { statement, to, advance, looks, latest, pending } = started();
    to(400);
    expect(latest()).toEqual({ ink: "black", crossed: [1, expect.closeTo(0.174, 3), 0] });
    statement.leave();

    // It goes on to the end of FAKE, a frame at a time.
    const left = looks.length;
    advance(SAID_MS - 400);
    expect(looks.length).toBeGreaterThan(left + 10);
    expect(latest()).toEqual(WHITE);

    // And that is all: nothing is pending, and no black follows however long it is left.
    const said = looks.length;
    expect(pending()).toEqual([0, 0]);
    advance(20_000);
    expect(looks).toHaveLength(said);
  });

  it("is never left part white and part black", () => {
    for (const leftAt of [1, 150, 299, 300, 380, 500, 650, 700, 900, SAID_MS - 1]) {
      const { statement, to, advance, latest } = started();
      to(leftAt);
      statement.leave();
      advance(10_000);
      expect(latest()).toEqual(WHITE);
    }
    // Nor when it is left while black is crossing it.
    for (const leftAt of [1, 300, 650, SAID_MS - 1]) {
      const { statement, to, advance, latest, pending } = started();
      to(SAID_MS);
      to(SAID_MS);
      to(leftAt);
      statement.leave();
      advance(10_000);
      expect(latest()).toEqual(BLACK);
      expect(pending()).toEqual([0, 0]);
    }
  });

  it("calls off the black crossing if its cell loses the focus while it rests white", () => {
    const { statement, to, advance, looks, latest, pending } = started();
    to(SAID_MS);
    to(SAID_MS / 2);
    statement.leave();
    expect(pending()).toEqual([0, 0]);
    const said = looks.length;
    advance(20_000);
    expect(looks).toHaveLength(said);
    expect(latest()).toEqual(WHITE);
  });

  it("is crossed by black alone, at once, for a reader who comes back to it left white", () => {
    const { statement, to, advance, looks, latest, pending } = started();
    to(500);
    statement.leave();
    advance(5_000);
    expect(latest()).toEqual(WHITE);

    statement.enter();
    expect(pending()).toEqual([0, 1]);
    to(150);
    expect(latest()).toEqual({ ink: "white", crossed: [0.75, 0, 0] });
    to(SAID_MS - 150);
    expect(latest()).toEqual(BLACK);
    // It had only to come back. No white follows.
    const done = looks.length;
    expect(pending()).toEqual([0, 0]);
    advance(20_000);
    expect(looks).toHaveLength(done);
  });

  it("goes on to black for a reader who is back before the white crossing they left has finished", () => {
    const { statement, to, advance, looks, latest, pending } = started();
    to(300);
    statement.leave();
    to(200);
    statement.enter();
    // Nothing new is begun: the crossing under way is the one that counts.
    expect(pending()).toEqual([0, 1]);
    to(SAID_MS - 500);
    expect(latest()).toEqual(WHITE);
    expect(pending()).toEqual([1, 0]);
    to(SAID_MS);
    to(150);
    expect(latest()).toEqual({ ink: "white", crossed: [0.75, 0, 0] });
    to(SAID_MS - 150);
    expect(latest()).toEqual(BLACK);
    const done = looks.length;
    advance(20_000);
    expect(looks).toHaveLength(done);
    expect(pending()).toEqual([0, 0]);
  });

  it("is said afresh, with no rest first, to a reader who is back before the black crossing they left has finished", () => {
    const { statement, to, advance, looks, latest, pending, clock } = started();
    const waits = vi.spyOn(clock, "setTimer");
    to(SAID_MS);
    to(SAID_MS);
    to(300);
    statement.leave();
    to(100);
    statement.enter();
    expect(pending()).toEqual([0, 1]);
    // The black crossing they left finishes, and white starts across it in the same moment: a frame, and no timer.
    to(SAID_MS - 400);
    expect(latest()).toEqual(BLACK);
    expect(pending()).toEqual([0, 1]);
    to(150);
    expect(latest()).toEqual({ ink: "black", crossed: [0.75, 0, 0] });
    to(SAID_MS - 150);
    expect(latest()).toEqual(WHITE);
    // White rests, as it always does, and black ends it.
    expect(pending()).toEqual([1, 0]);
    to(SAID_MS);
    to(SAID_MS);
    expect(latest()).toEqual(BLACK);
    const done = looks.length;
    expect(pending()).toEqual([0, 0]);
    advance(20_000);
    expect(looks).toHaveLength(done);
    // Two rests were waited out in all, each after white: the first saying's and the second's.
    expect(waits.mock.calls.map(([, ms]) => ms)).toEqual([SAID_MS, SAID_MS]);
  });

  it("goes straight on to that fresh saying under reduced motion too: black to the last word, and THESE white with it", () => {
    const { statement, to, looks, pending } = started(true);
    to(SAID_MS);
    to(SAID_MS);
    to(400);
    statement.leave();
    statement.enter();
    const before = looks.length;
    to(300);
    to(440);
    // FAKE went black on its beat, the crossing ended, and the next began with THESE: one timer, for ARE's beat.
    expect(looks.slice(before)).toEqual([
      { ink: "white", crossed: [1, 1, 1] },
      BLACK,
      { ink: "black", crossed: [1, 0, 0] },
    ]);
    expect(pending()).toEqual([1, 0]);
  });

  it("changes each word whole, on its beat, when motion is reduced, and runs nothing in between", () => {
    const { statement, to, advance, looks, pending, clock } = setup(true);
    const waits = vi.spyOn(clock, "setTimer");
    statement.enter();
    // THESE at once, and then a timer for ARE's beat: no frame is ever asked for.
    expect(looks).toEqual([{ ink: "black", crossed: [1, 0, 0] }]);
    expect(pending()).toEqual([1, 0]);
    to(379);
    expect(looks).toHaveLength(1);
    to(1);
    expect(looks.at(-1)).toEqual({ ink: "black", crossed: [1, 1, 0] });
    expect(pending()).toEqual([1, 0]);
    to(319);
    expect(looks).toHaveLength(2);
    to(1);
    expect(looks.at(-1)).toEqual({ ink: "black", crossed: [1, 1, 1] });
    expect(pending()).toEqual([1, 0]);
    // It still takes as long as the statement takes to say.
    to(439);
    expect(looks).toHaveLength(3);
    to(1);
    expect(looks.at(-1)).toEqual(WHITE);
    expect(looks).toHaveLength(4);
    // Then black the same way, a word at a time, and it is done.
    to(SAID_MS);
    expect(looks.at(-1)).toEqual({ ink: "white", crossed: [1, 0, 0] });
    to(380);
    to(320);
    to(440);
    expect(looks.at(-1)).toEqual(BLACK);
    expect(looks).toHaveLength(8);
    // It woke at ARE, at FAKE and at the end of each crossing, and once between the two. Never for a frame.
    expect(waits.mock.calls.map(([, ms]) => ms)).toEqual([380, 320, 440, SAID_MS, 380, 320, 440]);
    expect(pending()).toEqual([0, 0]);
    advance(20_000);
    expect(looks).toHaveLength(8);
  });

  it("finishes a crossing it was left in under reduced motion too, a word at a time", () => {
    const { statement, to, advance, looks, pending } = started(true);
    to(100);
    statement.leave();
    advance(SAID_MS);
    expect(looks).toEqual([
      { ink: "black", crossed: [1, 0, 0] },
      { ink: "black", crossed: [1, 1, 0] },
      { ink: "black", crossed: [1, 1, 1] },
      WHITE,
    ]);
    expect(pending()).toEqual([0, 0]);
  });

  it("follows the preference if it changes in the middle of a crossing, either way", () => {
    const toReduced = started();
    toReduced.to(100);
    expect(toReduced.latest()?.crossed[0]).toBeCloseTo(0.5556, 3);
    toReduced.state.reduced = true;
    // The next frame is the last: THESE is whole, and a timer waits for ARE.
    toReduced.to(16);
    expect(toReduced.latest()).toEqual({ ink: "black", crossed: [1, 0, 0] });
    expect(toReduced.pending()).toEqual([1, 0]);

    const toMotion = started(true);
    toMotion.to(400);
    expect(toMotion.latest()).toEqual({ ink: "black", crossed: [1, 1, 0] });
    toMotion.state.reduced = false;
    // At FAKE's beat it is back to frames, and FAKE is crossed by degrees.
    toMotion.to(300);
    expect(toMotion.pending()).toEqual([0, 1]);
    toMotion.to(220);
    expect(toMotion.latest()).toEqual({ ink: "black", crossed: [1, 1, 0.75] });
  });

  it("shows one look until it changes: black at first, and a new one at each change", () => {
    const { statement, to } = setup();
    const first = statement.look();
    expect(first).toBe(AT_FIRST);
    statement.enter();
    // Begun, with nothing crossed yet: still the look it had.
    expect(statement.look()).toBe(first);
    to(150);
    const crossing = statement.look();
    expect(crossing).not.toBe(first);
    expect(crossing).toEqual({ ink: "black", crossed: [0.75, 0, 0] });
    expect(statement.look()).toBe(crossing);
    // What was handed out earlier is not changed under whoever holds it.
    to(SAID_MS);
    expect(first).toEqual(BLACK);
    expect(crossing).toEqual({ ink: "black", crossed: [0.75, 0, 0] });
  });

  it("tells whoever is watching of each new look, and stops telling one that has stopped watching", () => {
    const { statement, to } = setup();
    const told = { one: 0, other: 0 };
    const stop = statement.subscribe(() => void told.one++);
    statement.subscribe(() => void told.other++);
    statement.enter();
    to(150);
    expect(told).toEqual({ one: 1, other: 1 });
    stop();
    to(150);
    to(SAID_MS);
    expect(told.one).toBe(1);
    expect(told.other).toBeGreaterThan(2);
  });

  it("finishes what it is saying and keeps the colour it reached with nothing watching it at all", () => {
    const fake = fakeClock();
    const statement = createStatement({ reduced: () => false, clock: fake.clock });
    const stop = statement.subscribe(() => {});
    statement.enter();
    fake.advance(400);
    // The cell is taken off the dial in the middle of a crossing.
    stop();
    statement.leave();
    fake.advance(SAID_MS);
    expect(statement.look()).toEqual(WHITE);
    expect([fake.timers.size, fake.frames.size]).toEqual([0, 0]);
    // It is still white when the cell is put back, however much later, and black is what it then has to say.
    fake.advance(60_000);
    expect(statement.look()).toEqual(WHITE);
    statement.enter();
    fake.advance(150, 150);
    expect(statement.look()).toEqual({ ink: "white", crossed: [0.75, 0, 0] });
  });
});
