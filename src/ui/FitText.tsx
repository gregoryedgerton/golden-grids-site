import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** The width every line is scaled to, in the drawing's own units. */
const WIDTH = 1000;
/** The size the lines are measured at. */
const MEASURED_AT = 100;
/** How far each copy behind a line steps, in the drawing's units. */
const DEPTH_STEP = 4;
/** Until a line can be measured, a glyph is assumed to be this share of its size wide. */
const GUESS = 0.58;

type Box = { x: number; y: number; width: number; height: number };

function guess(line: string): Box {
  return { x: 0, y: -MEASURED_AT * 0.8, width: Math.max(1, line.length) * MEASURED_AT * GUESS, height: MEASURED_AT };
}

/** Scales every line to the full width and stacks them from the top. */
function stack(lines: string[], boxes: Box[] | undefined, leading: number) {
  let cursor = 0;
  let height = 0;
  const placed = lines.map((line, i) => {
    const box = boxes?.[i] ?? guess(line);
    const scale = WIDTH / box.width;
    const top = cursor;
    cursor += box.height * scale * leading;
    height = top + box.height * scale;
    return { line, scale, x: -box.x * scale, y: top - box.y * scale };
  });
  return { placed, height };
}

/**
 * Display type fitted to its box: every line is scaled to the same width, the
 * lines are stacked, and the whole drawing scales to fill the element both
 * ways. It is a drawing of the words, hidden from assistive technology; the
 * caller writes the words themselves beside it.
 *
 * `leading` closes the lines up (1 is the face's own line height). `extrude`
 * draws that many offset copies behind each line, in `--fit-shadow`, for
 * solid letters with depth.
 */
export function FitText({
  lines,
  className,
  leading = 1,
  extrude = 0,
}: {
  lines: string[];
  className?: string;
  leading?: number;
  extrude?: number;
}) {
  const refs = useRef<(SVGTextElement | null)[]>([]);
  const [fitted, setFitted] = useState<{ key: string; boxes: Box[] } | null>(null);
  const text = lines.join("\n");

  const measure = useCallback(() => {
    const measured = refs.current.slice(0, lines.length).map((element) => (element as SVGTextElement).getBBox());
    // Nothing has a width while the element is not rendered; keep the guess.
    if (measured.some((box) => !box.width || !box.height)) return;
    // The same measurement is the same state, so a face that changes nothing draws nothing.
    const key = measured.map(({ x, y, width, height }) => [x, y, width, height].join()).join(";");
    setFitted((before) => (before?.key === key ? before : { key, boxes: measured }));
    // `text` stands for `lines`: the same words are the same measurement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useLayoutEffect(measure, [measure]);

  // A face that arrives late changes every width.
  useEffect(() => {
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

  const { placed, height } = stack(lines, fitted?.boxes, leading);
  // Room for the copies behind, which step down and to the right.
  const depth = extrude * DEPTH_STEP;

  return (
    <svg
      className={className ? `fit ${className}` : "fit"}
      viewBox={`0 0 ${WIDTH + depth} ${height + depth}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {placed.map(({ line, scale, x, y }, i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${scale})`}>
          {Array.from({ length: extrude }, (_, k) => {
            const offset = ((extrude - k) * DEPTH_STEP) / scale;
            return (
              <text key={k} className="fit__shadow" fontSize={MEASURED_AT} x={offset} y={offset}>
                {line}
              </text>
            );
          })}
          <text
            ref={(element) => {
              refs.current[i] = element;
            }}
            fontSize={MEASURED_AT}
          >
            {line}
          </text>
        </g>
      ))}
    </svg>
  );
}
