import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { setReducedMotion } from "../test/media";
import { App } from "./App";
import { site } from "./site";
import { studies } from "./studies";

const total = studies.length + 5;
const announced = () => screen.getByTestId("dial-announce").textContent;

describe("App", () => {
  it("opens the dial on the title, linked to npm with the version it was built against", () => {
    render(<App />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Golden Grids" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "npm" })).toHaveAttribute("href", site.npm);
    expect(site.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(announced()).toBe(`Golden Grids, 1 of ${total}`);
  });

  it("offers the sign-up only in the last cell", () => {
    setReducedMotion(true);
    render(<App />);
    for (let i = 1; i < total; i++) {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(document.querySelectorAll('.dial__content:not([inert]) input')).toHaveLength(0);
      fireEvent.keyDown(document.body, { key: "ArrowDown" });
    }
    expect(announced()).toBe(`The mailing list, ${total} of ${total}`);
    expect(screen.getByRole("textbox", { name: "Email address" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("has no accessibility violations axe can detect, at either end or in the gallery", async () => {
    setReducedMotion(true);
    const { container } = render(<App />);
    expect(await axe(container)).toHaveNoViolations();
    for (let i = 0; i < 6; i++) fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.keyDown(document.body, { key: "End" });
    expect(await axe(container)).toHaveNoViolations();
  });
});
