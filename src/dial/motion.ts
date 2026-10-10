import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(changed: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
}

/** Whether the reader has asked for reduced motion, as the setting stands now. For what runs outside a component. */
export const prefersReducedMotion = () => window.matchMedia(QUERY).matches;

/** Whether the reader has asked for reduced motion. Follows the setting while the page is open. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion);
}
