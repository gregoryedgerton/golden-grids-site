import { useEffect, useSyncExternalStore } from "react";
import { useCellAtRest, useCellCurrent } from "../dial/current";
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
 * The statement is said, white then black and round again, from when the dial
 * comes to rest on the cell until the cell loses the focus. The cell only
 * shows it and tells it of those two things. The statement itself is handed
 * in, because this cell is taken off the dial when the reader is far from it
 * and put back when they return, and it has to come back the colour the
 * statement reached.
 */
export function Gallery({ statement }: { statement: Statement }) {
  const current = useCellCurrent();
  const atRest = useCellAtRest();
  const { ink, crossed } = useSyncExternalStore(statement.subscribe, statement.look);

  useEffect(() => {
    if (atRest) statement.enter();
  }, [statement, atRest]);

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
