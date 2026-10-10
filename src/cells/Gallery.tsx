import { FitText } from "../ui/FitText";

/** The cell that opens the gallery. */
export function Gallery({ count }: { count: number }) {
  return (
    <div className="cell gallery">
      <h2 className="gallery__heading">The studies</h2>
      <FitText className="gallery__count" lines={[String(count)]} />
      <p className="gallery__body">
        <span className="visually-hidden">{count} </span>
        {count === 1 ? "site" : "sites"} rebuilt on the grid, each under a parody name. None is affiliated with the site
        it studies.
      </p>
    </div>
  );
}
