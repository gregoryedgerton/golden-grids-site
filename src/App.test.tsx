import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { App } from "./App";
import { site } from "./site";

describe("App", () => {
  it("opens the dial on the library's name, linked to npm with the version it was built against", () => {
    render(<App />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Golden Grids" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /GIFcommit on npm/ });
    expect(link).toHaveAttribute("href", site.npm);
    expect(link).toHaveTextContent(`version ${site.version}`);
    expect(site.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(screen.getByTestId("dial-announce")).toHaveTextContent("Golden Grids, 1 of 10");
  });

  it("has no accessibility violations axe can detect", async () => {
    const { container } = render(<App />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
