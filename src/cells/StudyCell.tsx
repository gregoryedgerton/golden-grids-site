import type { CSSProperties } from "react";
import { serial } from "../site";
import type { Study } from "../studies";
import { FitText } from "../ui/FitText";
import { useFont } from "../ui/fonts";
import { Icon } from "../ui/icons";

/**
 * One study's lockup: its parody name in its own colours and face, and the
 * way to it. At its top left is the study's serial among GIFcommit's
 * releases, by the owner's direction, where the day it was published was.
 */
export function StudyCell({ study }: { study: Study }) {
  const { brand, colors, font, release, reference, subject, url } = study;
  useFont(font, brand);
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
      <p className="study__release">
        <span className="visually-hidden">Release </span>
        {serial(release)}
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
        <a className="study__link" href={url}>
          Open the study<span className="visually-hidden">: {brand}</span>
        </a>
      </div>
    </div>
  );
}
