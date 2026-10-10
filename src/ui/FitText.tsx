import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

/** The width every line is scaled to, in the drawing's own units. */
const WIDTH = 1000;
/** The size the lines are measured at. */
const MEASURED_AT = 100;
/** How far each copy behind a line steps, in the drawing's units. */
const DEPTH_STEP = 4;
/** How much smaller each copy is than the one in front of it, when the depth recedes to a point. */
const VANISH_STEP = 0.004;
/** Until a line can be measured, a glyph is assumed to be this share of its size wide. */
const GUESS = 0.58;

/** No line indented. One array, so a caller that passes none does not look changed on every render. */
const NO_INDENT: number[] = [];

type Box = { x: number; y: number; width: number; height: number };

function guess(line: string): Box {
  return { x: 0, y: -MEASURED_AT * 0.8, width: Math.max(1, line.length) * MEASURED_AT * GUESS, height: MEASURED_AT };
}

/**
 * Stacks the lines from the top. Each is scaled so that it and its indent
 * span the full width; with `uniform`, all take the scale of the longest, so
 * the letters are one size and the shorter lines stop short.
 */
function stack(lines: string[], boxes: Box[] | undefined, leading: number, indent: number[], uniform: boolean) {
  const measured = lines.map((line, i) => {
    const box = boxes?.[i] ?? guess(line);
    const inset = (indent[i] ?? 0) * MEASURED_AT;
    return { line, box, inset, span: box.width + inset };
  });
  const longest = Math.max(...measured.map((m) => m.span));
  let cursor = 0;
  let height = 0;
  let baseline = 0;
  const placed = measured.map(({ line, box, inset, span }) => {
    const scale = WIDTH / (uniform ? longest : span);
    const top = cursor;
    cursor += box.height * scale * leading;
    height = top + box.height * scale;
    // A line is drawn from its baseline, which the measured box starts above.
    baseline = top - box.y * scale;
    return { line, scale, x: (inset - box.x) * scale, y: baseline };
  });
  return { placed, height, baseline };
}

/** A point in the drawing, as shares of its width and height. It may lie outside it. */
export type Vanish = { x: number; y: number };

/**
 * Display type fitted to its box: every line is scaled to the same width, the
 * lines are stacked, and the whole drawing scales to fill the element both
 * ways. It is a drawing of the words, hidden from assistive technology; the
 * caller writes the words themselves beside it.
 *
 * `leading` closes the lines up (1 is the face's own line height). `indent`
 * starts a line that many ems in, and `uniform` sets every line at one size
 * instead of one width; the two together stagger the lines of a lockup.
 *
 * `extrude` draws that many copies behind each line, in `--fit-shadow`, for
 * solid letters with depth. On its own the copies step down and to the right,
 * or down and to the left if the number is negative. With `vanish` they
 * instead shrink toward that point, so the depth recedes in perspective, and
 * darken toward `--fit-shadow-far` as they go.
 *
 * `gradient` fills each line from its top to its bottom with those colours.
 *
 * `strong` marks that many characters at the start of the first line as
 * `fit__strong`, for a heavier figure or initial. `toBaseline` ends the
 * drawing's box at the last line's baseline rather than under its descenders,
 * which then hang below it: what follows can be spaced from where the letters
 * sit, not from the tail of a p.
 */
