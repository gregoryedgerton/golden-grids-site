import { serial } from "../site";
import { writeDate } from "../studies";

/**
 * A release's stamp, at the top left of the cell that stands for it: the day
 * it was released, and then its serial among GIFcommit's releases. Every
 * cell that is a release wears the same one, in the same place and the same
 * order: each study's, the library's on the title and this site's on the
 * last cell.
 */
export function Stamp({
  className,
  says,
  released,
  release,
}: {
  className: string;
  /** What is being stamped, for a reader who cannot see which cell it is on: "Released", "The library, released". */
  says: string;
  /** The day, as YYYY-MM-DD. */
  released: string;
  /** The release's number on GIFcommit's master list. */
  release: number;
}) {
  return (
    <p className={`stamp ${className}`}>
      <span className="stamp__day">
        <span className="visually-hidden">{says} </span>
        <time dateTime={released}>{writeDate(released)}</time>
        <span className="visually-hidden">, as </span>
      </span>
      {/* Written exactly: nothing here changes the name's case. */}
      <span className="stamp__serial">{serial(release)}</span>
    </p>
  );
}
