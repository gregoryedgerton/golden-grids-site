import { useSyncExternalStore } from "react";

/**
 * Whether the reader has chosen to play or stop the title's video: true,
 * false, or null while they have not chosen.
 *
 * It is kept here, outside the title cell, because the dial unmounts a cell
 * once it is a few steps behind. A choice kept in the cell would be forgotten
 * on a trip through the gallery, and a video the reader had stopped would
 * start again when they came back.
 */
let chosen: boolean | null = null;
const listeners = new Set<() => void>();

function subscribe(changed: () => void) {
  listeners.add(changed);
  return () => {
    listeners.delete(changed);
  };
}

const read = () => chosen;

export function chooseVideo(play: boolean | null): void {
  chosen = play;
  listeners.forEach((changed) => changed());
}

export function useVideoChoice(): boolean | null {
  return useSyncExternalStore(subscribe, read);
}
