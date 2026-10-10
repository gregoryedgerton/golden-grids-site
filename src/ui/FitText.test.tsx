import { act, render } from "@testing-library/react";
import { FitText } from "./FitText";

const svg = (container: HTMLElement) => container.querySelector("svg") as SVGSVGElement;
const groups = (container: HTMLElement) => [...container.querySelectorAll("g")].map((g) => g.getAttribute("transform"));

/** Measure every glyph as `per` units wide in a line `height` tall, with the box starting at (x, y). */
function measureAs(per: number, height = 100, x = 0, y = -80) {
  return vi.spyOn(SVGElement.prototype as unknown as { getBBox: () => DOMRect }, "getBBox").mockImplementation(function (
    this: SVGElement,
  ) {
    return { x, y, width: (this.textContent as string).length * per, height } as DOMRect;
  });
}

/** A stand-in for `document.fonts`. */
function fakeFonts() {
  const listeners = new Set<() => void>();
  let ready!: () => void;
  const fonts = {
    ready: new Promise<void>((resolve) => {
      ready = resolve;
    }),
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  Object.defineProperty(document, "fonts", { value: fonts, configurable: true });
  return {
    listeners,
    ready,
    loaded: () => listeners.forEach((listener) => listener()),
    remove: () => delete (document as { fonts?: unknown }).fonts,
  };
}

describe("FitText", () => {
  it("is a drawing, hidden from assistive technology, with the caller's class beside its own", () => {
    const { container, rerender } = render(<FitText lines={["Golden"]} />);
    expect(svg(container)).toHaveAttribute("aria-hidden", "true");
    expect(svg(container)).toHaveAttribute("focusable", "false");
    expect(svg(container)).toHaveAttribute("class", "fit");
    rerender(<FitText lines={["Golden"]} className="name" />);
    expect(svg(container)).toHaveAttribute("class", "fit name");
    expect(container).toHaveTextContent("Golden");
  });

  it("scales every line to the same width and stacks them", () => {
    // "ab" measures 100 wide and "abcd" 200, both 100 tall with the box 80 above the baseline.
    const { container } = render(<FitText lines={["ab", "abcd"]} />);
    // Scaled by 10 and by 5 to a width of 1000; 1000 tall, then 500.
    expect(groups(container)).toEqual(["translate(0 800) scale(10)", "translate(0 1400) scale(5)"]);
    expect(svg(container)).toHaveAttribute("viewBox", "0 0 1000 1500");
    expect(svg(container)).toHaveAttribute("preserveAspectRatio", "xMidYMid meet");
  });

  it("moves each line so its measured box, not its origin, starts at the left edge", () => {
    measureAs(50, 100, 12, -70);
    const { container } = render(<FitText lines={["ab"]} />);
    expect(groups(container)).toEqual(["translate(-120 700) scale(10)"]);
  });

  it("closes the lines up by the leading, without cutting the last one short", () => {
    const { container } = render(<FitText lines={["ab", "abcd"]} leading={0.5} />);
    expect(groups(container)).toEqual(["translate(0 800) scale(10)", "translate(0 900) scale(5)"]);
    expect(svg(container)).toHaveAttribute("viewBox", "0 0 1000 1000");
  });

  it("draws copies behind each line, stepping away, and makes room for them", () => {
    const { container } = render(<FitText lines={["ab"]} extrude={2} />);
    const shadows = [...container.querySelectorAll(".fit__shadow")];
    // Offsets are in the line's own units: 8 and 4 of the drawing's, at a scale of 10.
    expect(shadows.map((s) => [s.getAttribute("x"), s.getAttribute("y")])).toEqual([
      ["0.8", "0.8"],
      ["0.4", "0.4"],
    ]);
    expect(shadows.every((s) => s.textContent === "ab")).toBe(true);
    expect(svg(container)).toHaveAttribute("viewBox", "0 0 1008 1008");
    // The line itself is drawn last, on top, and is the one that is measured.
    const texts = [...container.querySelectorAll("text")];
    expect(texts.at(-1)).not.toHaveClass("fit__shadow");
  });

  it("keeps a guess while a line cannot be measured", () => {
    for (const [per, height] of [
      [0, 100],
      [50, 0],
    ] as const) {
      measureAs(per, height);
      const { container, unmount } = render(<FitText lines={["abcde", ""]} />);
      // Five glyphs guessed at 58 units each; an empty line guessed as one glyph.
      const scale = 1000 / (5 * 58);
      expect(groups(container)[0]).toBe(`translate(0 ${80 * scale}) scale(${scale})`);
      expect(groups(container)[1]).toBe(`translate(0 ${100 * scale + 80 * (1000 / 58)}) scale(${1000 / 58})`);
      unmount();
    }
  });

  it("measures again when the words change", () => {
    const { container, rerender } = render(<FitText lines={["ab"]} />);
    rerender(<FitText lines={["abcd", "ab"]} />);
    expect(groups(container)).toEqual(["translate(0 400) scale(5)", "translate(0 1300) scale(10)"]);
    rerender(<FitText lines={["ab"]} />);
    expect(groups(container)).toEqual(["translate(0 800) scale(10)"]);
  });

  it("measures again when a face arrives, and stops listening when removed", async () => {
    const fonts = fakeFonts();
    try {
      const { container, unmount } = render(<FitText lines={["ab"]} />);
      expect(fonts.listeners.size).toBe(1);
      const measure = measureAs(25);
      act(() => fonts.loaded());
      expect(groups(container)).toEqual(["translate(0 1600) scale(20)"]);
      // The faces already loaded when the page opened.
      measureAs(100);
      await act(async () => fonts.ready());
      expect(groups(container)).toEqual(["translate(0 400) scale(5)"]);
      // A face that changes nothing draws nothing new.
      const before = container.querySelector("g");
      act(() => fonts.loaded());
      expect(container.querySelector("g")).toBe(before);
      unmount();
      expect(fonts.listeners.size).toBe(0);
      expect(measure).toHaveBeenCalled();
    } finally {
      fonts.remove();
    }
  });

  it("does not measure for a face that arrives after it has been removed", async () => {
    const fonts = fakeFonts();
    try {
      const { unmount } = render(<FitText lines={["ab"]} />);
      unmount();
      const measure = measureAs(25);
      await act(async () => fonts.ready());
      expect(measure).not.toHaveBeenCalled();
    } finally {
      fonts.remove();
    }
  });
});
