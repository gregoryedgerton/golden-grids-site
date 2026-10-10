/**
 * What each kind of input means to the dial. No calibration: up or left goes
 * deeper, down or right goes back, on every device.
 */

/** Finger travel, in CSS pixels, before a touch is a swipe and has an axis. */
export const SLOP_PX = 8;
/** Wheel travel, in CSS pixels, that turns the dial one step. */
export const WHEEL_PX = 800;
/** The share of the stage's shorter side a finger travels to turn the dial one step. */
export const DRAG_SHARE = 0.6;

export type Axis = "x" | "y";

export type KeyMove = { by: number } | { to: "first" | "last" };

/** The move a key asks for, or null if the key is not the dial's. */
export function keyMove(key: string): KeyMove | null {
  switch (key) {
    case "ArrowDown":
    case "ArrowRight":
    case "PageDown":
    case " ":
      return { by: 1 };
    case "ArrowUp":
    case "ArrowLeft":
    case "PageUp":
      return { by: -1 };
    case "Home":
      return { to: "first" };
    case "End":
      return { to: "last" };
    default:
      return null;
  }
}

/** Whether a key pressed on this element belongs to the element rather than to the dial. */
export function ownsKey(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select, [contenteditable]")) return true;
  // Space presses a button and follows nothing else; it must still press it.
  return key === " " && target.closest("button, a, summary") !== null;
}

/** Whether a touch that starts on this element is left to the element: text is selected by dragging. */
export function ownsDrag(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("input, textarea, select, [contenteditable]") !== null;
}

/** The axis a swipe has taken, once it has travelled far enough to have one. */
export function swipeAxis(dx: number, dy: number): Axis | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SLOP_PX) return null;
  return Math.abs(dx) > Math.abs(dy) ? "x" : "y";
}

/** Steps for a finger's travel along its axis. Up and left are deeper. */
export function dragSteps(travel: number, width: number, height: number): number {
  return -travel / (Math.min(width, height) * DRAG_SHARE);
}

/** Lines and pages of wheel travel, in CSS pixels. */
const LINE_PX = 16;

/**
 * Steps for one wheel event. Scrolling down or right is deeper. The larger
 * of the two deltas is the gesture; the other is the hand's drift.
 */
export function wheelSteps(deltaX: number, deltaY: number, deltaMode: number, pagePx: number): number {
  const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
  const unit = deltaMode === 1 ? LINE_PX : deltaMode === 2 ? pagePx : 1;
  return (delta * unit) / WHEEL_PX;
}
