import { act, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { mediaListeners, setReducedMotion } from "../../test/media";
import { WHEEL_IDLE_MS } from "./controller";
import { useCellCurrent, useCellLanding, useDialRest } from "./current";
import { Dial } from "./Dial";
import type { Cell } from "./Dial";
import { AHEAD, BEHIND, TEXTURE_PX, paintTile } from "./geometry";
import { DRAG_SHARE } from "./input";

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

function Lands({ name }: { name: number }) {
  const [current, landing] = [useCellCurrent(), useCellLanding()];
  return <span data-lands={name}>{landing ? "landing" : current ? "focused" : "waiting"}</span>;
}

/** A button that brings the dial to rest on its cell. */
function Rests() {
  const rest = useDialRest();
  return (
    <button type="button" onClick={rest}>
      Rest
    </button>
  );
}

/** A dial whose cells each say how the dial stands to them. */
const landable = (count: number) => makeCells(count).map((cell, i) => ({ ...cell, content: <Lands name={i} /> }));
/** What the mounted cells say, in order. */
const lands = () => [...document.querySelectorAll("[data-lands]")].map((s) => s.textContent);

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

  it("tells a cell's content that the dial is landing on it as soon as it is the focused one, long before the dial is still", () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    try {
      render(<Dial cells={landable(3)} />);
      // It opens at rest on its first cell.
      expect(lands()).toEqual(["landing", "waiting", "waiting"]);

      fireEvent.keyDown(document.body, { key: "ArrowDown" });
      // Headed elsewhere at once: the first cell is still the nearest, and no longer where the dial is landing.
      expect(lands()).toEqual(["focused", "waiting", "waiting"]);
      let frames = 0;
      while (lands()[1] !== "landing") {
        act(() => void vi.advanceTimersByTime(16));
        frames += 1;
      }
      // About half way there, a few frames in. The dial goes on moving for most of a second after this.
      expect(lands()).toEqual(["waiting", "landing", "waiting"]);
      expect(frames).toBeLessThan(10);
      expect(current().style.transform).not.toBe(paintTile(1, 1, 1440, 900).transform);
      for (let i = 0; i < 200; i++) act(() => void vi.advanceTimersByTime(16));
      expect(current().style.transform).toBe(paintTile(1, 1, 1440, 900).transform);
      expect(lands()).toEqual(["waiting", "landing", "waiting"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not tell a cell the dial is landing on it when the dial is only passing on its way to another", () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    try {
      render(<Dial cells={landable(8)} />);
      const landed = new Set<string>();
      const focused = new Set<string>();
      const watch = () => {
        for (let i = 0; i < 300; i++) {
          act(() => void vi.advanceTimersByTime(16));
          for (const cell of document.querySelectorAll("[data-lands]")) {
            if (cell.textContent === "landing") landed.add(cell.getAttribute("data-lands") as string);
            if (cell.textContent === "focused") focused.add(cell.getAttribute("data-lands") as string);
          }
        }
      };
      fireEvent.keyDown(document.body, { key: "End" });
      watch();
      expect(announced()).toBe("Cell 8, 8 of 8");
      // Every cell on the way was the focused one for a moment. Only the last was landed on.
      expect([...focused].sort()).toEqual(["1", "2", "3", "4", "5", "6"]);
      expect([...landed]).toEqual(["7"]);

      landed.clear();
      fireEvent.keyDown(document.body, { key: "Home" });
      watch();
      expect([...landed]).toEqual(["0"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not tell a cell the dial is landing on it while a finger holds the dial, and does when the finger lifts", () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    try {
      render(<Dial cells={landable(3)} />);
      const finger = { pointerId: 7, isPrimary: true, pointerType: "touch" };
      // Seven tenths of a cell, as a finger's travel on this stage.
      const reach = 0.7 * 900 * DRAG_SHARE;
      fireEvent.pointerDown(stage(), { ...finger, clientX: 200, clientY: 800 });
      // Past the slop, then most of the way to the next cell.
      fireEvent.pointerMove(window, { ...finger, clientX: 200, clientY: 790 });
      fireEvent.pointerMove(window, { ...finger, clientX: 200, clientY: 790 - reach });
      // The next cell is the nearest now, under the finger. It may yet be let go either way.
      expect(announced()).toBe("Cell 2, 2 of 3");
      expect(lands()).toEqual(["waiting", "focused", "waiting"]);
      for (let i = 0; i < 20; i++) act(() => void vi.advanceTimersByTime(16));
      expect(lands()).toEqual(["waiting", "focused", "waiting"]);

      fireEvent.pointerUp(window, { ...finger, clientX: 200, clientY: 790 - reach });
      // Let go: it is landing, before a frame of the settle has run.
      expect(lands()).toEqual(["waiting", "landing", "waiting"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not tell a cell the dial is landing on it while a finger rests on the dial without moving, and does when it lifts", () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    try {
      render(<Dial cells={landable(3)} />);
      const finger = { pointerId: 7, isPrimary: true, pointerType: "touch" };
      // Sent to the next cell by a key, and a finger comes down before it is half way there.
      fireEvent.keyDown(document.body, { key: "ArrowDown" });
      fireEvent.pointerDown(stage(), { ...finger, clientX: 200, clientY: 400 });
      const seen = new Set<string>();
      for (let i = 0; i < 120; i++) {
        act(() => void vi.advanceTimersByTime(16));
        seen.add(lands().join());
      }
      // The dial arrived on the cell beneath the finger, and at no point was it landing there.
      expect(announced()).toBe("Cell 2, 2 of 3");
      expect(current().style.transform).toBe(paintTile(1, 1, 1440, 900).transform);
      expect([...seen]).toEqual(["focused,waiting,waiting", "waiting,focused,waiting"]);

      fireEvent.pointerUp(window, { ...finger, clientX: 200, clientY: 400 });
      expect(lands()).toEqual(["waiting", "landing", "waiting"]);
      // A touch on a dial at rest takes the landing away and gives it back, and moves nothing.
      fireEvent.pointerDown(stage(), { ...finger, clientX: 200, clientY: 400 });
      expect(lands()).toEqual(["waiting", "focused", "waiting"]);
      fireEvent.pointerCancel(window, { ...finger, clientX: 200, clientY: 400 });
      expect(lands()).toEqual(["waiting", "landing", "waiting"]);
      expect(announced()).toBe("Cell 2, 2 of 3");
      // A mouse is not a finger on the dial.
      fireEvent.pointerDown(stage(), { pointerId: 1, isPrimary: true, pointerType: "mouse", clientX: 200, clientY: 400 });
      expect(lands()).toEqual(["waiting", "landing", "waiting"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("comes to rest on the focused cell when its content asks, with travel under way, and goes on from there", () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    try {
      const cells = landable(8).map((cell, i) => (i === 1 ? { ...cell, content: <Rests /> } : cell));
      render(<Dial cells={cells} />);
      fireEvent.keyDown(document.body, { key: "End" });
      // Until the second cell is the nearest, and only just.
      while (announced() !== "Cell 2, 2 of 8") act(() => void vi.advanceTimersByTime(16));
      expect(current().style.transform).not.toBe(paintTile(1, 1, 1440, 900).transform);
      fireEvent.click(screen.getByRole("button", { name: "Rest" }));
      // On the cell exactly, and landed there.
      expect(current().style.transform).toBe(paintTile(1, 1, 1440, 900).transform);
      expect(lands()).toEqual(["waiting", "waiting", "waiting", "waiting", "waiting", "waiting", "waiting"]);
      for (let i = 0; i < 300; i++) act(() => void vi.advanceTimersByTime(16));
      expect(announced()).toBe("Cell 2, 2 of 8");
      expect(current().style.transform).toBe(paintTile(1, 1, 1440, 900).transform);
      // A step from rest goes one cell on, not to where the dial had been going.
      fireEvent.keyDown(document.body, { key: "ArrowDown" });
      for (let i = 0; i < 300; i++) act(() => void vi.advanceTimersByTime(16));
      expect(announced()).toBe("Cell 3, 3 of 8");
      // The third cell is the second to say, the resting cell having nothing to say.
      expect(lands()).toEqual(["waiting", "landing", "waiting", "waiting", "waiting", "waiting", "waiting"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("gives content outside any dial nothing to rest", () => {
    render(<Rests />);
    expect(() => fireEvent.click(screen.getByRole("button", { name: "Rest" }))).not.toThrow();
  });

  it("is landing on each cell at once when motion is reduced, and tells content outside any dial that nothing is", () => {
    const { unmount } = render(<Dial cells={landable(3)} />);
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(lands()).toEqual(["waiting", "landing", "waiting"]);
    // A finger on the dial: nothing moves until it lifts, and until then the dial is landing nowhere.
    const finger = { pointerId: 7, isPrimary: true, pointerType: "touch" };
    fireEvent.pointerDown(stage(), { ...finger, clientX: 200, clientY: 800 });
    fireEvent.pointerMove(window, { ...finger, clientX: 200, clientY: 790 });
    fireEvent.pointerMove(window, { ...finger, clientX: 200, clientY: 500 });
    expect(lands()).toEqual(["waiting", "focused", "waiting"]);
    fireEvent.pointerUp(window, { ...finger, clientX: 200, clientY: 500 });
    expect(lands()).toEqual(["waiting", "waiting", "landing"]);
    unmount();
    render(<Lands name={0} />);
    expect(lands()).toEqual(["waiting"]);
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
      // Travel too small to be a scroll turns nothing.
      fireEvent.wheel(stage(), { deltaY: 2 });
      act(() => void vi.advanceTimersByTime(3000));
      expect(announced()).toBe("Cell 3, 3 of 12");
      // A scroll down whose fingers hook left as they lift is one cell deeper, not one back as well.
      fireEvent.wheel(stage(), { deltaY: 60 });
      for (const [deltaX, deltaY] of [
        [-5, 4],
        [-9, 2],
        [-12, 0],
      ] as const) {
        act(() => void vi.advanceTimersByTime(16));
        fireEvent.wheel(stage(), { deltaX, deltaY });
      }
      act(() => void vi.advanceTimersByTime(3000));
      expect(announced()).toBe("Cell 4, 4 of 12");
    } finally {
      vi.useRealTimers();
    }
  });

  it("turns for a scroll made anywhere on the dial: over the buttons as over the cells", () => {
    vi.useFakeTimers();
    try {
      render(<Dial cells={makeCells(6)} />);
      const wheel = (over: Element) => {
        const prevented = !fireEvent.wheel(over, { deltaY: 300 });
        act(() => void vi.advanceTimersByTime(WHEEL_IDLE_MS + 20));
        return prevented;
      };
      // The page does not scroll under any of them, and each turns the dial one cell.
      expect(wheel(screen.getByRole("navigation", { name: "Dial" }))).toBe(true);
      expect(announced()).toBe("Cell 2, 2 of 6");
      expect(wheel(screen.getByRole("button", { name: "Next" }))).toBe(true);
      expect(announced()).toBe("Cell 3, 3 of 6");
      // The way the wheel turns, not the button it is over.
      expect(wheel(screen.getByRole("button", { name: "Previous" }))).toBe(true);
      expect(announced()).toBe("Cell 4, 4 of 6");
      expect(wheel(document.querySelector(".dial__count") as Element)).toBe(true);
      expect(announced()).toBe("Cell 5, 5 of 6");
      expect(wheel(stage())).toBe(true);
      expect(announced()).toBe("Cell 6, 6 of 6");
      // Off the dial, a scroll is not the dial's to stop.
      expect(wheel(document.body)).toBe(false);
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

  it("does not keep a press from the keyboard off a link because a swipe went before it", () => {
    render(<Dial cells={makeCells(6)} />);
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    const link = screen.getByRole("link", { name: "A link" });
    const init = { pointerId: 7, isPrimary: true, pointerType: "touch" };
    // A swipe that ends in no click of its own, as most do.
    fireEvent.pointerDown(link, { ...init, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, { ...init, clientX: 200, clientY: 188 });
    fireEvent.pointerUp(window, init);
    // Enter on the link: the key, and then the click a browser makes of it.
    link.focus();
    fireEvent.keyDown(link, { key: "Enter" });
    expect(fireEvent.click(link)).toBe(true);
    expect(followed).toHaveBeenCalledTimes(1);
    expect(announced()).toBe("Cell 2, 2 of 6");
  });

  it("forgets a swipe at any key, whether or not the key is the dial's", () => {
    render(<Dial cells={makeCells(6)} />);
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    const link = screen.getByRole("link", { name: "A link" });
    const next = screen.getByRole("button", { name: "Next" });
    const init = { pointerId: 7, isPrimary: true, pointerType: "touch" };
    const keys: [Element, KeyboardEventInit][] = [
      // With a modifier held, which the dial leaves alone.
      [link, { key: "Enter", ctrlKey: true }],
      // Keys the dial does not use.
      [link, { key: "a" }],
      [link, { key: "Tab" }],
      // Space on a button, which is the button's.
      [next, { key: " " }],
    ];
    for (const [target, key] of keys) {
      fireEvent.pointerDown(link, { ...init, clientX: 200, clientY: 200 });
      fireEvent.pointerMove(window, { ...init, clientX: 200, clientY: 188 });
      fireEvent.pointerUp(window, init);
      fireEvent.keyDown(target, key);
      expect(fireEvent.click(link)).toBe(true);
    }
    expect(followed).toHaveBeenCalledTimes(keys.length);
    expect(announced()).toBe("Cell 2, 2 of 6");
  });

  it("does not keep the next click off a link when a swipe was cancelled, since a cancelled swipe ends in no click", () => {
    render(<Dial cells={makeCells(6)} />);
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    const link = screen.getByRole("link", { name: "A link" });
    const init = { pointerId: 7, isPrimary: true, pointerType: "touch" };
    fireEvent.pointerDown(link, { ...init, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, { ...init, clientX: 200, clientY: 188 });
    fireEvent.pointerCancel(window, init);
    // A click with nothing before it: assistive technology pressing the link.
    expect(fireEvent.click(link)).toBe(true);
    expect(followed).toHaveBeenCalledTimes(1);
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
