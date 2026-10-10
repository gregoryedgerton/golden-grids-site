import { render } from "@testing-library/react";
import { isPath } from "./icons";
import { LOGO_NAMES, Logo } from "./logos";

describe("Logo", () => {
  it("has a mark for React, Apple and Android", () => {
    expect([...LOGO_NAMES].sort()).toEqual(["android", "apple", "react"]);
  });

  it.each(LOGO_NAMES)("draws %s as one path in the text colour, hidden from assistive technology", (name) => {
    const { container } = render(<Logo name={name} className="mark" />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("fill", "currentColor");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).toHaveClass("mark");
    const paths = svg.querySelectorAll("path");
    expect(paths).toHaveLength(1);
    expect(isPath(paths[0]?.getAttribute("d"))).toBe(true);
  });
});
