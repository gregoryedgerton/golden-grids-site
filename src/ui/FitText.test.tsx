import { act, render } from "@testing-library/react";
import { FitText } from "./FitText";

const svg = (container: HTMLElement) => container.querySelector("svg") as SVGSVGElement;
const groups = (container: HTMLElement) =>
  [...container.querySelectorAll("g.fit__line")].map((g) => g.getAttribute("transform"));

/** Measure every glyph as `per` units wide in a line `height` tall, with the box starting at (x, y). */
function measureAs(per: number, height = 100, x = 0, y = -80) {
  return vi.spyOn(SVGElement.prototype as unknown as { getBBox: () => DOMRect }, "getBBox").mockImplementation(function (
    this: SVGElement,
  ) {
    return { x, y, width: (this.textContent as string).length * per, height } as DOMRect;
  });
}

type Observer = { callback: () => void; observed: Element[]; disconnected: boolean };
/** The resize observers made so far, which a test fires by hand. */
const observers = () => (ResizeObserver as unknown as { instances: Observer[] }).instances;
/** Tell every live observer that what it watches has changed size, as a browser does after layout. */
const resized = () => act(() => observers().filter((o) => !o.disconnected).forEach((o) => o.callback()));

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

  it("draws the copies down and to the left for a negative depth, and makes room on that side", () => {
    const { container } = render(<FitText lines={["ab"]} extrude={-2} />);
    const shadows = [...container.querySelectorAll(".fit__shadow")];
    expect(shadows.map((s) => [s.getAttribute("x"), s.getAttribute("y")])).toEqual([
      ["-0.8", "0.8"],
      ["-0.4", "0.4"],
    ]);
    expect(svg(container)).toHaveAttribute("viewBox", "-8 0 1008 1008");
  });

  it("starts an indented line that many ems in, and still ends it at the full width", () => {
    // "ab" is 100 wide; half an em of indent is 50 more, so it is scaled to fit 150.
    const { container } = render(<FitText lines={["ab", "ab"]} indent={[0.5]} />);
    const scale = 1000 / 150;
    expect(groups(container)[0]).toBe(`translate(${50 * scale} ${80 * scale}) scale(${scale})`);
    // A line with no indent given has none.
    expect(groups(container)[1]).toBe(`translate(0 ${100 * scale + 800}) scale(10)`);
  });

  it("sets every line at the size of the longest when uniform, so shorter lines stop short", () => {
    const { container } = render(<FitText lines={["abcd", "ab"]} uniform />);
    expect(groups(container)).toEqual(["translate(0 400) scale(5)", "translate(0 900) scale(5)"]);
    expect(svg(container)).toHaveAttribute("viewBox", "0 0 1000 1000");
  });

  it("staggers a lockup: one size, the second line starting along from the first", () => {
    // "abcd" spans 200; "abc" with one em of indent spans 250 and is the longest.
    const { container } = render(<FitText lines={["abcd", "abc"]} uniform indent={[0, 1]} />);
    expect(groups(container)).toEqual(["translate(0 320) scale(4)", "translate(400 720) scale(4)"]);
  });

  it("recedes to a point: each copy the whole drawing shrunk toward it, the farthest drawn first", () => {
    // "ab" is fitted to 1000 by 1000; the point is at the left edge, twice the height down.
    const { container } = render(<FitText lines={["ab"]} extrude={3} vanish={{ x: 0, y: 2 }} />);
    const layers = [...container.querySelectorAll("g.fit__layer")];
    expect(layers.map((g) => g.getAttribute("transform"))).toEqual([
      "translate(0 2000) scale(0.988) translate(0 -2000)",
      "translate(0 2000) scale(0.992) translate(0 -2000)",
      "translate(0 2000) scale(0.996) translate(0 -2000)",
    ]);
    // Each holds every line, placed as the line itself is.
    for (const layer of layers) {
      const copy = layer.querySelector("text") as SVGTextElement;
      expect(copy).toHaveClass("fit__shadow");
      expect(copy).toHaveTextContent("ab");
      expect(copy).toHaveAttribute("transform", groups(container)[0]);
    }
    // They come before the lines, so the lines are drawn over them.
    expect(layers.at(-1)?.nextElementSibling).toHaveClass("fit__line");
    // The lines carry no stepped copies of their own in this mode.
    expect(container.querySelectorAll(".fit__line .fit__shadow")).toHaveLength(0);
  });

  it("darkens a receding copy by how far back it is", () => {
    const { container } = render(<FitText lines={["ab", "cd"]} extrude={4} vanish={{ x: -0.2, y: 1.5 }} />);
    const far = [...container.querySelectorAll<SVGGElement>("g.fit__layer")].map((g) => g.style.getPropertyValue("--fit-far"));
    expect(far).toEqual(["100%", "75%", "50%", "25%"]);
    expect(container.querySelectorAll("g.fit__layer text")).toHaveLength(8);
  });

  it("keeps the lines at full size when the depth recedes, and lets the depth fall outside", () => {
    const flat = render(<FitText lines={["ab"]} />);
    const deep = render(<FitText lines={["ab"]} extrude={-12} vanish={{ x: -0.5, y: 3 }} />);
    expect(svg(deep.container).getAttribute("viewBox")).toBe(svg(flat.container).getAttribute("viewBox"));
    expect(svg(deep.container)).toHaveAttribute("viewBox", "0 0 1000 1000");
    // The sign of the depth means nothing here: the point gives the direction.
    expect(deep.container.querySelectorAll("g.fit__layer")).toHaveLength(12);
  });

  it("fills each line from top to bottom with the colours it is given", () => {
    const { container } = render(<FitText lines={["ab", "cd"]} gradient={["#ffffff", "#ffcc00", "#aa6600"]} />);
    const gradient = container.querySelector("linearGradient") as SVGLinearGradientElement;
    expect([gradient.getAttribute("x1"), gradient.getAttribute("y1"), gradient.getAttribute("x2"), gradient.getAttribute("y2")]).toEqual(["0", "0", "0", "1"]);
    const stops = [...gradient.querySelectorAll("stop")];
    expect(stops.map((s) => [s.getAttribute("offset"), s.getAttribute("stop-color")])).toEqual([
      ["0", "#ffffff"],
      ["0.5", "#ffcc00"],
      ["1", "#aa6600"],
    ]);
    const id = gradient.id;
    expect(id).toMatch(/^fit[a-zA-Z0-9]+$/);
    for (const face of container.querySelectorAll(".fit__line > text:last-child")) {
      expect(face).toHaveAttribute("fill", `url(#${id})`);
    }
  });

  it("gives a single colour one stop, two drawings gradients of their own, and a plain drawing none", () => {
    const { container } = render(
      <>
        <FitText lines={["ab"]} gradient={["#ffcc00"]} />
        <FitText lines={["ab"]} gradient={["#000000", "#ffffff"]} />
        <FitText lines={["ab"]} />
      </>,
    );
    const gradients = [...container.querySelectorAll("linearGradient")];
    expect(gradients).toHaveLength(2);
    expect(gradients[0]?.id).not.toBe(gradients[1]?.id);
    expect(gradients[0]?.querySelector("stop")).toHaveAttribute("offset", "0");
    const plain = container.querySelectorAll("svg")[2] as SVGSVGElement;
    expect(plain.querySelector("defs")).toBeNull();
    expect(plain.querySelector(".fit__line > text")).not.toHaveAttribute("fill");
  });

  it("sets the first letters of the first line in colours of their own, on the letters and not the copies behind", () => {
    const tints = ["#d62021", "#222222", "#237bbd"];
    const { container } = render(<FitText lines={["GIFx", "def"]} tints={tints} extrude={1} />);
    const [first, second] = [...container.querySelectorAll(".fit__line")] as [Element, Element];
    const face = first.querySelector("text.fit__face") as SVGTextElement;
    // One letter to a colour, in order, and the rest of the line as it was.
    expect([...face.querySelectorAll("tspan")].map((t) => [t.textContent, t.getAttribute("fill")])).toEqual([
      ["G", "#d62021"],
      ["I", "#222222"],
      ["F", "#237bbd"],
    ]);
    expect(face).toHaveTextContent("GIFx");
    expect(face.lastChild?.textContent).toBe("x");
    // The copy behind is one colour, and so is every other line.
    expect(first.querySelector("text.fit__shadow")).toHaveTextContent("GIFx");
    expect(first.querySelector("text.fit__shadow tspan")).toBeNull();
    expect(second.querySelector("tspan")).toBeNull();
    // The whole line is still what is measured: four glyphs, 200 wide.
    expect(groups(container)[0]).toBe("translate(0 400) scale(5)");
    // In a receding depth too, the copies are one colour.
    const deep = render(<FitText lines={["GIFx"]} tints={tints} extrude={2} vanish={{ x: 0, y: 2 }} />);
    expect(deep.container.querySelector(".fit__layer tspan")).toBeNull();
    expect(deep.container.querySelectorAll(".fit__face tspan")).toHaveLength(3);
  });

  it("colours no more letters than the line has", () => {
    const { container } = render(<FitText lines={["GI"]} tints={["#d62021", "#222222", "#237bbd"]} />);
    const face = container.querySelector("text.fit__face") as SVGTextElement;
    expect([...face.querySelectorAll("tspan")].map((t) => t.textContent)).toEqual(["G", "I"]);
    expect(face.textContent).toBe("GI");
  });

  it("measures again when the number of letters set apart changes, since they may sit differently", () => {
    // A letter set apart measures twice as wide as one that is not.
    vi.spyOn(SVGElement.prototype as unknown as { getBBox: () => DOMRect }, "getBBox").mockImplementation(function (
      this: SVGElement,
    ) {
      const apart = this.querySelectorAll("tspan").length;
      return { x: 0, y: -80, width: ((this.textContent as string).length + apart) * 50, height: 100 } as DOMRect;
    });
    const { container, rerender } = render(<FitText lines={["GIFx"]} />);
    expect(groups(container)).toEqual(["translate(0 400) scale(5)"]);
    rerender(<FitText lines={["GIFx"]} tints={["#d62021"]} />);
    expect(groups(container)).toEqual(["translate(0 320) scale(4)"]);
    rerender(<FitText lines={["GIFx"]} tints={["#d62021", "#222222"]} />);
    expect(groups(container)[0]).toBe(`translate(0 ${80 * (1000 / 300)}) scale(${1000 / 300})`);
    // Other colours for the same letters move nothing.
    const before = container.querySelector("g.fit__line");
    rerender(<FitText lines={["GIFx"]} tints={["#000000", "#ffffff"]} />);
    expect(container.querySelector("g.fit__line")).toBe(before);
    expect(groups(container)[0]).toBe(`translate(0 ${80 * (1000 / 300)}) scale(${1000 / 300})`);
    rerender(<FitText lines={["GIFx"]} />);
    expect(groups(container)).toEqual(["translate(0 400) scale(5)"]);
  });

  it("marks each line's own letters as its face, apart from the copies behind", () => {
    const { container } = render(<FitText lines={["ab"]} extrude={2} />);
    const faces = container.querySelectorAll("text.fit__face");
    expect(faces).toHaveLength(1);
    expect(faces[0]).not.toHaveClass("fit__shadow");
    expect(faces[0]?.previousElementSibling).toHaveClass("fit__shadow");
  });

  it("sets no letter apart unless asked", () => {
    const { container } = render(<FitText lines={["4abc"]} />);
    expect(container.querySelector("tspan")).toBeNull();
  });

  it("ends its box at the last line's baseline when asked, leaving descenders to hang below", () => {
    // Lines are 100 tall with the baseline 80 down; "ab" scales by 10, "abcd" by 5.
    const whole = render(<FitText lines={["ab", "abcd"]} />);
    expect(svg(whole.container)).toHaveAttribute("viewBox", "0 0 1000 1500");
    const trimmed = render(<FitText lines={["ab", "abcd"]} toBaseline />);
    expect(svg(trimmed.container)).toHaveAttribute("viewBox", "0 0 1000 1400");
    // The lines themselves are where they were.
    expect(groups(trimmed.container)).toEqual(groups(whole.container));
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

  it("watches each line itself, and measures again when a face arrives and changes its width", () => {
    const { container } = render(<FitText lines={["ab", "cd"]} />);
    const watched = observers().flatMap((o) => o.observed);
    expect(watched).toEqual([...container.querySelectorAll("text.fit__face")]);
    // The face arrives: every glyph is now half as wide.
    const measure = measureAs(25);
    resized();
    expect(groups(container)[0]).toBe("translate(0 1600) scale(20)");
    expect(measure).toHaveBeenCalled();
    // A report that changes nothing draws nothing new.
    const before = container.querySelector("g.fit__line");
    resized();
    expect(container.querySelector("g.fit__line")).toBe(before);
  });

  it("measures a wider face too, so a name never keeps the width of its fallback", () => {
    const { container } = render(<FitText lines={["abcd"]} />);
    expect(groups(container)).toEqual(["translate(0 400) scale(5)"]);
    measureAs(100);
    resized();
    // Twice as wide, so half the scale: still exactly the full width.
    expect(groups(container)).toEqual(["translate(0 200) scale(2.5)"]);
  });

  it("stops watching when it is removed, and watches the new lines when the words change", () => {
    const { rerender, unmount, container } = render(<FitText lines={["ab"]} />);
    const [first] = observers();
    rerender(<FitText lines={["ab", "cd"]} />);
    expect(first?.disconnected).toBe(true);
    const live = observers().filter((o) => !o.disconnected);
    expect(live).toHaveLength(1);
    expect(live[0]?.observed).toEqual([...container.querySelectorAll("text.fit__face")]);
    unmount();
    expect(observers().every((o) => o.disconnected)).toBe(true);
  });
});
