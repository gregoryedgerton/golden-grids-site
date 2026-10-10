import { act, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { mediaListeners, setReducedMotion } from "../../test/media";
import { WHEEL_IDLE_MS } from "./controller";
import { useCellCurrent } from "./current";
import { Dial } from "./Dial";
import type { Cell } from "./Dial";
import { AHEAD, BEHIND, TEXTURE_PX, paintTile } from "./geometry";

const followed = vi.fn();

function makeCells(count: number): Cell[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `cell-${i}`,
    label: `Cell ${i + 1}`,
    ground: "#123456",
    content:
      i === 1 ? (
        <a href="#somewhere" onClick={followed}>
          A link
        </a>
      ) : i === 2 ? (
        <label>
          Email <input type="email" />
        </label>
      ) : (
        <p>Content {i + 1}</p>
      ),
  }));
}

/** Give the stage a size; jsdom lays nothing out. */
function size(width: number, height: number) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(height);
}

const stage = () => document.querySelector(".dial__stage") as HTMLElement;
const tiles = () => [...document.querySelectorAll<HTMLElement>(".dial__tile")];
const current = () => document.querySelector('.dial__tile[data-current="true"]') as HTMLElement;
const announced = () => screen.getByTestId("dial-announce").textContent;

/** A one-finger swipe from the middle of the stage. */
function swipe(dx: number, dy: number, { end = "pointerUp", from = stage() as Element, pointerType = "touch" } = {}) {
  const init = { pointerId: 7, isPrimary: true, pointerType };
  fireEvent.pointerDown(from, { ...init, clientX: 200, clientY: 200 });
  // First past the slop, then the travel itself.
  fireEvent.pointerMove(window, { ...init, clientX: 200 + Math.sign(dx) * 10, clientY: 200 + Math.sign(dy) * 10 });
  fireEvent.pointerMove(window, { ...init, clientX: 200 + dx, clientY: 200 + dy });
  fireEvent[end as "pointerUp" | "pointerCancel"](window, { ...init, clientX: 200 + dx, clientY: 200 + dy });
}

beforeEach(() => {
  followed.mockClear();
  size(1440, 900);
  // Most of these rows are about where the dial ends up, not how it gets there.
  setReducedMotion(true);
});

function Says() {
  return <span data-says>{useCellCurrent() ? "focused" : "waiting"}</span>;
}

