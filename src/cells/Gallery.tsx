import { FitText } from "../ui/FitText";
import { site } from "../site";

/** Said as large as the cell allows, before anyone meets a study. */
const HEADING = ["THESE ARE", "FAKE"];

/**
 * The cell that opens the gallery: the studies are not the sites they look
 * like. It says so first, then what they are, then how to make one. It gives
 * no count: studies keep being added.
 */
export function Gallery() {
  return (
    <div className="cell gallery">
      <p className="gallery__kicker">The studies</p>
      <h2 className="visually-hidden">{HEADING.join(" ")}</h2>
      {/* Capitals have nothing below the baseline, so the box ends there and
          the space under the heading is the space the eye sees. */}
      <FitText className="gallery__heading" lines={HEADING} leading={0.74} toBaseline />
      <p className="gallery__body">
        The cells that follow are layout studies. Each rebuilds a real site on Golden Grids under a parody name, to
        see how the grid carries a working layout. None is affiliated with the site it studies, and nothing in them
        can be bought, booked or signed up for.
      </p>
      <p className="gallery__make">
        <a href={site.template} target="_blank" rel="noopener">
          Make your own <span className="visually-hidden">study from the template (opens in a new window)</span>
        </a>
      </p>
    </div>
  );
}
