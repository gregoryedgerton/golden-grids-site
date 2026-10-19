import { useRef } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { useDialRest } from "../dial/current";
import { writeDate } from "../studies";
import type { Study } from "../studies";
import { FitText } from "../ui/FitText";
import { useFont } from "../ui/fonts";
import { Icon } from "../ui/icons";
import { Stamp } from "../ui/Stamp";
import { ASK, StudyNotice, showNotice } from "./StudyNotice";

/**
 * One study's lockup: its parody name in its own colours and face, and the
 * way to it. The day it was published is at its top left. Its stamp, the
 * study's serial among GIFcommit's releases, is the cell's last line, a line
 * of its own under the foot.
 *
 * Its link keeps the study's address, but a click on it asks first, a middle
 * click too: the study's notice says, in the same colours and face, that it
 * is a study.
 */
export function StudyCell({ study }: { study: Study }) {
  const { brand, colors, font, published, release, reference, subject, url } = study;
  useFont(font, brand + ASK);
  const notice = useRef<HTMLDialogElement>(null);
  const rest = useDialRest();
  const ask = (event: MouseEvent) => {
    event.preventDefault();
    // The cell is the focused one, so the dial may still be on its way, or
    // under a finger: it comes to rest on this cell, and nothing moves
    // behind the notice.
    rest();
    showNotice(notice.current as HTMLDialogElement);
  };
  const style = {
    "--ink": colors.ink,
    "--accent": colors.accent,
    "--text": colors.text,
    "--ground": colors.ground,
    "--face": `"${font.family}"`,
    "--face-weight": font.weight,
    "--face-style": font.italic ? "italic" : "normal",
  } as CSSProperties;

  return (
    <div className="cell study" style={style}>
      <p className="study__date">
        <span className="visually-hidden">Published </span>
        <time dateTime={published}>{writeDate(published)}</time>
      </p>
      <Icon name={study.icon} className="study__icon" />
      {/* The name is written exactly; nothing here changes its case. */}
      <h2 className="visually-hidden">{brand}</h2>
      {/* The name, and right under it the site it is inspired by, as one lockup in the middle of the cell. */}
      <div className="study__lockup">
        <FitText className="study__name" lines={brand.split(" ")} leading={0.9} tints={colors.letters} start />
        <p className="study__inspired">Inspired by {reference}</p>
      </div>
      <div className="study__foot">
        {/* The owner's words, one size throughout: the pages the study explored. The reference is under the name. */}
        <p className="study__subject">{subject} pages were explored in this Golden Grids case study.</p>
        <a
          className="study__link"
          href={url}
          onClick={ask}
          // A middle click opens a link in a new tab, and is heard as an auxclick, not a click.
          onAuxClick={(event) => {
            if (event.button === 1) ask(event);
          }}
        >
          Open the study<span className="visually-hidden">: {brand}</span>
        </a>
      </div>
      <Stamp className="study__release" says="Release" release={release} />
      <StudyNotice study={study} style={style} ref={notice} />
    </div>
  );
}
