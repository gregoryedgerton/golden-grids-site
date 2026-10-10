import { DRAG_SHARE, SLOP_PX, dragSteps, keyMove, ownsDrag, ownsKey, pastSlop, swipeAxis, wheelPixels } from "./input";

describe("keyMove", () => {
  it.each(["ArrowDown", "ArrowRight", "PageDown", " "])("goes deeper on %j", (key) => {
    expect(keyMove(key)).toEqual({ by: 1 });
  });

  it.each(["ArrowUp", "ArrowLeft", "PageUp"])("goes back on %j", (key) => {
    expect(keyMove(key)).toEqual({ by: -1 });
  });

  it("goes to either end on Home and End", () => {
    expect(keyMove("Home")).toEqual({ to: "first" });
    expect(keyMove("End")).toEqual({ to: "last" });
  });

  it("leaves every other key alone", () => {
    expect(keyMove("a")).toBeNull();
    expect(keyMove("Tab")).toBeNull();
    expect(keyMove("Enter")).toBeNull();
  });
});

describe("ownsKey and ownsDrag", () => {
  const make = (html: string) => {
    document.body.innerHTML = html;
    return document.body.querySelector("[data-t]") as Element;
  };

  it("leaves every key to a form field", () => {
    for (const html of [
      "<input data-t>",
      "<textarea data-t></textarea>",
      "<select data-t></select>",
      "<div contenteditable><b data-t>x</b></div>",
    ]) {
      const element = make(html);
      expect(ownsKey(element, "ArrowLeft")).toBe(true);
      expect(ownsKey(element, " ")).toBe(true);
      expect(ownsDrag(element)).toBe(true);
    }
  });

  it("leaves Space, and only Space, to whatever Space presses", () => {
    for (const html of ["<button data-t>Go</button>", "<div role='button' tabindex='0'><span data-t>Go</span></div>", "<summary data-t>More</summary>"]) {
      const element = make(html);
      expect(ownsKey(element, " ")).toBe(true);
      expect(ownsKey(element, "ArrowDown")).toBe(false);
      expect(ownsDrag(element)).toBe(false);
    }
  });

  it("claims nothing for a link: Enter follows it, and Space does nothing there", () => {
    const element = make("<a href='#x'><span data-t>Go</span></a>");
    expect(ownsKey(element, " ")).toBe(false);
    expect(ownsKey(element, "ArrowDown")).toBe(false);
  });

  it("claims nothing for plain content or for a target that is not an element", () => {
    const element = make("<p data-t>Text</p>");
    expect(ownsKey(element, " ")).toBe(false);
    expect(ownsKey(element, "ArrowDown")).toBe(false);
    expect(ownsDrag(element)).toBe(false);
    expect(ownsKey(window, " ")).toBe(false);
    expect(ownsKey(null, "ArrowDown")).toBe(false);
    expect(ownsDrag(document)).toBe(false);
    expect(ownsDrag(null)).toBe(false);
  });
});

describe("swipeAxis", () => {
  it("has no axis until the finger has travelled the slop", () => {
    expect(swipeAxis(0, 0)).toBeNull();
    expect(swipeAxis(SLOP_PX - 1, -(SLOP_PX - 1))).toBeNull();
  });

  it("takes the axis the finger has travelled further along", () => {
    expect(swipeAxis(SLOP_PX, 2)).toBe("x");
    expect(swipeAxis(-40, 10)).toBe("x");
    expect(swipeAxis(3, -SLOP_PX)).toBe("y");
    expect(swipeAxis(10, 40)).toBe("y");
    // A perfect diagonal is read as vertical.
    expect(swipeAxis(20, 20)).toBe("y");
  });
});

describe("pastSlop", () => {
  it("is the travel less the slop, in the travel's own direction", () => {
    expect(pastSlop(300)).toBe(300 - SLOP_PX);
    expect(pastSlop(-300)).toBe(-300 + SLOP_PX);
    expect(pastSlop(SLOP_PX)).toBe(0);
    expect(pastSlop(-SLOP_PX)).toBe(0);
  });
});

describe("dragSteps", () => {
  it("goes deeper as the finger moves up or left, and back as it moves down or right", () => {
    expect(dragSteps(-100, 390, 800)).toBeGreaterThan(0);
    expect(dragSteps(100, 390, 800)).toBeLessThan(0);
  });

  it("turns one step for a set share of the stage's shorter side", () => {
    expect(dragSteps(-390 * DRAG_SHARE, 390, 800)).toBeCloseTo(1, 9);
    expect(dragSteps(-900 * DRAG_SHARE, 1440, 900)).toBeCloseTo(1, 9);
  });
});

describe("wheelPixels", () => {
  it("passes pixels through on both axes, sign and all", () => {
    expect(wheelPixels(-12, 34.5, 0, 900)).toEqual({ x: -12, y: 34.5 });
  });

  it("counts a line as sixteen pixels and a page as the stage's height", () => {
    expect(wheelPixels(1, -3, 1, 900)).toEqual({ x: 16, y: -48 });
    expect(wheelPixels(0, 1, 2, 900)).toEqual({ x: 0, y: 900 });
    expect(wheelPixels(-1, 0, 2, 640)).toEqual({ x: -640, y: 0 });
  });
});
