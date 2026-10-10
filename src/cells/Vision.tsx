import { FitText } from "../ui/FitText";

const HEADING = ["One layout", "model,", "four", "platforms."];

/** What the library is. */
export function Vision() {
  return (
    <div className="cell vision">
      <h2 className="visually-hidden">{HEADING.join(" ")}</h2>
      <FitText className="vision__heading" lines={HEADING} leading={0.86} />
      <p className="vision__body">
        Golden Grids lays out Fibonacci-proportioned squares on a golden spiral for React, React Native, SwiftUI and
        Jetpack Compose. Give it a range of the sequence and it returns the boxes, the same on all four. What goes in
        them is yours.
      </p>
    </div>
  );
}
