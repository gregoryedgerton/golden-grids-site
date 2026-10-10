import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(changed: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
}

const read = () => window.matchMedia(QUERY).matches;

/** Whether the reader has asked for reduced motion. Follows the setting while the page is open. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read);
}