export function FitText({
  lines,
  className,
  leading = 1,
  extrude = 0,
  indent = NO_INDENT,
  uniform = false,
  vanish,
  gradient,
  strong = 0,
  toBaseline = false,
}: {
  lines: string[];
  className?: string;
  leading?: number;
  extrude?: number;
  indent?: number[];
  uniform?: boolean;
  vanish?: Vanish;
  gradient?: string[];
  strong?: number;
  toBaseline?: boolean;
}) {
  const refs = useRef<(SVGTextElement | null)[]>([]);
  const [fitted, setFitted] = useState<{ key: string; boxes: Box[] } | null>(null);
  const text = lines.join("\n");
  // An id that is safe inside url(#…).
  const gradientId = `fit${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const measure = useCallback(() => {
    const measured = refs.current.slice(0, lines.length).map((element) => (element as SVGTextElement).getBBox());
    // Nothing has a width while the element is not rendered; keep the guess.
    if (measured.some((box) => !box.width || !box.height)) return;
    // The same measurement is the same state, so a face that changes nothing draws nothing.
    const key = measured.map(({ x, y, width, height }) => [x, y, width, height].join()).join(";");
    setFitted((before) => (before?.key === key ? before : { key, boxes: measured }));
    // `text` stands for `lines`: the same words are the same measurement,
    // unless more or fewer of them are marked, which may be set heavier.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, strong]);

  useLayoutEffect(measure, [measure]);

  // A face that arrives late changes every width. A layout effect, so that
  // it stops listening in the same step that takes the lines off the page:
  // an ordinary effect is cleaned up later, and a face arriving in between
  // would measure lines that are no longer there.
  useLayoutEffect(() => {
    const fonts = document.fonts as FontFaceSet | undefined;
    if (!fonts) return;
    let live = true;
    const again = () => {
      if (live) measure();
    };
    fonts.addEventListener("loadingdone", again);
    void fonts.ready.then(again);
    return () => {
      live = false;
      fonts.removeEventListener("loadingdone", again);
    };
  }, [measure]);

  const stacked = stack(lines, fitted?.boxes, leading, indent, uniform);
  const { placed } = stacked;
  const height = toBaseline ? stacked.baseline : stacked.height;
  /** A line's words, with the start of the first line marked if asked. */
  const words = (line: string, i: number) =>
    strong > 0 && i === 0 ? (
      <>
        <tspan className="fit__strong">{line.slice(0, strong)}</tspan>
        {line.slice(strong)}
      </>
    ) : (
      line
    );
  const copies = Math.abs(extrude);
  const place = ({ x, y, scale }: { x: number; y: number; scale: number }) => `translate(${x} ${y}) scale(${scale})`;

  const lean = extrude < 0 ? -1 : 1;
  // Stepped copies get room in the drawing's box. Copies that recede to a
  // point do not: the lines keep their full size, and the depth falls outside
  // the box, which does not clip it.
  const depth = vanish ? 0 : copies * DEPTH_STEP;
  const point = { x: (vanish?.x ?? 0) * WIDTH, y: (vanish?.y ?? 0) * height };

  return (
    <svg
      className={className ? `fit ${className}` : "fit"}
      viewBox={`${lean < 0 ? -depth : 0} 0 ${WIDTH + depth} ${height + depth}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {gradient && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {gradient.map((color, i) => (
              <stop key={i} offset={gradient.length > 1 ? i / (gradient.length - 1) : 0} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
      )}
      {vanish &&
        // Farthest first, so nearer copies cover it.
        Array.from({ length: copies }, (_, k) => {
          const far = copies - k;
          const shrink = 1 - far * VANISH_STEP;
          return (
            <g
              key={k}
              className="fit__layer"
              transform={`translate(${point.x} ${point.y}) scale(${shrink}) translate(${-point.x} ${-point.y})`}
              style={{ "--fit-far": `${Math.round((far / copies) * 100)}%` } as CSSProperties}
            >
              {placed.map((line, i) => (
                <text key={i} className="fit__shadow" fontSize={MEASURED_AT} transform={place(line)}>
                  {words(line.line, i)}
                </text>
              ))}
            </g>
          );
        })}
      {placed.map((line, i) => (
        <g key={i} className="fit__line" transform={place(line)}>
          {!vanish &&
            Array.from({ length: copies }, (_, k) => {
              const offset = ((copies - k) * DEPTH_STEP) / line.scale;
              return (
                <text key={k} className="fit__shadow" fontSize={MEASURED_AT} x={lean * offset} y={offset}>
                  {words(line.line, i)}
                </text>
              );
            })}
          <text
            ref={(element) => {
              refs.current[i] = element;
            }}
            className="fit__face"
            fontSize={MEASURED_AT}
            fill={gradient ? `url(#${gradientId})` : undefined}
          >
            {words(line.line, i)}
          </text>
        </g>
      ))}
    </svg>
  );
}
