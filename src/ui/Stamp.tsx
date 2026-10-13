import { serial } from "../site";

/**
 * A release's stamp, at the top left of the cell that stands for it: its
 * serial among GIFcommit's releases, and nothing else. It is set light, by
 * the owner's direction: it is there to be found, not to be read first.
 * Every cell that is a release wears the same one in the same place: each
 * study's, the library's on the title and this site's on the last cell.
 */
export function Stamp({
  className,
  says,
  release,
}: {
  className: string;
  /** What the serial is, for a reader who cannot see which cell it is on: "Release", "Library release". */
  says: string;
  /** The release's number on GIFcommit's master list. */
  release: number;
}) {
  return (
    <p className={`stamp ${className}`}>
      <span className="visually-hidden">{says} </span>
      {/* Written exactly: nothing here changes the name's case. */}
      {serial(release)}
    </p>
  );
}
