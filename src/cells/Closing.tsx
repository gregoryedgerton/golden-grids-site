import { site } from "../site";
import { writeDate } from "../studies";
import { FitText } from "../ui/FitText";
import { Stamp } from "../ui/Stamp";

/** The heading, in bold capitals: two words, and then one, as the gallery's statement and the second cell's question are set. */
const HEADING = ["FOR THE", "RECORD."];

/**
 * The last cell: a closing disclaimer, by the owner's direction, in place of
 * the mailing list the site once ended on. It says again, in plain words,
 * what the gallery's statement said in three: the studies are layout studies
 * under parody names, not the sites they resemble, and nothing here asks for
 * a sign-in or collects anything.
 *
 * Its foot is the day the site was last updated, written from the build so
 * it is the day of the deploy and never a guess, and this site's own stamp
 * at the bottom left: its serial among GIFcommit's releases, as fine print.
 * The site signs off with its own, as the title carries the library's.
 */
export function Closing() {
  return (
    <div className="cell closing">
      <h2 className="visually-hidden">{HEADING.join(" ")}</h2>
      {/* Capitals have nothing below the baseline, so the box ends there. */}
      <FitText className="closing__heading" lines={HEADING} leading={0.86} toBaseline />
      <div className="closing__body">
        <p>
          Every study on this dial is a layout study for Golden Grids, made for wonder and awe. Each takes the shape of a
          familiar site under a parody name. None is that site, and none is affiliated with it.
        </p>
        <p>
          No study asks you to sign in, and none collects personal information. Anything on them that looks like an
          account is made up, and says so.
        </p>
      </div>
      <div className="closing__foot">
        <Stamp className="closing__release" says="This site is release" release={site.release} />
        <p className="closing__updated">
          Last updated <time dateTime={site.updated}>{writeDate(site.updated)}</time>
        </p>
      </div>
    </div>
  );
}
