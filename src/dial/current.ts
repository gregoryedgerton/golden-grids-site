import { createContext, useContext } from "react";

/** Whether the cell this is rendered in is the dial's focused cell. False outside a dial. */
export const CellCurrent = createContext(false);

/** For content that should only run while its cell is the one in focus: a clip, a timer. */
export function useCellCurrent(): boolean {
  return useContext(CellCurrent);
}

/**
 * Whether the dial is landing on the cell this is rendered in: the cell is
 * the focused one, and the dial is at rest on it or on its way to rest on it
 * with nothing holding it. Not so for a cell the dial is passing on its way
 * to another, nor for one under a finger, which may yet go either way. False
 * outside a dial.
 */
export const CellLanding = createContext(false);

/** For content that should start as its cell arrives to stay. */
export function useCellLanding(): boolean {
  return useContext(CellLanding);
}

/**
 * A way for a cell's content to bring the dial to rest on its cell at once,
 * before it opens something modal over the page, so nothing goes on moving
 * behind it. Outside a dial there is nothing to stop, and it does nothing.
 */
export const DialRest = createContext<() => void>(() => {});

/** For content that is about to open something modal. */
export function useDialRest(): () => void {
  return useContext(DialRest);
}
