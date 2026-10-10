import { render } from "@testing-library/react";
import { ICON_NAMES, Icon, isPath } from "./icons";

describe("Icon", () => {
  it.each(ICON_NAMES)("draws %s as decoration", (name) => {
    const { container } = render(<Icon name={name} className="mark" />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).toHaveClass("mark");
    expect(svg.querySelectorAll("path, circle, rect").length).toBeGreaterThan(0);
  });

  it("draws a path a study brings with it, the same way", () => {
    const { container } = render(<Icon name={{ path: "M3 20 12 4l9 16z" }} className="mark" />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg.querySelectorAll("path")).toHaveLength(1);
    expect(svg.querySelector("path")).toHaveAttribute("d", "M3 20 12 4l9 16z");
  });

  it("has an icon for every kind of subject, each drawn differently", () => {
    const drawings = ICON_NAMES.map((name) => render(<Icon name={name} />).container.innerHTML);
    expect(new Set(drawings).size).toBe(ICON_NAMES.length);
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(13);
  });
});

describe("isPath", () => {
  it("accepts path data", () => {
    expect(isPath("M3 11 12 3l9 8M5 9.5V21h5v-6h4v6h5V9.5")).toBe(true);
    expect(isPath("m1-1e-3 2.5,+3 A1 1 0 0 1 2 2z")).toBe(true);
    expect(isPath("M0 0")).toBe(true);
  });

  it("refuses anything else", () => {
    for (const value of ["", "L3 4", "<path>", 'M0 0"', "M0 0;", "url(x)", 4, null, undefined, { path: "M0 0" }]) {
      expect(isPath(value)).toBe(false);
    }
  });
});
