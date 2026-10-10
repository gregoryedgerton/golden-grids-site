/** A `matchMedia` for the one query the site asks: whether motion is reduced. */
let reduced = false;
const listeners = new Set<() => void>();

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    media: query,
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }),
});

export function setReducedMotion(value: boolean) {
  reduced = value;
  listeners.forEach((listener) => listener());
}

export function mediaListeners() {
  return listeners.size;
}

export function resetMedia() {
  reduced = false;
  listeners.clear();
}
