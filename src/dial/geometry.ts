import {
  generateGoldenGridLayout,
  spiralCamera,
  spiralWindow,
  tileOnScreen,
  toCssContentTransform,
  toCssTileTransform,
  trailToRotateDeg,
} from "@gifcommit/golden-grids";
import type { GridLayout, SpiralTrail } from "@gifcommit/golden-grids";

/**
 * The dial's geometry: where every cell sits on screen at a given depth.
 *
 * The gallery is meant to pass a hundred cells, and one Fibonacci layout that
 * long cannot be drawn: past the 78th term the sides no longer fit a double's
 * integers, and the unit squares at the eye lose their positions. So the dial
 * lays out one fixed run of squares and never grows it. A golden spiral is
 * self-similar: four steps deeper is one full turn, and the picture is the
 * same picture. The camera therefore stays within one turn of the run, and
 * every four steps the cells move four squares along it. Away from the eye
 * the two pictures agree to a billionth of a pixel, and the run is long
 * enough that the dial never comes near the eye.
 */

/** Squares in the run. Far more than are ever on screen. */
export const SQUARES = 36;
/** One full turn of the spiral, in steps. */
export const TURN = 4;
/** The side, in CSS pixels, of the box every cell is rendered into. */
export const TEXTURE_PX = 1000;
/** Cells kept mounted behind the focus. The window fades a square out by its third step outward. */
export const BEHIND = 2;
/** Cells kept mounted ahead of the focus. The twelfth is under three pixels on a large screen. */
export const AHEAD = 12;
/** The camera's depth along the run stays in [LEAD, LEAD + TURN) once it has passed it. */
const LEAD = 3;

function fibonacci(n: number): number[] {
  const seq = [1, 1];
  for (let i = 2; i < n; i++) seq.push((seq[i - 1] as number) + (seq[i - 2] as number));
  return seq;
}

const layouts = new Map<SpiralTrail, GridLayout>();

/** The run, laid out so that the cells ahead of the focus trail into `trail`. */
export function layoutFor(trail: SpiralTrail): GridLayout {
  let layout = layouts.get(trail);
  if (!layout) {
    layout = generateGoldenGridLayout(fibonacci(SQUARES), true, trailToRotateDeg(trail, true, SQUARES));
    layouts.set(trail, layout);
  }
  return layout;
}

/** The side of the focused square the rest of the spiral grows into: the stage's longer one. */
export function trailFor(width: number, height: number): SpiralTrail {
  return width >= height ? "right" : "bottom";
}

/**
 * Splits the dial's depth into the camera's depth along the run and the
 * number of squares the cells have moved along it, always a whole number of
 * turns.
 */
export function placeAt(depth: number): { local: number; shift: number } {
  const shift = TURN * Math.max(0, Math.floor((depth - LEAD) / TURN));
  return { local: depth - shift, shift };
}

/** The cells to keep mounted around a focus, in order. */
export function mountedAround(focus: number, count: number): number[] {
  const first = Math.max(0, focus - BEHIND);
  const last = Math.min(count - 1, focus + AHEAD);
  const cells: number[] = [];
  for (let i = first; i <= last; i++) cells.push(i);
  return cells;
}

export type TilePaint = {
  /** The cell's box: the camera composed with the square's place on the spiral. */
  transform: string;
  /** For the cell's content, which is held level while its box turns. */
  content: string;
  opacity: number;
  visible: boolean;
};

/** How to draw cell `index` when the dial is at `depth` on a stage of the given size. */
export function paintTile(index: number, depth: number, width: number, height: number): TilePaint {
  const { local, shift } = placeAt(depth);
  const layout = layoutFor(trailFor(width, height));
  // The run is drawn largest first: depth 0 focuses its last square.
  const k = SQUARES - 1 - (index - shift);
  const square = layout.squares[k];
  if (!square) return { transform: "none", content: "none", opacity: 0, visible: false };
  // The focused square fills the stage's shorter side and is pinned into the
  // top-left corner, so all the leftover room lies on one side and the cells
  // ahead grow into it.
  const frame = spiralCamera(layout, local, width, height, { fillRatio: 1 });
  const half = Math.min(width, height) / 2;
  const anchor = { x: half, y: half };
  const { opacity, hidden } = spiralWindow(k, local, SQUARES);
  const onScreen = tileOnScreen(frame, square, width, height, { anchor });
  const drawable = square.size * frame.scale >= 2;
  return {
    transform: toCssTileTransform(frame, square, width, height, { anchor, texturePx: TEXTURE_PX }),
    // No cover swell: the content is type, and type must not be cropped at rest.
    content: toCssContentTransform(frame, { cover: false }),
    opacity,
    visible: !hidden && onScreen && drawable,
  };
}
