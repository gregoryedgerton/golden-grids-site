import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";
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

afterEach(() => {
  cleanup();
  resetMedia();
  ResizeObserverStub.instances.length = 0;
});
