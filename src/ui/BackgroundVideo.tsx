/**
 * The address of YouTube's own player for a video, set to play as a silent,
 * looping backdrop. The video stays YouTube's: nothing of it is copied here.
 * The privacy-enhanced host sets no cookies until the video plays.
 */
export function embedUrl(id: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    // A single video loops only as a playlist of itself.
    playlist: id,
    controls: "0",
    disablekb: "1",
    playsinline: "1",
    rel: "0",
    iv_load_policy: "3",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

/**
 * A video behind a cell's content, with a scrim over it so type set on top
 * stays legible whatever frame is showing. It is decoration: hidden from
 * assistive technology, out of the tab order, and it takes no clicks. The
 * player exists only while `playing`, so stopping it is removing it.
 *
 * `still` is a picture to show in the video's place while it is not playing:
 * one frame of it, for a reader who has asked for no motion.
 */
export function BackgroundVideo({
  id,
  title,
  playing,
  still,
}: {
  id: string;
  title: string;
  playing: boolean;
  still?: string;
}) {
  return (
    <div className="bgvideo" aria-hidden="true">
      {!playing && still && <img className="bgvideo__still" src={still} alt="" />}
      {playing && (
        <iframe
          src={embedUrl(id)}
          title={title}
          tabIndex={-1}
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
      <div className="bgvideo__scrim" />
    </div>
  );
}
