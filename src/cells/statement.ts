import type { DialClock } from "../dial/controller";

/**
 * The gallery's opening statement, THESE ARE FAKE, over time: which colour
 * it is, and how far the other colour has come across each of its words.
 *
 * While its cell has the focus the statement is said over and over. A colour
 * crosses the three words in turn, inside the letters and from the left of
 * each word; a word starts when it would be said and takes as long as it
 * takes to say. The statement then rests in that colour for as long again,
 * the time it takes to read it once more, and the other colour crosses it
 * the same way. White comes first, then black, and round.
 *
 * It starts once the dial has come to rest on the cell. When the cell loses
 * the focus, a crossing under way runs to its end and the statement stays
 * the colour it reached, white or black: it is never left part one and part
 * the other, and it does not go on behind the reader's back.
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

/** How long the statement takes to say: to the end of its last word. Each rest is as long again. */
export const SAID_MS = SPOKEN[2].at + SPOKEN[2].lasts;

/**
 * From the dial coming to rest on the cell to the first word. Short: the dial
 * is told it has arrived a little after it looks still, and the first word
 * should seem to answer the cell locking into place.
 */
export const LEAD_MS = 120;

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
  /** Called with every new look. */
  onLook: (look: Look) => void;
  clock: DialClock;
};

export type StatementController = {
  /** The dial has come to rest on the statement's cell: say it, and keep saying it. */
  enter: () => void;
  /** The cell has lost the focus: finish what is being said, and say no more. */
  leave: () => void;
  /** Stop everything pending. */
  destroy: () => void;
};

export function createStatement({ reduced, onLook, clock }: StatementOptions): StatementController {
  let ink: Ink = "black";
  let crossed = untouched();
  /** Whether the cell has the focus, so the statement is to be said again after each rest. */
  let wanted = false;
  /** When the crossing under way began, or null between crossings. */
  let began: number | null = null;
  let frame = 0;
  let timer = 0;

  /** Rest in the colour just reached for as long as it took to say, then say it again. */
  const finish = () => {
    began = null;
    ink = opposite(ink);
    crossed = untouched();
    onLook({ ink, crossed });
    if (wanted) timer = clock.setTimer(begin, SAID_MS);
  };

  /** One moment of a crossing: show how far it has come, and arrange the next. */
  const moment = () => {
    frame = 0;
    timer = 0;
    const elapsed = clock.now() - (began as number);
    if (elapsed >= SAID_MS) {
      finish();
      return;
    }
    const stepped = reduced();
    const now = crossedAt(elapsed, stepped);
    if (now.some((share, word) => share !== crossed[word])) {
      crossed = now;
      onLook({ ink, crossed });
    }
    if (stepped) {
      // Nothing changes until the next word's beat, or the end, so nothing runs until then.
      const next = SPOKEN.map(({ at }) => at).find((at) => at > elapsed) ?? SAID_MS;
      timer = clock.setTimer(moment, next - elapsed);
    } else {
      frame = clock.requestFrame(moment);
    }
  };

  function begin() {
    began = clock.now();
    moment();
  }

  return {
    enter() {
      wanted = true;
      // Already being said, or about to be.
      if (began !== null || timer) return;
      timer = clock.setTimer(begin, LEAD_MS);
    },
    leave() {
      wanted = false;
      // A crossing under way is left to finish. Between crossings there is
      // nothing to finish, so the one that was to come is called off.
      if (began === null && timer) {
        clock.clearTimer(timer);
        timer = 0;
      }
    },
    destroy() {
      if (frame) clock.cancelFrame(frame);
      if (timer) clock.clearTimer(timer);
      frame = 0;
      timer = 0;
    },
  };
}
