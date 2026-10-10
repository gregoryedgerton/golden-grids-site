import type { CSSProperties } from "react";
import type { Study } from "../studies";
import { FitText } from "../ui/FitText";
import { useFont } from "../ui/fonts";
import { Icon } from "../ui/icons";

const two = (n: number) => String(n).padStart(2, "0");

/** One study's lockup: its parody name in its own colours and face, and the way to it. */
export function StudyCell({ study }: { study: Study }) {
  const { brand, colors, font, number, reference, subject, url } = study;
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
      <p className="study__number">Study {two(number)}</p>
      <Icon name={study.icon} className="study__icon" />
      {/* The name is written exactly; nothing here changes its case. */}
      <h2 className="visually-hidden">{brand}</h2>
      <FitText className="study__name" lines={brand.split(" ")} leading={0.9} />
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
