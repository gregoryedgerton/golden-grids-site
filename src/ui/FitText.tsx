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
/** No letter in a colour of its own. */
const NO_TINTS: string[] = [];

type Box = { x: number; y: number; width: number; height: number };
/** Where a word starts and ends along its line, in the line's own units. */
type Span = { start: number; end: number };

function guess(line: string): Box {
  return { x: 0, y: -MEASURED_AT * 0.8, width: Math.max(1, line.length) * MEASURED_AT * GUESS, height: MEASURED_AT };
}

/** The words of a line: where each begins among its characters, and how many it has. */
function wordsOf(line: string) {
  return [...line.matchAll(/\S+/g)].map((word) => ({ index: word.index, length: word[0].length }));
}

/** Where each word of a line would start and end if every character were one width: all there is to go on until the line can be measured. */
function estimate(line: string, box: Box): Span[] {
  const each = box.width / Math.max(1, line.length);
  return wordsOf(line).map(({ index, length }) => ({ start: box.x + index * each, end: box.x + (index + length) * each }));
}

/** Where each word of a line starts and ends, as the browser has set it. */
function spansOf(element: SVGTextElement, line: string, box: Box): Span[] {
  try {
    return wordsOf(line).map(({ index, length }) => ({
      start: element.getStartPositionOfChar(index).x,
      end: element.getEndPositionOfChar(index + length - 1).x,
    }));
  } catch {
    // A browser that will not say. The estimate is close, and a throw here would take the whole page down.
    return estimate(line, box);
  }
}

/** A second colour on its way across the words. */
export type Wipe = {
  /** The colour the letters are. */
  from: string;
  /** The colour crossing them. */
  to: string;
  /**
   * How much of each word it has crossed, from the word's left: 0 is none of
   * it, 1 all. Words are what spaces part, counted through the lines in
   * order; a word with no number has none of the colour.
   */
  crossed: number[];
};

/** What fills a line: one colour, or colours side by side, each from one place along the line to the next. */
type Paint = { fill: string } | { x1: number; x2: number; stops: { offset: number; color: string }[] };

/**
 * The fill of a line a colour is crossing. Each word has a zone of its own,
 * and zones meet half way through the space between two words. In a zone the
 * new colour runs from the zone's start to an edge and the old one from there
 * on. The edge moves through the word's letters; with none or all of the word
 * crossed it sits at the end of the zone instead, so no sliver of the other
 * colour is left on a letter that overhangs its place.
 */
