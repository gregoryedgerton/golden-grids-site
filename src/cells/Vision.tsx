import { FitText } from "../ui/FitText";
import { Logo } from "../ui/logos";
import type { LogoName } from "../ui/logos";

/** One word, a figure run into it, after the way GIFcommit is written. */
const HEADING = "4platforms";

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
      <FitText className="vision__heading" lines={[HEADING]} />
      <ul className="vision__platforms">
        {PLATFORMS.map(({ name, logo }) => (
          <li key={name}>
            <Logo name={logo} className="vision__logo" />
            {name}
          </li>
        ))}
      </ul>
      <p className="vision__body">
        Rows and columns had a good run. Twelve of one, as many of the other as it takes, and every box the same as
        the box beside it. Golden Grids lays out boxes on a golden spiral and nothing else. What you put in them is
        your business, but at least you won’t be boring.
      </p>
    </div>
  );
}
