import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, vi } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";
import { answer } from "./clip";
import { resetMedia } from "./media";

expect.extend(axeMatchers);

// jsdom has neither. The dial only needs to be told when its stage changes
// size, and tests call `paint` through the callback they are handed.
class ResizeObserverStub {
  static instances: ResizeObserverStub[] = [];
  observed: Element[] = [];
  disconnected = false;
  constructor(readonly callback: () => void) {
    ResizeObserverStub.instances.push(this);
  }
  observe(element: Element) {
    this.observed.push(element);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
}
Object.defineProperty(globalThis, "ResizeObserver", { value: ResizeObserverStub, writable: true });

// jsdom draws nothing, so it measures nothing. Every glyph is fifty units
// wide and a line a hundred tall, unless a test says otherwise.
Object.defineProperty(SVGElement.prototype, "getBBox", {
  writable: true,
  configurable: true,
  value(this: SVGElement) {
    return { x: 0, y: -80, width: (this.textContent as string).length * 50, height: 100 };
  },
});

// Nor does jsdom say where a character sits along its line. Each starts
// fifty units after the one before, as the box above has it.
Object.defineProperty(SVGElement.prototype, "getStartPositionOfChar", {
  writable: true,
  configurable: true,
  value: (index: number) => ({ x: index * 50, y: 0 }),
});
Object.defineProperty(SVGElement.prototype, "getEndPositionOfChar", {
  writable: true,
  configurable: true,
  value: (index: number) => ({ x: (index + 1) * 50, y: 0 }),
});

// jsdom fetches nothing and has no object URLs. A file fetched here arrives at
// once, and each address made for a showing of it is numbered from one in
// every test, so a test can tell one showing from the next.
let showings = 0;
Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  configurable: true,
  value: () => `blob:showing/${++showings}`,
});
Object.defineProperty(URL, "revokeObjectURL", { writable: true, configurable: true, value: () => {} });

// jsdom has dialogs but cannot show one as a modal. Here showing one opens
// it, and closing an open one says so, as a browser does; the top layer, the
// inert page behind it and Escape are the browser's own and are not tested.
Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
  writable: true,
  configurable: true,
  value(this: HTMLDialogElement) {
    this.open = true;
  },
});
Object.defineProperty(HTMLDialogElement.prototype, "close", {
  writable: true,
  configurable: true,
  value(this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event("close"));
  },
});

beforeEach(() => {
  showings = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => answer());
});

afterEach(() => {
  document.head.querySelectorAll("link[data-face]").forEach((link) => link.remove());
  cleanup();
  resetMedia();
  ResizeObserverStub.instances.length = 0;
});