describe("Dial", () => {
  it("tells each cell's content whether its cell is the focused one", () => {
    const cells = makeCells(3).map((cell) => ({ ...cell, content: <Says /> }));
    render(<Dial cells={cells} />);
    const said = () => [...document.querySelectorAll("[data-says]")].map((s) => s.textContent);
    expect(said()).toEqual(["focused", "waiting", "waiting"]);
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(said()).toEqual(["waiting", "focused", "waiting"]);
  });

  it("tells content outside any dial that it is not focused", () => {
    render(<Says />);
    expect(document.querySelector("[data-says]")).toHaveTextContent("waiting");
  });

  it("shows the first cell as the only one that can be read or reached", async () => {
    const { container } = render(<Dial cells={makeCells(5)} />);
    const all = tiles();
    expect(all).toHaveLength(5);
    expect(screen.getByRole("region", { name: "Cell 1" })).toBe(current());
    expect(current()).not.toHaveAttribute("aria-hidden");
    expect(current().firstElementChild).not.toHaveAttribute("inert");
    for (const tile of all.slice(1)) {
      expect(tile).toHaveAttribute("aria-hidden", "true");
      expect(tile.firstElementChild).toHaveAttribute("inert");
    }
    expect(announced()).toBe("Cell 1, 1 of 5");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("places every mounted cell where the geometry says", () => {
    render(<Dial cells={makeCells(5)} />);
    tiles().forEach((tile, index) => {
      const expected = paintTile(index, 0, 1440, 900);
      expect(tile.style.transform).toBe(expected.transform);
      expect(tile.style.opacity).toBe(String(expected.opacity));
      expect(tile.style.visibility).toBe("visible");
      expect((tile.firstElementChild as HTMLElement).style.transform).toBe(expected.content);
      expect(tile.style.width).toBe(`${TEXTURE_PX}px`);
      expect(tile.style.height).toBe(`${TEXTURE_PX}px`);
      expect(tile.style.background).toBe("rgb(18, 52, 86)");
    });
  });

  it("hides a cell the geometry does not draw", () => {
    size(320, 480);
    render(<Dial cells={makeCells(20)} />);
    const deepest = tiles().at(-1) as HTMLElement;
    expect(paintTile(AHEAD, 0, 320, 480).visible).toBe(false);
    expect(deepest.style.visibility).toBe("hidden");
  });

  it("draws nothing while the stage has no size, and draws when it is given one", () => {
    size(0, 900);
    render(<Dial cells={makeCells(3)} />);
    expect(current().style.transform).toBe("");
    size(1440, 0);
    const [observer] = (ResizeObserver as unknown as { instances: { callback: () => void; observed: Element[] }[] }).instances;
    act(() => observer?.callback());
    expect(current().style.transform).toBe("");
    size(390, 800);
    act(() => observer?.callback());
    expect(observer?.observed).toEqual([document.querySelector(".dial"), stage()]);
    expect(current().style.transform).toBe(paintTile(0, 0, 390, 800).transform);
  });

  it("keeps the buttons off the focused cell: in its spare corner where there is one, in a bar where there is not", () => {
    render(<Dial cells={makeCells(3)} />);
    const dial = document.querySelector(".dial") as HTMLElement;
    expect(dial).toHaveAttribute("data-nav", "corner");
    const [observer] = (ResizeObserver as unknown as { instances: { callback: () => void }[] }).instances;
    // A square page: the cell fills it, and its bottom corner is the cell's own.
    size(400, 400);
    act(() => observer?.callback());
    expect(dial).toHaveAttribute("data-nav", "bar");
    size(390, 800);
    act(() => observer?.callback());
    expect(dial).toHaveAttribute("data-nav", "corner");
  });

  it("starts with the buttons in a bar on a page that opens square", () => {
    size(600, 600);
    render(<Dial cells={makeCells(3)} />);
    expect(document.querySelector(".dial")).toHaveAttribute("data-nav", "bar");
  });

  it("goes deeper and back with the buttons, and stops at both ends", () => {
    render(<Dial cells={makeCells(3)} />);
    const previous = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(previous).toBeDisabled();
    fireEvent.click(next);
    expect(announced()).toBe("Cell 2, 2 of 3");
    expect(screen.getByRole("region", { name: "Cell 2" })).toBe(current());
    expect(current().style.transform).toBe(paintTile(1, 1, 1440, 900).transform);
    expect(previous).toBeEnabled();
    fireEvent.click(next);
    expect(next).toBeDisabled();
    fireEvent.click(previous);
    expect(announced()).toBe("Cell 2, 2 of 3");
    expect(document.querySelector(".dial__count")).toHaveTextContent("Cell 2 / of 3");
  });

  it("follows the keys: down and right deeper, up and left back, Home and End to the ends", () => {
    render(<Dial cells={makeCells(6)} />);
    const press = (key: string) => fireEvent.keyDown(document.body, { key });
    press("ArrowDown");
    press("ArrowRight");
    press("PageDown");
    press(" ");
    expect(announced()).toBe("Cell 5, 5 of 6");
    press("ArrowUp");
    press("ArrowLeft");
    press("PageUp");
    expect(announced()).toBe("Cell 2, 2 of 6");
    press("End");
    expect(announced()).toBe("Cell 6, 6 of 6");
    press("Home");
    expect(announced()).toBe("Cell 1, 1 of 6");
  });

  it("claims the keys it uses and no others", () => {
    render(<Dial cells={makeCells(6)} />);
    // fireEvent returns false when the event's default was prevented.
    expect(fireEvent.keyDown(document.body, { key: "ArrowDown" })).toBe(false);
    expect(fireEvent.keyDown(document.body, { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(document.body, { key: "ArrowDown", ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(document.body, { key: "ArrowDown", metaKey: true })).toBe(true);
    expect(fireEvent.keyDown(document.body, { key: "ArrowDown", altKey: true })).toBe(true);
    expect(announced()).toBe("Cell 2, 2 of 6");
  });

  it("leaves a key alone if something else has already handled it", () => {
    render(<Dial cells={makeCells(6)} />);
    const handled = (event: Event) => event.preventDefault();
    document.body.addEventListener("keydown", handled);
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    document.body.removeEventListener("keydown", handled);
    expect(announced()).toBe("Cell 1, 1 of 6");
  });

  it("does not turn for keys typed in a form field, or for Space on a button", () => {
    render(<Dial cells={makeCells(6)} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Next" }), { key: " " });
    expect(announced()).toBe("Cell 1, 1 of 6");
    fireEvent.keyDown(document.body, { key: "End" });
    fireEvent.keyDown(document.body, { key: "Home" });
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    const field = screen.getByLabelText("Email");
    expect(fireEvent.keyDown(field, { key: "ArrowLeft" })).toBe(true);
    expect(fireEvent.keyDown(field, { key: " " })).toBe(true);
    expect(fireEvent.keyDown(field, { key: "Home" })).toBe(true);
    expect(announced()).toBe("Cell 3, 3 of 6");
  });

  it("turns one step per scroll when motion is reduced, deeper for down and right", () => {
    vi.useFakeTimers();
    try {
      render(<Dial cells={makeCells(6)} />);
      const wheel = (init: WheelEventInit) => {
        const prevented = !fireEvent.wheel(stage(), init);
        act(() => void vi.advanceTimersByTime(WHEEL_IDLE_MS + 20));
        return prevented;
      };
      // The page must not scroll or swipe back under the dial.
      expect(wheel({ deltaY: 300 })).toBe(true);
      expect(announced()).toBe("Cell 2, 2 of 6");
      expect(wheel({ deltaX: 300 })).toBe(true);
      expect(announced()).toBe("Cell 3, 3 of 6");
      expect(wheel({ deltaY: -300 })).toBe(true);
      expect(wheel({ deltaX: -300 })).toBe(true);
      expect(announced()).toBe("Cell 1, 1 of 6");
      // A line of travel counts as sixteen pixels, a page as the stage's height.
      expect(wheel({ deltaY: 8, deltaMode: 1 })).toBe(true);
      expect(announced()).toBe("Cell 2, 2 of 6");
      expect(wheel({ deltaY: 1, deltaMode: 2 })).toBe(true);
      expect(announced()).toBe("Cell 3, 3 of 6");
    } finally {
      vi.useRealTimers();
    }
  });

  it("turns one cell for a scroll on a desktop, however long the scroll or hard the flick, and rests there", () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    try {
      render(<Dial cells={makeCells(12)} />);
      // A flick on a trackpad: a burst worth several cells, then a long tail dying away.
      let delta = 420;
      for (let i = 0; i < 90; i++) {
        fireEvent.wheel(stage(), { deltaY: delta });
        act(() => void vi.advanceTimersByTime(16));
        delta *= 0.94;
      }
      act(() => void vi.advanceTimersByTime(3000));
      expect(announced()).toBe("Cell 2, 2 of 12");
      // At rest exactly on the cell, not between two.
      expect(current().style.transform).toBe(paintTile(1, 1, 1440, 900).transform);
      // The next scroll is the next cell.
      fireEvent.wheel(stage(), { deltaY: 100 });
      act(() => void vi.advanceTimersByTime(3000));
      expect(announced()).toBe("Cell 3, 3 of 12");
      // A notch too small to be a tick turns nothing.
      fireEvent.wheel(stage(), { deltaY: 10 });
      act(() => void vi.advanceTimersByTime(3000));
      expect(announced()).toBe("Cell 3, 3 of 12");
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves a pinch on a trackpad to the browser", () => {
    vi.useFakeTimers();
    try {
      render(<Dial cells={makeCells(6)} />);
      expect(fireEvent.wheel(stage(), { deltaY: 300, ctrlKey: true })).toBe(true);
      act(() => void vi.advanceTimersByTime(WHEEL_IDLE_MS + 20));
      expect(announced()).toBe("Cell 1, 1 of 6");
    } finally {
      vi.useRealTimers();
    }
  });

  it("swipes: up and left go deeper, down and right go back", () => {
    render(<Dial cells={makeCells(6)} />);
    swipe(0, -300);
    expect(announced()).toBe("Cell 2, 2 of 6");
    swipe(-300, 0);
    expect(announced()).toBe("Cell 3, 3 of 6");
    swipe(0, 300);
    expect(announced()).toBe("Cell 2, 2 of 6");
    swipe(300, 0);
    expect(announced()).toBe("Cell 1, 1 of 6");
  });

  it("keeps the axis a swipe began on, and settles a cancelled swipe like a finished one", () => {
    render(<Dial cells={makeCells(6)} />);
    // Begins upward, then wanders a long way right: still an upward swipe.
    const init = { pointerId: 7, isPrimary: true, pointerType: "touch" };
    fireEvent.pointerDown(stage(), { ...init, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, { ...init, clientX: 200, clientY: 180 });
    fireEvent.pointerMove(window, { ...init, clientX: 900, clientY: 0 });
    fireEvent.pointerUp(window, init);
    expect(announced()).toBe("Cell 2, 2 of 6");
    swipe(0, -300, { end: "pointerCancel" });
    expect(announced()).toBe("Cell 3, 3 of 6");
  });

  it("counts a swipe's travel from the edge of the slop, on its first move as on its later ones", () => {
    setReducedMotion(false);
    render(<Dial cells={makeCells(6)} />);
    const init = { pointerId: 7, isPrimary: true, pointerType: "touch" };
    fireEvent.pointerDown(stage(), { ...init, clientX: 200, clientY: 200 });
    // 62 px up: the 8 px of slop, then 54 px, which on a 900 px stage at 0.6
    // of the side per step is a tenth of a step.
    fireEvent.pointerMove(window, { ...init, clientX: 200, clientY: 138 });
    expect(current().style.transform).toBe(paintTile(0, 0.1, 1440, 900).transform);
    fireEvent.pointerMove(window, { ...init, clientX: 200, clientY: 84 });
    expect(current().style.transform).toBe(paintTile(0, 0.2, 1440, 900).transform);
    fireEvent.pointerUp(window, init);
  });

  it("turns for a flick that is one move long", () => {
    render(<Dial cells={makeCells(6)} />);
    const init = { pointerId: 7, isPrimary: true, pointerType: "touch" };
    for (const [x, y, lands] of [
      [200, -100, "Cell 2, 2 of 6"],
      [-100, 200, "Cell 3, 3 of 6"],
      [200, 500, "Cell 2, 2 of 6"],
      [500, 200, "Cell 1, 1 of 6"],
    ] as const) {
      fireEvent.pointerDown(stage(), { ...init, clientX: 200, clientY: 200 });
      fireEvent.pointerMove(window, { ...init, clientX: x, clientY: y });
      fireEvent.pointerUp(window, init);
      expect(announced()).toBe(lands);
    }
  });

  it("goes deeper for Space on a link, which Space does not follow", () => {
    render(<Dial cells={makeCells(6)} />);
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(fireEvent.keyDown(screen.getByRole("link", { name: "A link" }), { key: " " })).toBe(false);
    expect(announced()).toBe("Cell 3, 3 of 6");
  });

  it("comes to rest on a whole cell if motion is reduced in the middle of a gesture", () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    try {
      render(<Dial cells={makeCells(6)} />);
      // A scroll has started the dial toward the next cell.
      fireEvent.wheel(stage(), { deltaY: 320 });
      act(() => void vi.advanceTimersByTime(32));
      expect((tiles()[0] as HTMLElement).style.transform).not.toBe(paintTile(0, 0, 1440, 900).transform);
      expect((tiles()[1] as HTMLElement).style.transform).not.toBe(paintTile(1, 1, 1440, 900).transform);
      act(() => setReducedMotion(true));
      // The next frame finishes the journey outright.
      act(() => void vi.advanceTimersByTime(16));
      expect(announced()).toBe("Cell 2, 2 of 6");
      expect(current().style.transform).toBe(paintTile(1, 1, 1440, 900).transform);
      // And a drag.
      act(() => void vi.advanceTimersByTime(WHEEL_IDLE_MS + 20));
      act(() => setReducedMotion(false));
      const init = { pointerId: 7, isPrimary: true, pointerType: "touch" };
      fireEvent.pointerDown(stage(), { ...init, clientX: 200, clientY: 400 });
      fireEvent.pointerMove(window, { ...init, clientX: 200, clientY: 68 });
      expect((tiles()[2] as HTMLElement).style.transform).toBe(paintTile(2, 1.6, 1440, 900).transform);
      act(() => setReducedMotion(true));
      fireEvent.pointerUp(window, init);
      expect(announced()).toBe("Cell 3, 3 of 6");
      expect(current().style.transform).toBe(paintTile(2, 2, 1440, 900).transform);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores a tap, a mouse, a second finger and another pointer's moves", () => {
    render(<Dial cells={makeCells(6)} />);
    const touch = { pointerId: 7, isPrimary: true, pointerType: "touch" };
    // A tap: down and up with travel inside the slop.
    fireEvent.pointerDown(stage(), { ...touch, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, { ...touch, clientX: 203, clientY: 198 });
    fireEvent.pointerUp(window, touch);
    // A mouse drags to select text.
    swipe(0, -300, { pointerType: "mouse" });
    // A second finger is not the swipe.
    fireEvent.pointerDown(stage(), { pointerId: 8, isPrimary: false, pointerType: "touch", clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, { pointerId: 8, isPrimary: false, pointerType: "touch", clientX: 200, clientY: 0 });
    fireEvent.pointerUp(window, { pointerId: 8, isPrimary: false, pointerType: "touch" });
    // Moves and a lift from a pointer that did not start the swipe.
    fireEvent.pointerDown(stage(), { ...touch, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, { ...touch, pointerId: 9, clientX: 200, clientY: 0 });
    fireEvent.pointerUp(window, { ...touch, pointerId: 9 });
    fireEvent.pointerUp(window, touch);
    // Moves with no swipe begun at all.
    fireEvent.pointerMove(window, { ...touch, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(window, touch);
    expect(announced()).toBe("Cell 1, 1 of 6");
  });

  it("leaves a drag that starts on a form field to the field", () => {
    render(<Dial cells={makeCells(6)} />);
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    swipe(0, -300, { from: screen.getByLabelText("Email") });
    expect(announced()).toBe("Cell 3, 3 of 6");
  });

  it("does not follow a link a swipe ends on, and does follow one that is tapped", () => {
    render(<Dial cells={makeCells(6)} />);
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    const link = screen.getByRole("link", { name: "A link" });
    const init = { pointerId: 7, isPrimary: true, pointerType: "touch" };
    // Swiped a short way: not far enough to turn, far enough not to be a tap.
    fireEvent.pointerDown(link, { ...init, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, { ...init, clientX: 200, clientY: 188 });
    fireEvent.pointerUp(window, init);
    expect(fireEvent.click(link)).toBe(false);
    expect(followed).not.toHaveBeenCalled();
    // The swipe is spent: the next click is a click.
    fireEvent.click(link);
    expect(followed).toHaveBeenCalledTimes(1);
    // A swipe with no click after it does not swallow the next tap.
    fireEvent.pointerDown(link, { ...init, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, { ...init, clientX: 200, clientY: 188 });
    fireEvent.pointerUp(window, init);
    fireEvent.pointerDown(link, { ...init, clientX: 200, clientY: 200 });
    fireEvent.pointerUp(window, init);
    fireEvent.click(link);
    expect(followed).toHaveBeenCalledTimes(2);
    expect(announced()).toBe("Cell 2, 2 of 6");
  });

  it("goes to a cell that is clicked, and does nothing for a click on the focused one", () => {
    render(<Dial cells={makeCells(6)} />);
    fireEvent.click(current());
    expect(announced()).toBe("Cell 1, 1 of 6");
    fireEvent.click(tiles()[3] as HTMLElement);
    expect(announced()).toBe("Cell 4, 4 of 6");
  });

  it("mounts only the cells around the focus, however long the list", () => {
    render(<Dial cells={makeCells(120)} />);
    expect(tiles()).toHaveLength(AHEAD + 1);
    fireEvent.keyDown(document.body, { key: "End" });
    expect(announced()).toBe("Cell 120, 120 of 120");
    expect(tiles().map((tile) => tile.getAttribute("aria-label"))).toEqual(["Cell 118", "Cell 119", "Cell 120"]);
    expect(current().style.transform).toBe(paintTile(119, 119, 1440, 900).transform);
    for (let i = 0; i < 50; i++) fireEvent.keyDown(document.body, { key: "ArrowUp" });
    expect(tiles()).toHaveLength(BEHIND + AHEAD + 1);
    expect(tiles()[0]).toHaveAttribute("aria-label", `Cell ${70 - BEHIND}`);
    tiles().forEach((tile, i) => {
      expect(tile.style.transform).toBe(paintTile(69 - BEHIND + i, 69, 1440, 900).transform);
    });
  });

  it("travels between cells over several frames when motion is allowed", () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    try {
      render(<Dial cells={makeCells(6)} />);
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      const seen = new Set<string>();
      for (let i = 0; i < 200; i++) {
        act(() => void vi.advanceTimersByTime(16));
        seen.add((tiles()[0] as HTMLElement).style.transform);
      }
      // Many positions on the way, ending exactly on the cell.
      expect(seen.size).toBeGreaterThan(10);
      expect(announced()).toBe("Cell 2, 2 of 6");
      expect(current().style.transform).toBe(paintTile(1, 1, 1440, 900).transform);
      // A scroll turns it one cell, over several frames too.
      fireEvent.wheel(stage(), { deltaY: 400 });
      const turning = new Set<string>();
      for (let i = 0; i < 200; i++) {
        act(() => void vi.advanceTimersByTime(16));
        turning.add((tiles()[1] as HTMLElement).style.transform);
      }
      expect(turning.size).toBeGreaterThan(10);
      expect(announced()).toBe("Cell 3, 3 of 6");
      expect(current().style.transform).toBe(paintTile(2, 2, 1440, 900).transform);
    } finally {
      vi.useRealTimers();
    }
  });

  it("follows a change of the motion preference while it is open", () => {
    setReducedMotion(false);
    render(<Dial cells={makeCells(6)} />);
    act(() => setReducedMotion(true));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    // No frames were needed.
    expect(announced()).toBe("Cell 2, 2 of 6");
    expect(current().style.transform).toBe(paintTile(1, 1, 1440, 900).transform);
  });

  it("starts again from the first cell when the list changes length", () => {
    const { rerender } = render(<Dial cells={makeCells(6)} />);
    fireEvent.keyDown(document.body, { key: "End" });
    rerender(<Dial cells={makeCells(4)} />);
    expect(announced()).toBe("Cell 1, 1 of 4");
    fireEvent.keyDown(document.body, { key: "End" });
    expect(announced()).toBe("Cell 4, 4 of 4");
  });

  it("lets go of the window when it is removed", () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<Dial cells={makeCells(6)} />);
      const [observer] = (ResizeObserver as unknown as { instances: { disconnected: boolean }[] }).instances;
      const el = stage();
      fireEvent.wheel(el, { deltaY: 300 });
      expect(mediaListeners()).toBe(1);
      unmount();
      expect(observer?.disconnected).toBe(true);
      expect(mediaListeners()).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
      // Nothing is listening: these would throw on a dial that no longer exists.
      expect(fireEvent.keyDown(document.body, { key: "ArrowDown" })).toBe(true);
      expect(fireEvent.wheel(el, { deltaY: 300 })).toBe(true);
      fireEvent.pointerDown(el, { pointerId: 7, isPrimary: true, pointerType: "touch" });
      fireEvent.pointerMove(window, { pointerId: 7, clientX: 500 });
      fireEvent.pointerUp(window, { pointerId: 7 });
      fireEvent.pointerCancel(window, { pointerId: 7 });
      fireEvent.click(el);
    } finally {
      vi.useRealTimers();
    }
  });
});
