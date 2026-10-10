import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createDial } from "./controller";
import type { DialClock, DialController } from "./controller";
import { TEXTURE_PX, mountedAround, paintTile } from "./geometry";
import { dragSteps, keyMove, ownsDrag, ownsKey, swipeAxis, wheelSteps } from "./input";
import type { Axis } from "./input";
import { useReducedMotion } from "./motion";
import "./dial.css";

export type Cell = {
  /** Stable and unique: the cell's key. */
  id: string;
  /** What the cell is, in a few words. Names its section and is announced when it takes the focus. */
  label: string;
  /** The colour of the cell's square. */
  ground: string;
  content: ReactNode;
};

const clock: DialClock = {
  now: () => performance.now(),
  requestFrame: (tick) => requestAnimationFrame(tick),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
  setTimer: (fire, ms) => window.setTimeout(fire, ms),
  clearTimer: (handle) => window.clearTimeout(handle),
};

type Swipe = { id: number; x: number; y: number; axis: Axis | null };

/**
 * The spiral dial. One cell fills the stage's shorter side; the cells after
 * it spiral away into the room that is left. Swiping up or left, scrolling,
 * or the arrow keys turn the dial one cell deeper; the opposites turn it
 * back.
 *
 * Only the focused cell can be read by assistive technology or take focus.
 * The rest are scenery: mounted so the spiral is drawn, hidden and inert so
 * nothing in them is reachable out of turn.
 */
export function Dial({ cells }: { cells: Cell[] }) {
  // A dial is built for its count. A different count is a different dial,
  // starting again from its first cell.
  return <DialOf key={cells.length} cells={cells} />;
}

function DialOf({ cells }: { cells: Cell[] }) {
  const count = cells.length;
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  const [focus, setFocus] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef(new Map<number, HTMLElement>());
  const dialRef = useRef<DialController | null>(null);
  const dial = useCallback(() => dialRef.current as DialController, []);
  const depthRef = useRef(0);
  const swipeRef = useRef<Swipe | null>(null);
  /** A swipe that ends over a link must not follow it. */
  const swipedRef = useRef(false);

  const paint = useCallback(() => {
    const stage = stageRef.current as HTMLDivElement;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    tilesRef.current.forEach((tile, index) => {
      const { transform, content, opacity, visible } = paintTile(index, depthRef.current, width, height);
      tile.style.transform = transform;
      tile.style.opacity = String(opacity);
      tile.style.visibility = visible ? "visible" : "hidden";
      (tile.firstElementChild as HTMLElement).style.transform = content;
    });
  }, []);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    const created = createDial({
      count,
      reduced: () => reducedRef.current,
      onDepth: (depth) => {
        depthRef.current = depth;
        paint();
      },
      onFocus: setFocus,
      clock,
    });
    dialRef.current = created;
    return () => {
      created.destroy();
      dialRef.current = null;
    };
  }, [count, paint]);

  // Cells mount and unmount as the focus moves; the new ones have to be
  // placed before the browser draws them.
  useLayoutEffect(paint, [paint, focus, count]);

  useEffect(() => {
    const stage = stageRef.current as HTMLDivElement;
    const observer = new ResizeObserver(paint);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [paint]);

  useEffect(() => {
    const stage = stageRef.current as HTMLDivElement;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (ownsKey(event.target, event.key)) return;
      const move = keyMove(event.key);
      if (!move) return;
      event.preventDefault();
      if ("by" in move) dial().step(move.by);
      else dial().goTo(move.to === "first" ? 0 : count - 1);
    };

    // Not passive: the page must not scroll or swipe back while the dial turns.
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      dial().wheel(wheelSteps(event.deltaX, event.deltaY, event.deltaMode, stage.clientHeight));
    };

    const onDown = (event: PointerEvent) => {
      swipedRef.current = false;
      // A mouse drags to select text; the wheel and the keys are its way round the dial.
      if (event.pointerType === "mouse" || !event.isPrimary || ownsDrag(event.target)) return;
      swipeRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null };
    };

    const onMove = (event: PointerEvent) => {
      const swipe = swipeRef.current;
      if (!swipe || event.pointerId !== swipe.id) return;
      const dx = event.clientX - swipe.x;
      const dy = event.clientY - swipe.y;
      if (!swipe.axis) {
        swipe.axis = swipeAxis(dx, dy);
        if (!swipe.axis) return;
        swipedRef.current = true;
      } else {
        dial().nudge(dragSteps(swipe.axis === "x" ? dx : dy, stage.clientWidth, stage.clientHeight));
      }
      // Measured from here on, so the dial does not jump by the slop.
      swipe.x = event.clientX;
      swipe.y = event.clientY;
    };

    const onUp = (event: PointerEvent) => {
      const swipe = swipeRef.current;
      if (!swipe || event.pointerId !== swipe.id) return;
      swipeRef.current = null;
      if (swipe.axis) dial().release();
    };

    const onClick = (event: MouseEvent) => {
      if (!swipedRef.current) return;
      swipedRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("keydown", onKey);
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("click", onClick, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("click", onClick, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [count, dial]);

  const focused = cells[focus] as Cell;

  return (
    <div className="dial">
      <div className="dial__stage" ref={stageRef}>
        {mountedAround(focus, count).map((index) => {
          const cell = cells[index] as Cell;
          const current = index === focus;
          return (
            // A pointer may pick a cell it can see. Keys and the buttons below
            // reach every cell, so this is a shortcut, not the only way.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <section
              key={cell.id}
              className="dial__tile"
              aria-label={cell.label}
              aria-roledescription="slide"
              aria-hidden={current ? undefined : true}
              data-current={current}
              ref={(element) => {
                if (element) tilesRef.current.set(index, element);
                else tilesRef.current.delete(index);
              }}
              style={{ width: TEXTURE_PX, height: TEXTURE_PX, background: cell.ground }}
              onClick={current ? undefined : () => dial().goTo(index)}
            >
              <div className="dial__content" inert={!current}>
                {cell.content}
              </div>
            </section>
          );
        })}
      </div>
      <nav className="dial__nav" aria-label="Dial">
        <button type="button" onClick={() => dial().step(-1)} disabled={focus === 0}>
          <span className="visually-hidden">Previous</span>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </button>
        <p className="dial__count">
          <span className="visually-hidden">Cell </span>
          {focus + 1}
          <span aria-hidden="true"> / </span>
          <span className="visually-hidden"> of </span>
          {count}
        </p>
        <button type="button" onClick={() => dial().step(1)} disabled={focus === count - 1}>
          <span className="visually-hidden">Next</span>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </button>
      </nav>
      <p className="visually-hidden" aria-live="polite" data-testid="dial-announce">
        {focused.label}, {focus + 1} of {count}
      </p>
    </div>
  );
}
