import { createContext, useContext } from "react";

/** Whether the cell this is rendered in is the dial's focused cell. False outside a dial. */
export const CellCurrent = createContext(false);

/** For content that should only run while its cell is the one in focus: a video, a timer. */
export function useCellCurrent(): boolean {
  return useContext(CellCurrent);
}
