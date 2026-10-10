import { render } from "@testing-library/react";
import { fontHref, useFont } from "./fonts";
import type { Face } from "./fonts";

const figtree: Face = { family: "Figtree", weight: 800, italic: false };
const barlow: Face = { family: "Barlow Condensed", weight: 800, italic: true };

function Uses({ face, text }: { face: Face; text: string }) {
  useFont(face, text);
  return null;
}

const links = () => [...document.head.querySelectorAll<HTMLLinkElement>("link[data-face]")];

describe("fontHref", () => {
  it("asks for one weight of one family, cut down to the letters used", () => {
    expect(fontHref(figtree, "GIFbnb")).toBe(
      "https://fonts.googleapis.com/css2?family=Figtree:wght@800&text=FGIbn&display=swap",
    );
  });

  it("asks for the italic when the face is italic, and joins a family's words with a plus", () => {
    expect(fontHref(barlow, "GIFspn")).toBe(
      "https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,800&text=FGInps&display=swap",
    );
  });

  it("encodes letters an address cannot carry", () => {
    expect(fontHref(figtree, "GIFn'now & co")).toContain("&text=%20%26'FGIcnow&display=swap");
  });
});

describe("useFont", () => {
  it("adds the face's stylesheet to the page", () => {
    render(<Uses face={figtree} text="GIFbnb" />);
    expect(links()).toHaveLength(1);
    expect(links()[0]).toHaveAttribute("href", fontHref(figtree, "GIFbnb"));
    expect(links()[0]).toHaveAttribute("rel", "stylesheet");
    expect(links()[0]?.dataset.face).toBe("Figtree");
  });

  it("asks once however many cells use the same face for the same letters", () => {
    render(
      <>
        <Uses face={figtree} text="GIFbnb" />
        <Uses face={figtree} text="GIFbnb" />
      </>,
    );
    expect(links()).toHaveLength(1);
  });

  it("asks again for a different face or different letters", () => {
    const { rerender } = render(<Uses face={figtree} text="GIFbnb" />);
    rerender(<Uses face={figtree} text="GIFx" />);
    rerender(<Uses face={barlow} text="GIFx" />);
    expect(links().map((link) => link.getAttribute("href"))).toEqual([
      fontHref(figtree, "GIFbnb"),
      fontHref(figtree, "GIFx"),
      fontHref(barlow, "GIFx"),
    ]);
  });
});
