import { render } from "@testing-library/react";
import { ICON_NAMES, Icon } from "./icons";

describe("Icon", () => {
  it.each(ICON_NAMES)("draws %s as decoration", (name) => {
    const { container } = render(<Icon name={name} className="mark" />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).toHaveClass("mark");
    expect(svg.querySelectorAll("path, circle, rect").length).toBeGreaterThan(0);
  });

  it("has an icon for every kind of subject, each drawn differently", () => {
    const drawings = ICON_NAMES.map((name) => render(<Icon name={name} />).container.innerHTML);
    expect(new Set(drawings).size).toBe(ICON_NAMES.length);
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(13);
  });
});
