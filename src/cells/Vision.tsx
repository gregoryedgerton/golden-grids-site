import { site } from "../site";
import { FitText } from "../ui/FitText";

/** The question, in bold capitals: two words, and then one, as the gallery's statement is set. */
const HEADING = ["WHAT IS", "THIS?"];

/**
 * The second cell: what the library is. The question is set in the type and
 * the proportions of the gallery's statement, THESE ARE FAKE, by the owner's
 * direction: bold capitals as wide as the cell, a line at a time, and the
 * answer under them. The answer is the page's own description, the
 * introduction of the library's README on npm, word for word.
 */
export function Vision() {
  return (
    <div className="cell vision">
      <h2 className="visually-hidden">{HEADING.join(" ")}</h2>
      {/* Capitals have nothing below the baseline, so the box ends there and
          the space under the question is the space the eye sees. */}
      <FitText className="vision__heading" lines={HEADING} leading={0.86} toBaseline />
      <p className="vision__body">{site.description}</p>
    </div>
  );
}
