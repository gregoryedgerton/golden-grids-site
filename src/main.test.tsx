import { act, screen } from "@testing-library/react";

describe("main", () => {
  it("mounts the app into #root", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await act(async () => {
      await import("./main");
    });
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
