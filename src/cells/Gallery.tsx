import { useEffect, useRef, useState } from "react";
import { clock } from "../dial/clock";
import { useCellAtRest, useCellCurrent } from "../dial/current";
import { useReducedMotion } from "../dial/motion";
import { FitText } from "../ui/FitText";
import { AT_FIRST, createStatement, opposite } from "./statement";
import type { Ink, StatementController } from "./statement";

/** Said as large as the cell allows, before anyone meets a study. */
const HEADING = ["THESE ARE", "FAKE"];

/** The statement's two colours on the cell's red: the ink the rest of the cell is set in, and white. */
export const INKS: Record<Ink, string> = { black: "currentColor", white: "#ffffff" };

/**
 * The statement's look from moment to moment. It is said, white then black
 * and round again, from when the dial comes to rest on the cell until the
 * cell loses the focus; what is being said then is finished, and it stays the
 * colour it reached.
 */
function useStatement() {
  const current = useCellCurrent();
  const atRest = useCellAtRest();
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  const statementRef = useRef<StatementController | null>(null);
  const statement = () => statementRef.current as StatementController;
  const [look, setLook] = useState(AT_FIRST);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    const created = createStatement({ reduced: () => reducedRef.current, onLook: setLook, clock });
    statementRef.current = created;
    return () => created.destroy();
  }, []);

  useEffect(() => {
    if (atRest) statement().enter();
  }, [atRest]);

  useEffect(() => {
    if (!current) statement().leave();
  }, [current]);

  return look;
}

/**
 * The cell that opens the gallery: the studies are not the sites they look
 * like. It says so first, then what they are. It gives no count: studies keep
 * being added.
 */
export function Gallery() {
  const { ink, crossed } = useStatement();
  return (
    <div className="cell gallery">
      <p className="gallery__kicker">Case Studies</p>
      <h2 className="visually-hidden">{HEADING.join(" ")}</h2>
      {/* Capitals have nothing below the baseline, so the box ends there and
          the space under the heading is the space the eye sees. */}
      <FitText
        className="gallery__heading"
        lines={HEADING}
        leading={0.86}
        toBaseline
        wipe={{ from: INKS[ink], to: INKS[opposite(ink)], crossed }}
      />
      <p className="gallery__body">
        Layout studies look at an existing website, brand or general concept and reimagine it with Golden Grids under
        a parody name. None of these studies are affiliated with the brands mentioned, and nothing in them can be
        bought, booked or signed up for.
      </p>
    </div>
  );
}
