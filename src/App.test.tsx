import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("plays the title's video only while the title is the focused cell", () => {
    render(<App />);
    expect(document.querySelector(".bgvideo iframe")).toBeInTheDocument();
    cleanup();
    // Reduced motion, so the dial steps at once; the reader then asks for the video.
    setReducedMotion(true);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Play video" }));
    expect(document.querySelector(".bgvideo iframe")).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(document.querySelector(".bgvideo iframe")).toBeNull();
    // And it is still their choice when they come back.
    fireEvent.keyDown(document.body, { key: "ArrowUp" });
    expect(document.querySelector(".bgvideo iframe")).toBeInTheDocument();
  });

  it("keeps the video stopped after a trip deep enough to remove the title cell", () => {
    setReducedMotion(true);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Play video" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause video" }));
    for (let i = 0; i < 5; i++) fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(document.querySelector(".title")).toBeNull();
    fireEvent.keyDown(document.body, { key: "Home" });
    expect(document.querySelector(".bgvideo iframe")).toBeNull();
    // Reduced motion would have left it stopped anyway; the reader's choice does so with motion allowed too.
    act(() => setReducedMotion(false));
    expect(document.querySelector(".bgvideo iframe")).toBeNull();
    expect(screen.getByRole("button", { name: "Play video" })).toBeInTheDocument();
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
