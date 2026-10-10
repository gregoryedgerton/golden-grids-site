import { FitText } from "../ui/FitText";
import { Logo } from "../ui/logos";
import type { LogoName } from "../ui/logos";

/** One word, a figure run into it, after the way GIFcommit is written. */
const HEADING = "4platforms";

/** What Golden Grids is, in a sentence. The page's description in search results says the same. */
export const LENS =
  "Golden Grids is a new lens to view layouts through that leverages the golden ratio, a visual pattern that we all instinctually know through nature.";

/** Where the library runs: the framework, and the mark of the platform it belongs to. */
export const PLATFORMS: { name: string; logo: LogoName }[] = [
  { name: "React", logo: "react" },
  { name: "React Native", logo: "react" },
  { name: "SwiftUI", logo: "apple" },
  { name: "Jetpack Compose", logo: "android" },
];

/** Where the library runs, and what it is instead of. */
export function Vision() {
  return (
    <div className="cell vision">
      <h2 className="visually-hidden">{HEADING}</h2>
      {/* The figure is heavier than the word. The box ends at the baseline, so
          the strip below is spaced from where the letters sit. */}
      <FitText className="vision__heading" lines={[HEADING]} strong={1} toBaseline />
      <ul className="vision__platforms">
        {PLATFORMS.map(({ name, logo }) => (
          <li key={name}>
            <Logo name={logo} className="vision__logo" />
            {name}
          </li>
        ))}
      </ul>
      <p className="vision__body">
        Rows and columns have had a good run, but let’s make room for new ideas. You still need them; let’s push the
        envelope. {LENS} What you put on them is your business; at least you won’t be boring.
      </p>
    </div>
  );
}
