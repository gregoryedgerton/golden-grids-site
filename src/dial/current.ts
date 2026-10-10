import { createContext, useContext } from "react";

/** Whether the cell this is rendered in is the dial's focused cell. False outside a dial. */
export const CellCurrent = createContext(false);

/** For content that should only run while its cell is the one in focus: a video, a timer. */
export function useCellCurrent(): boolean {
  return useContext(CellCurrent);
}

/**
 * Whether the cell this is rendered in is the dial's focused cell and the
 * dial has come to rest on it. A cell is the focused one from half way
 * through the travel to it; it is at rest only once that travel is over.
 * False outside a dial.
 */
export const CellAtRest = createContext(false);

/** For content that should start only once its cell has locked into place. */
export function useCellAtRest(): boolean {
  return useContext(CellAtRest);
}
