import { useCellCurrent } from "../dial/current";
import { useReducedMotion } from "../dial/motion";
import { Backdrop } from "../ui/Backdrop";
import { FitText } from "../ui/FitText";
import { site } from "../site";
import clip from "../assets/title.gif";
import still from "../assets/title-still.jpg";

/** "Grids" starts this many ems in: a little after the G of "Golden" above it. */
const STAGGER = [0, 0.85];
/** Where the name's depth recedes to: below the lettering and off to its left, as on the sleeve. */
const VANISH = { x: -0.15, y: 1.8 };
/** The face of the letters, top to bottom: lemon, a pale band of light, then gold. */
const GOLD = ["#ffe23d", "#fff3a6", "#fbd128", "#eaa51b"];

/**
 * The title screen, after the sleeve it takes its branding from: who presents
 * it in a tall light sans, the name in chunky gold script whose depth recedes
 * to a point, its second word set under the first and a little along, a second line in red, and the
 * version in a box at the foot.
 *
 * Behind it is a clip the owner supplied, five seconds of an old film: a car
 * passes at night and a shopfront goes up. It is shown through once each time
 * this becomes the focused cell, and rests on its last frame. A reader who
 * has asked for reduced motion gets a still from it instead.
 */
export function Title() {
  const current = useCellCurrent();
  const reduced = useReducedMotion();

  return (
    <div className="cell title">
      {/* With motion reduced, a still from the clip stands in for it. */}
      <Backdrop clip={clip} playing={current && !reduced} still={reduced ? still : undefined} />
      <p className="title__presents">{site.presenter} presents</p>
      <h1 className="visually-hidden">{site.name}</h1>
      <FitText
        className="title__name"
        lines={site.name.split(" ")}
        leading={0.66}
        extrude={26}
        vanish={VANISH}
        gradient={GOLD}
        indent={STAGGER}
        uniform
      />
      <div className="title__foot">
        <p className="title__version">
          <span className="visually-hidden">Version </span>
          <span aria-hidden="true">v</span>
          {site.version}
        </p>
        <ul className="title__links">
          <li>
            <a href={site.npm}>npm</a>
          </li>
          <li>
            <a href={site.github}>GitHub</a>
          </li>
        </ul>
      </div>
    </div>
  );
}
