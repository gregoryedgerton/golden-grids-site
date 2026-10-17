import { useRef } from "react";
import type { CSSProperties } from "react";
import { writeDate } from "../studies";
import type { Study } from "../studies";
import { FitText } from "../ui/FitText";
import { useFont } from "../ui/fonts";
import { Icon } from "../ui/icons";
import { Stamp } from "../ui/Stamp";
import { ASK, StudyNotice } from "./StudyNotice";

/**
 * One study's lockup: its parody name in its own colours and face, and the
 * way to it. The day it was published is at its top left. Its stamp, the
 * study's serial among GIFcommit's releases, is the cell's last line, a line
 * of its own under the foot.
 *
 * Its link keeps the study's address, but a click on it asks first: the
 * study's notice says, in the same colours and face, that it is a study.
 */
export function StudyCell({ study }: { study: Study }) {
  const { brand, colors, font, published, release, reference, subject, url } = study;
  useFont(font, brand + ASK);
  const notice = useRef<HTMLDialogElement>(null);
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
      <FitText className="study__name" lines={brand.split(" ")} leading={0.9} tints={colors.letters} />
      <div className="study__foot">
        <p className="study__subject">
          {subject}
          <span className="study__after"> After {reference}; not affiliated with it.</span>
        </p>
        <a
          className="study__link"
          href={url}
          onClick={(event) => {
            event.preventDefault();
            (notice.current as HTMLDialogElement).showModal();
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
