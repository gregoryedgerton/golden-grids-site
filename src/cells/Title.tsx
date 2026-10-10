import { FitText } from "../ui/FitText";
import { site } from "../site";

/** The title screen: who presents it, its name, its version and where to get it. */
export function Title() {
  return (
    <div className="cell title">
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
      <p className="title__hint">Swipe, scroll or use the arrow keys</p>
    </div>
  );
}
