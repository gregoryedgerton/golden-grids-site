import { useEffect } from "react";

export type Face = {
  /** A family on Google Fonts, under an open licence. */
  family: string;
  weight: number;
  italic: boolean;
};

/**
 * The stylesheet for one face, cut down to the letters it will set. A study
 * sets one name in its face, so a hundred studies cost a hundred small
 * requests made only as their cells come near, not a hundred font files.
 */
export function fontHref({ family, weight, italic }: Face, text: string): string {
  const axis = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
  const letters = [...new Set(text)].sort().join("");
  return `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:${axis}&text=${encodeURIComponent(letters)}&display=swap`;
}

/** Asks for a face once, however many cells use it. */
export function useFont(face: Face, text: string): void {
  const href = fontHref(face, text);
  useEffect(() => {
    for (const link of document.head.querySelectorAll<HTMLLinkElement>("link[data-face]")) {
      if (link.getAttribute("href") === href) return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.face = face.family;
    document.head.append(link);
    // The family is part of the address.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);
}