function paintOf(spans: Span[], crossed: number[], box: Box, from: string, to: string): Paint {
  const left = Math.min(box.x, ...spans.map((span) => span.start));
  const right = Math.max(box.x + box.width, ...spans.map((span) => span.end));
  const bounds = [left, ...spans.slice(1).map((span, j) => ((spans[j] as Span).end + span.start) / 2), right];
  /** Stretches of one colour, each up to a place along the line, in order. */
  const runs: { upTo: number; color: string }[] = [];
  const run = (upTo: number, color: string) => {
    const before = runs.at(-1);
    if (upTo <= (before?.upTo ?? left)) return;
    if (before?.color === color) before.upTo = upTo;
    else runs.push({ upTo, color });
  };
  spans.forEach((span, j) => {
    const share = Math.min(1, Math.max(0, crossed[j] ?? 0));
    const [start, end] = [bounds[j] as number, bounds[j + 1] as number];
    run(share === 0 ? start : share === 1 ? end : span.start + share * (span.end - span.start), to);
    run(end, from);
  });
  if (runs.length < 2) return { fill: runs[0]?.color ?? from };
  const along = (x: number) => (x - left) / (right - left);
  return {
    x1: left,
    x2: right,
    stops: runs.flatMap(({ upTo, color }, k) => [
      { offset: along(k === 0 ? left : (runs[k - 1] as { upTo: number }).upTo), color },
      { offset: along(upTo), color },
    ]),
  };
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
    return { line, box, scale, x: (inset - box.x) * scale, y: baseline };
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
 * `tints` sets the first letters of the first line in colours of their own,
 * one each and in order, for a name whose opening letters take the colours
 * of a mark. Only the letters take them, never the copies behind.
 *
 * `wipe` draws the letters in one colour with another part of the way across
 * each word, from the word's left, with a hard edge inside the letters. It is
 * one fill, not a second drawing laid over the first, so no rim of the old
 * colour shows round the new. It takes the place of the letters' own colour
 * and of `gradient`, and is not for use with `tints`. Moving it is the
 * caller's business: this draws one moment.
 *
 * `toBaseline` ends the drawing's box at the last line's baseline rather than
 * under its descenders, which then hang below it: what follows can be spaced
 * from where the letters sit, not from the tail of a p.
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
  tints = NO_TINTS,
  wipe,
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
  tints?: string[];
  wipe?: Wipe;
  toBaseline?: boolean;
}) {
  const refs = useRef<(SVGTextElement | null)[]>([]);
  const [fitted, setFitted] = useState<{ key: string; boxes: Box[]; spans?: Span[][] } | null>(null);
  const text = lines.join("\n");
  /** Whether the words are told apart, which is only when a colour is to cross them. */
  const worded = wipe !== undefined;
  // An id that is safe inside url(#…).
  const gradientId = `fit${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const measure = useCallback(() => {
    const elements = refs.current.slice(0, lines.length) as SVGTextElement[];
    const measured = elements.map((element) => element.getBBox());
    // Nothing has a width while the element is not rendered; keep the guess.
    if (measured.some((box) => !box.width || !box.height)) return;
    const spans = worded
      ? elements.map((element, i) => spansOf(element, lines[i] as string, measured[i] as Box))
      : undefined;
    // The same measurement is the same state, so a face that changes nothing draws nothing.
    const key = [
      ...measured.map(({ x, y, width, height }) => [x, y, width, height].join()),
      ...(spans ?? []).map((line) => line.map(({ start, end }) => [start, end].join()).join("/")),
    ].join(";");
    setFitted((before) => (before?.key === key ? before : { key, boxes: measured, spans }));
    // `text` stands for `lines`: the same words are the same measurement,
    // unless more or fewer of their letters are set apart, which can move
    // the others, or the words start or stop being told apart. Colours, and
    // how far one has come across a word, move nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, tints.length, worded]);

  useLayoutEffect(measure, [measure]);

  // A face that arrives late changes every width, and so does anything else
  // that restyles the letters. The lines themselves are watched: a resize
  // observer reports an SVG text's own box, after layout, whenever it changes.
  // The browser's font events are not used. WebKit does not send the one that
  // says a face has finished loading, so a name measured in its fallback kept
  // that width and ran out of its cell when the real face was drawn.
  useLayoutEffect(() => {
    const observer = new ResizeObserver(measure);
    for (const element of refs.current.slice(0, lines.length)) observer.observe(element as SVGTextElement);
    return () => observer.disconnect();
    // `measure` changes with the words, and with them the lines to watch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure]);

  const stacked = stack(lines, fitted?.boxes, leading, indent, uniform);
  const { placed } = stacked;
  const height = toBaseline ? stacked.baseline : stacked.height;
  /** A line's letters, the first few of the first line each in a colour of its own if any were given. */
  const letters = (line: string, i: number) =>
    i === 0 && tints.length > 0 ? (
      <>
        {[...line].slice(0, tints.length).map((letter, k) => (
          <tspan key={k} fill={tints[k]}>
            {letter}
          </tspan>
        ))}
        {[...line].slice(tints.length).join("")}
      </>
    ) : (
      line
    );
  /** Each line's fill while a colour is crossing its words. Words are counted through the lines. */
  let counted = 0;
  const paints = wipe
    ? placed.map(({ line, box }, i) => {
        const spans = fitted?.spans?.[i] ?? estimate(line, box);
        const paint = paintOf(spans, wipe.crossed.slice(counted), box, wipe.from, wipe.to);
        counted += spans.length;
        return paint;
      })
    : undefined;
  const copies = Math.abs(extrude);
  const place = ({ x, y, scale }: { x: number; y: number; scale: number }) => `translate(${x} ${y}) scale(${scale})`;

  /** What a line's own letters are filled with: a colour crossing them, the gradient, or the colour they inherit. */
  const faceFill = (i: number) => {
    const paint = paints?.[i];
    if (paint) return "stops" in paint ? `url(#${gradientId}w${i})` : paint.fill;
    return gradient ? `url(#${gradientId})` : undefined;
  };

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
      {paints?.some((paint) => "stops" in paint) && (
        <defs>
          {paints.map(
            (paint, i) =>
              "stops" in paint && (
                // Along the line, in the line's own units, whatever size the line is drawn at.
                <linearGradient
                  key={i}
                  id={`${gradientId}w${i}`}
                  gradientUnits="userSpaceOnUse"
                  x1={paint.x1}
                  y1="0"
                  x2={paint.x2}
                  y2="0"
                >
                  {paint.stops.map((stop, k) => (
                    <stop key={k} offset={stop.offset} stopColor={stop.color} />
                  ))}
                </linearGradient>
              ),
          )}
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
                  {line.line}
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
                  {line.line}
                </text>
              );
            })}
          <text
            ref={(element) => {
              refs.current[i] = element;
            }}
            className="fit__face"
            fontSize={MEASURED_AT}
            fill={faceFill(i)}
          >
            {letters(line.line, i)}
          </text>
        </g>
      ))}
    </svg>
  );
}
