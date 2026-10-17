import { useId } from "react";
import type { CSSProperties, MouseEvent, Ref } from "react";
import { createPortal } from "react-dom";
import type { Study } from "../studies";
import { Icon } from "../ui/icons";

/** What the notice asks. Set in the study's face, so the face is asked for these letters too. */
export const ASK = "You Good?";

/** Closes the notice an answer is in. */
function close(event: MouseEvent<HTMLElement>) {
  (event.currentTarget.closest("dialog") as HTMLDialogElement).close();
}

/**
 * Asked before a study opens, by the owner's direction: in the study's own
 * colours and face, that the site it looks like is not the one it is. Shown
 * by its cell as a modal dialog, so the dial behind it is inert and focus is
 * held in it, and closed by Escape or by either answer. Closed, it is not
 * shown and not read.
 *
 * It is placed in the page's body, outside the dial, so the dial's wheel and
 * swipes never hear it, and it is sized to the window rather than to a cell.
 * The dialog itself can take focus, so a click on its text keeps the focus in
 * it and the keys with it.
 */
export function StudyNotice({ study, style, ref }: { study: Study; style: CSSProperties; ref: Ref<HTMLDialogElement> }) {
  const ask = useId();
  const tell = useId();
  const keep = useId();
  const { brand, reference, url } = study;

  return createPortal(
    <dialog className="notice" style={style} ref={ref} aria-labelledby={ask} aria-describedby={`${tell} ${keep}`} tabIndex={-1}>
      <div className="notice__top">
        <p className="notice__brand">{brand}</p>
        <Icon name={study.icon} className="notice__icon" />
      </div>
      <h2 id={ask} className="notice__ask">
        {ASK}
      </h2>
      {/* The owner's words. */}
      <p id={tell} className="notice__tell">
        This isn&apos;t actually {reference}, it&apos;s a layout study for Golden Grids made for wonder and awe.
      </p>
      <p id={keep} className="notice__keep">
        I want you to use the library, not your personal info.
      </p>
      <div className="notice__answers">
        {/* Closed on the way out, so a reader who comes back finds the dial as they left it. */}
        <a className="notice__yes" href={url} onClick={close}>
          Yes, continue
        </a>
        <button type="button" className="notice__no" onClick={close}>
          No, stay here
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
