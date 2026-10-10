import { useCellCurrent } from "../dial/current";
import { useReducedMotion } from "../dial/motion";
import { BackgroundVideo } from "../ui/BackgroundVideo";
import { FitText } from "../ui/FitText";
import { site } from "../site";
import { chooseVideo, useVideoChoice } from "./videoChoice";

/**
 * The title screen: who presents it, its name, its version and where to get
 * it, set over the video the branding comes from.
 *
 * The video plays only while this is the focused cell, and does not start by
 * itself for a reader who has asked for reduced motion. Either way the button
 * stops and starts it.
 */
export function Title() {
  const current = useCellCurrent();
  const reduced = useReducedMotion();
  /** The reader's own choice, once they have made one. It outlives this cell. */
  const chosen = useVideoChoice();
  const playing = chosen ?? !reduced;

  return (
    <div className="cell title">
      <BackgroundVideo id={site.video.id} title={site.video.title} playing={current && playing} />
      <p className="title__presents">{site.presenter} presents</p>
      <h1 className="visually-hidden">{site.name}</h1>
      <FitText className="title__name" lines={site.name.split(" ")} leading={0.78} extrude={7} />
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
      <div className="title__base">
        <p className="title__hint">Swipe, scroll or use the arrow keys</p>
        <p className="title__video">
          <button type="button" onClick={() => chooseVideo(!playing)}>
            {playing ? "Pause video" : "Play video"}
          </button>
          <a href={site.video.url}>{site.video.title}, on YouTube</a>
        </p>
      </div>
    </div>
  );
}
