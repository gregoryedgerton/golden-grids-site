import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * The clip's bytes, fetched once, when the clip is first wanted, and null
 * until they have arrived. A reader it is never shown to fetches nothing.
 */
function useFetched(clip: string, wanted: boolean): Blob | null {
  const [fetched, setFetched] = useState<Blob | null>(null);

  useEffect(() => {
    if (!wanted || fetched) return;
    let waiting = true;
    fetch(clip)
      .then((answer) => (answer.ok ? answer.blob() : Promise.reject(new Error(`${answer.status} for the clip`))))
      .then((blob) => {
        if (waiting) setFetched(blob);
      })
      // Without the clip the cell stands on its plain ground. Nothing is lost that a reader has to be told of.
      .catch(() => {});
    return () => {
      waiting = false;
    };
  }, [clip, wanted, fetched]);

  return fetched;
}

/**
 * A moving picture behind a cell's content, with a scrim over it so type set
 * on top stays legible whatever frame is showing. It is decoration: hidden
 * from assistive technology, and it takes no clicks.
 *
 * `clip` is a GIF that is shown through once and rests on its last frame. It
 * is on the page only while `playing`, and it plays once, from its first
 * frame, each time it is put there. A GIF cannot be paused, which is why this
 * one must not repeat or run long: see the test of the title's clip.
 *
 * `still` is a picture to show in its place, for a reader who has asked for
 * no motion.
 */
export function Backdrop({ clip, playing, still }: { clip: string; playing: boolean; still?: string }) {
  const fetched = useFetched(clip, playing);
  const picture = useRef<HTMLImageElement>(null);

  // Each showing gets an address of its own. A browser keeps a GIF's place
  // once it has played: a new picture of the same file starts again in some
  // browsers and shows only the last frame in others. A new address is a new
  // picture to all of them, so every showing starts from the first frame.
  useLayoutEffect(() => {
    // The picture is on the page only when there is something to show in it.
    const shown = picture.current;
    if (!shown) return;
    const address = URL.createObjectURL(fetched as Blob);
    shown.src = address;
    return () => URL.revokeObjectURL(address);
  }, [playing, fetched]);

  return (
    <div className="backdrop" aria-hidden="true">
      {!playing && still && <img className="backdrop__picture" src={still} alt="" />}
      {playing && fetched && <img className="backdrop__picture" ref={picture} alt="" />}
      <div className="backdrop__scrim" />
    </div>
  );
}
