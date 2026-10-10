import { FitText } from "../ui/FitText";
import { Logo } from "../ui/logos";
import type { LogoName } from "../ui/logos";

const HEADING = ["Four", "platforms."];

/** Where the library runs: the framework, and the mark of the platform it belongs to. */
export const PLATFORMS: { name: string; logo: LogoName }[] = [
  { name: "React", logo: "react" },
  { name: "React Native", logo: "react" },
  { name: "SwiftUI", logo: "apple" },
  { name: "Jetpack Compose", logo: "android" },
];

/** What the library is, by where it is available. */
export function Vision() {
  return (
    <div className="cell vision">
      <h2 className="visually-hidden">{HEADING.join(" ")}</h2>
      <FitText className="vision__heading" lines={HEADING} leading={0.84} />
      <ul className="vision__platforms">
        {PLATFORMS.map(({ name, logo }) => (
          <li key={name}>
            <Logo name={logo} className="vision__logo" />
            {name}
          </li>
        ))}
      </ul>
      <p className="vision__body">
        Golden Grids lays out Fibonacci-proportioned squares on a golden spiral. Give it a range of the sequence and it
        returns the same boxes on all four, checked against one shared master.
      </p>
    </div>
  );
}
