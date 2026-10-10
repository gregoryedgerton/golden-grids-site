import { useEffect, useSyncExternalStore } from "react";
import { useCellCurrent, useCellLanding } from "../dial/current";
import { FitText } from "../ui/FitText";
import { opposite } from "./statement";
import type { Ink, Statement } from "./statement";

/** Said as large as the cell allows, before anyone meets a study. */
const HEADING = ["THESE ARE", "FAKE"];

/** The statement's two colours on the cell's red: the ink the rest of the cell is set in, and white. */
export const INKS: Record<Ink, string> = { black: "currentColor", white: "#ffffff" };

/**
 * The cell that opens the gallery: the studies are not the sites they look
 * like. It says so first, then what they are. It gives no count: studies keep
 * being added.
 *
 * The statement is said once, white and then black, as the dial lands on the
 * cell. The cell only shows it, and tells it two things: that the dial is
 * landing here, and that the cell has lost the focus. The statement itself is
 * handed in, because this cell is taken off the dial when the reader is far
 * from it and put back when they return, and it has to come back the colour
 * the statement reached.
 */
export function Gallery({ statement }: { statement: Statement }) {
  const current = useCellCurrent();
  const landing = useCellLanding();
  const { ink, crossed } = useSyncExternalStore(statement.subscribe, statement.look);

  useEffect(() => {
    if (landing) statement.enter();
  }, [statement, landing]);

  // The cell has the focus until it loses it or is taken off the dial, whichever comes first.
  useEffect(() => {
    if (current) return () => statement.leave();
  }, [statement, current]);

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
