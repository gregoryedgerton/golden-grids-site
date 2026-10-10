import { FitText } from "../ui/FitText";

/** Said as large as the cell allows, before anyone meets a study. */
const HEADING = ["THESE ARE", "FAKE"];

/**
 * The cell that opens the gallery: the studies are not the sites they look
 * like. It says so first, then what they are. It gives no count: studies keep
 * being added.
 */
export function Gallery() {
  return (
    <div className="cell gallery">
      <p className="gallery__kicker">Case Studies</p>
      <h2 className="visually-hidden">{HEADING.join(" ")}</h2>
      {/* Capitals have nothing below the baseline, so the box ends there and
          the space under the heading is the space the eye sees. */}
      <FitText className="gallery__heading" lines={HEADING} leading={0.86} toBaseline />
      <p className="gallery__body">
        Layout studies look at an existing website, brand or general concept and reimagine it with Golden Grids under
        a parody name. None of these studies are affiliated with the brands mentioned, and nothing in them can be
        bought, booked or signed up for.
      </p>
    </div>
  );
}
