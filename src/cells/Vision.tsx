import { FitText } from "../ui/FitText";
import { Logo } from "../ui/logos";
import type { LogoName } from "../ui/logos";

/** One word in capitals, which the marks under it finish: SUPPORTS these. */
const HEADING = "SUPPORTS";

/** What Golden Grids is, in a sentence. */
export const LENS =
  "Golden Grids is a new lens to view layouts through that leverages the golden ratio, a visual pattern that we all instinctually know through nature.";

/**
 * Where the library runs: the framework, and the mark of the platform it
 * belongs to. React and React Native are two packages under one mark, so they
 * are one entry here. "React Native" is held together by a space that does
 * not break, so the name turns after the ampersand and not inside it.
 */
export const PLATFORMS: { name: string; logo: LogoName }[] = [
  { name: "React & React\u00a0Native", logo: "react" },
  { name: "SwiftUI", logo: "apple" },
  { name: "Jetpack Compose", logo: "android" },
];

/** Where the library runs, and what it is instead of. */
export function Vision() {
  return (
    <div className="cell vision">
      <h2 className="visually-hidden">{HEADING}</h2>
      {/* Capitals have nothing below the baseline, so the box ends there and
          the strip below is spaced from where the letters sit. */}
      <FitText className="vision__heading" lines={[HEADING]} toBaseline />
      <ul className="vision__platforms">
        {PLATFORMS.map(({ name, logo }) => (
          <li key={name}>
            <Logo name={logo} className="vision__logo" />
            {name}
          </li>
        ))}
      </ul>
      <p className="vision__body">
        Rows and columns have had a good run, but let’s make room for new ideas. You still need them, but let’s push
        the envelope. {LENS} What you put on them is your business, at least you won’t be boring.
      </p>
    </div>
  );
}
