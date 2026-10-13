import { useId } from "react";
import { FitText } from "../ui/FitText";
import { site } from "../site";
import { Stamp } from "../ui/Stamp";

const HEADING = ["Next study,", "by email."];

/**
 * The last cell: the mailing list. The form goes straight to the list's
 * provider; this site never holds an address.
 *
 * At its top left is this site's own stamp, by the owner's direction: the day
 * it was released and its serial among GIFcommit's releases. The site signs
 * off with its own, as the title opens with the library's.
 */
export function Signup({ action }: { action: string }) {
  const id = useId();
  const open = action !== "";
  return (
    <div className="cell signup">
      <Stamp className="signup__release" says="This site, released" released={site.release.released} release={site.release.number} />
      <h2 className="visually-hidden">{HEADING.join(" ")}</h2>
      <FitText className="signup__heading" lines={HEADING} leading={0.66} extrude={5} />
      <form className="signup__form" action={open ? action : undefined} method="get" target="_blank" rel="noopener">
        <label htmlFor={`${id}-email`}>Email address</label>
        <div className="signup__row">
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            aria-describedby={`${id}-note`}
          />
          <button type="submit" disabled={!open}>
            Subscribe
          </button>
        </div>
        <p className="signup__note" id={`${id}-note`}>
          {open
            ? "A note when a new study is published, sent with Beehiiv. Subscribing opens Beehiiv in a new tab."
            : "The list is not open yet."}
        </p>
      </form>
    </div>
  );
}
