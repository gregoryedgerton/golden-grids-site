import type { DialClock } from "../dial/controller";

/**
 * The gallery's opening statement, THESE ARE FAKE, over time: which colour
 * it is, and how far the other colour has come across each of its words.
 *
 * It is said once each time the reader comes to its cell, beginning as the
 * dial lands there. White crosses the three words in turn, inside the letters
 * and from the left of each word; a word starts when it would be said and
 * takes as long as it takes to say. The statement rests white for as long
 * again, the time it takes to read it once more, black crosses it the same
 * way, and it stays black. It is not said again until the reader has left
 * the cell and come back.
 *
 * When the cell loses the focus, a crossing under way runs to its end and
 * the statement stays the colour it reached, white or black: it is never
 * left part one and part the other, and nothing more is said behind the
 * reader's back. A statement left white is crossed by black when the reader
 * returns, and that is all it then has to say. All of this holds while the
 * cell is off the dial too, which is why none of it lives in the cell.
 *
 * Under reduced motion nothing travels across a word. Each word takes the
 * new colour whole, on its beat.
 */

export type Ink = "black" | "white";

/**
 * When each word is said, in milliseconds from the start of the first: when
 * a colour starts across it and how long it takes. THESE, a breath, ARE, a
 * longer breath, and FAKE, which is leaned on.
 */
export const SPOKEN = [
  { at: 0, lasts: 300 },
  { at: 380, lasts: 220 },
  { at: 700, lasts: 440 },
] as const;

/** How long the statement takes to say: to the end of its last word. The rest between two crossings is as long again. */
export const SAID_MS = SPOKEN[2].at + SPOKEN[2].lasts;

/** What the statement looks like at one moment. */
export type Look = {
  /** The colour the statement is, or is leaving. */
  ink: Ink;
  /** How much of each word the other colour has crossed, from the word's left: 0 is none of it, 1 all. */
  crossed: number[];
};

const untouched = () => SPOKEN.map(() => 0);

/** The statement before anything has been said: black, as the rest of the cell is. */
export const AT_FIRST: Look = { ink: "black", crossed: untouched() };

export const opposite = (ink: Ink): Ink => (ink === "black" ? "white" : "black");

/** Fast, then slowing: a word is struck and then carried through. */
const struck = (t: number) => 1 - (1 - t) ** 2;

/**
 * How much of each word a colour has crossed, `elapsed` milliseconds into a
 * crossing. `stepped` is reduced motion: a word has none of the colour before
 * its beat and all of it from then on.
 */
export function crossedAt(elapsed: number, stepped: boolean): number[] {
  return SPOKEN.map(({ at, lasts }) => {
    if (elapsed < at) return 0;
    if (stepped || elapsed >= at + lasts) return 1;
    return struck((elapsed - at) / lasts);
  });
}

export type StatementOptions = {
  /** Read at every moment of a crossing, so a change of preference takes effect at once. */
  reduced: () => boolean;
  clock: DialClock;
};

/**
 * The statement, kept apart from the cell that shows it. The dial mounts only
 * the cells near the focus, so the cell comes and goes as the reader travels.
 * What is being said has to finish, and the colour it reached has to be kept,
 * whether or not anything is showing it at the time.
 */
export type Statement = {
  /**
   * The dial is landing on the statement's cell. The first time since the
   * cell last lost the focus, the statement is said, at once. Any other time
   * it is the dial stirring on a cell it never left, and nothing is said
   * again.
   */
  enter: () => void;
  /** The cell has lost the focus, or is off the dial: finish the crossing under way, and say no more. */
  leave: () => void;
  /** What it looks like now. The same object until it changes. */
  look: () => Look;
  /** Calls `changed` at every new look, until the function it returns is called. */
  subscribe: (changed: () => void) => () => void;
};

export function createStatement({ reduced, clock }: StatementOptions): Statement {
  let look = AT_FIRST;
  const watching = new Set<() => void>();
  /** Whether the reader has been away since the statement was last said to them, or has never been here. */
  let fresh = true;
  /** How many crossings are still to be made for the reader who is here, after the one under way. */
  let due = 0;
  /** When the crossing under way began, or null between crossings. */
  let began: number | null = null;
  /** The rest before a crossing, or the wait for the next beat of one under reduced motion. */
  let timer = 0;

  const show = (next: Look) => {
    look = next;
    for (const changed of [...watching]) changed();
  };

  /** One moment of a crossing: show how far it has come, and arrange the next. */
  const moment = () => {
    timer = 0;
    const elapsed = clock.now() - (began as number);
    if (elapsed >= SAID_MS) {
      began = null;
      show({ ink: opposite(look.ink), crossed: untouched() });
      // Rest in the colour just reached for as long as it took to say, then go on if there is more to say.
      if (due > 0) timer = clock.setTimer(cross, SAID_MS);
      return;
    }
    const stepped = reduced();
    const crossed = crossedAt(elapsed, stepped);
    if (crossed.some((share, word) => share !== look.crossed[word])) show({ ink: look.ink, crossed });
    if (stepped) {
      // Nothing changes until the next word's beat, or the end, so nothing runs until then.
      const next = SPOKEN.map(({ at }) => at).find((at) => at > elapsed) ?? SAID_MS;
      timer = clock.setTimer(moment, next - elapsed);
    } else {
      clock.requestFrame(moment);
    }
  };

  /** Begin one of the crossings that are due. */
  function cross() {
    due -= 1;
    began = clock.now();
    moment();
  }

  return {
    enter() {
      if (!fresh) return;
      fresh = false;
      // Black has to go white and come back. White, left so by a reader who
      // went before it was done, has only to come back.
      const ends = began === null ? look.ink : opposite(look.ink);
      due = ends === "black" ? 2 : 1;
      // At once, unless the crossing the reader left behind is still under way: then after it.
      if (began === null) cross();
    },
    leave() {
      fresh = true;
      due = 0;
      // A crossing under way is left to finish. Between crossings there is
      // nothing to finish, so the one that was to come is called off.
      if (began === null && timer) {
        clock.clearTimer(timer);
        timer = 0;
      }
    },
    look: () => look,
    subscribe(changed) {
      watching.add(changed);
      return () => void watching.delete(changed);
    },
  };
}
