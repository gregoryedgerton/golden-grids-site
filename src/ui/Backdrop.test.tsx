import { StrictMode } from "react";
import { act, render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { answer } from "../../test/clip";
import { Backdrop } from "./Backdrop";

/** Let what has been fetched arrive and be drawn. */
const arrived = () => act(async () => {});
const pictures = (container: HTMLElement) => [...container.querySelectorAll("img")].map((picture) => picture.getAttribute("src"));

describe("Backdrop", () => {
  it("is a scrim over nothing while it is not playing, as decoration nothing can reach, and fetches nothing", async () => {
    const { container } = render(<Backdrop clip="/clip.gif" playing={false} />);
    await arrived();
    const wrapper = container.querySelector(".backdrop") as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(pictures(container)).toEqual([]);
    expect(wrapper.querySelector(".backdrop__scrim")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("fetches the clip when it is first to play, and shows it from an address of its own, under the scrim", async () => {
    const { container } = render(<Backdrop clip="/clip.gif" playing />);
    // Nothing to show until it has arrived.
    expect(pictures(container)).toEqual([]);
    await arrived();
    expect(vi.mocked(fetch).mock.calls.map(([address]) => address)).toEqual(["/clip.gif"]);
    const picture = container.querySelector("img") as HTMLImageElement;
    expect(picture).toHaveAttribute("src", "blob:showing/1");
    // Decoration: no description, inside the hidden wrapper, and the scrim after it, so drawn over it.
    expect(picture).toHaveAttribute("alt", "");
    expect(picture).toHaveClass("backdrop__picture");
    expect(picture.closest("[aria-hidden='true']")).toHaveClass("backdrop");
    expect(picture.nextElementSibling).toHaveClass("backdrop__scrim");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("plays it from the start each time it is put back: a new picture at a new address, the old address given up", async () => {
    const given = vi.spyOn(URL, "revokeObjectURL");
    const { container, rerender } = render(<Backdrop clip="/clip.gif" playing />);
    await arrived();
    const first = container.querySelector("img");
    expect(pictures(container)).toEqual(["blob:showing/1"]);

    rerender(<Backdrop clip="/clip.gif" playing={false} />);
    expect(pictures(container)).toEqual([]);
    expect(given.mock.calls).toEqual([["blob:showing/1"]]);

    rerender(<Backdrop clip="/clip.gif" playing />);
    expect(pictures(container)).toEqual(["blob:showing/2"]);
    expect(container.querySelector("img")).not.toBe(first);
    // It was fetched once. Every showing is made from what was fetched.
    expect(fetch).toHaveBeenCalledTimes(1);

    rerender(<Backdrop clip="/clip.gif" playing={false} />);
    rerender(<Backdrop clip="/clip.gif" playing />);
    expect(pictures(container)).toEqual(["blob:showing/3"]);
    expect(given.mock.calls).toEqual([["blob:showing/1"], ["blob:showing/2"]]);
  });

  it("gives up its address when it is removed", async () => {
    const given = vi.spyOn(URL, "revokeObjectURL");
    const { unmount } = render(<Backdrop clip="/clip.gif" playing />);
    await arrived();
    unmount();
    expect(given.mock.calls).toEqual([["blob:showing/1"]]);
  });

  it("shows a still in the clip's place while it is not playing, under the scrim, and never both", async () => {
    const { container, rerender } = render(<Backdrop clip="/clip.gif" playing={false} still="/still.jpg" />);
    await arrived();
    const picture = container.querySelector("img") as HTMLImageElement;
    expect(picture).toHaveAttribute("src", "/still.jpg");
    expect(picture).toHaveAttribute("alt", "");
    expect(picture).toHaveClass("backdrop__picture");
    expect(picture.nextElementSibling).toHaveClass("backdrop__scrim");
    expect(fetch).not.toHaveBeenCalled();
    // When the clip plays, the still is gone: at once, before the clip has even arrived.
    rerender(<Backdrop clip="/clip.gif" playing still="/still.jpg" />);
    expect(pictures(container)).toEqual([]);
    await arrived();
    expect(pictures(container)).toEqual(["blob:showing/1"]);
    rerender(<Backdrop clip="/clip.gif" playing={false} still="/still.jpg" />);
    expect(pictures(container)).toEqual(["/still.jpg"]);
  });

  it("stands on the cell's plain ground if the clip cannot be had, and asks for it again the next time it is to play", async () => {
    // Refused by the server.
    vi.mocked(fetch).mockImplementation(async () => answer(false));
    const { container, rerender } = render(<Backdrop clip="/clip.gif" playing />);
    await arrived();
    expect(pictures(container)).toEqual([]);
    expect(container.querySelector(".backdrop__scrim")).toBeInTheDocument();

    // Never arriving at all.
    vi.mocked(fetch).mockImplementation(async () => {
      throw new TypeError("the network is down");
    });
    rerender(<Backdrop clip="/clip.gif" playing={false} />);
    rerender(<Backdrop clip="/clip.gif" playing />);
    await arrived();
    expect(pictures(container)).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);

    // And had at last.
    vi.mocked(fetch).mockImplementation(async () => answer());
    rerender(<Backdrop clip="/clip.gif" playing={false} />);
    rerender(<Backdrop clip="/clip.gif" playing />);
    await arrived();
    expect(pictures(container)).toEqual(["blob:showing/1"]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("stops fetching a clip that stops being wanted before it has arrived, and asks for it again when it is wanted", async () => {
    // A fetch that takes its time, and gives up when it is told to, as a real one does.
    const asked: AbortSignal[] = [];
    vi.mocked(fetch).mockImplementationOnce(
      (_, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal as AbortSignal;
          asked.push(signal);
          signal.addEventListener("abort", () => reject(new DOMException("stopped", "AbortError")));
        }),
    );
    const { container, rerender } = render(<Backdrop clip="/clip.gif" playing />);
    await arrived();
    expect(pictures(container)).toEqual([]);
    expect(asked.map((signal) => signal.aborted)).toEqual([false]);

    // The reader turns motion off, or moves on, with most of it still to come. The rest is not fetched.
    rerender(<Backdrop clip="/clip.gif" playing={false} still="/still.jpg" />);
    expect(asked.map((signal) => signal.aborted)).toEqual([true]);
    await arrived();
    expect(pictures(container)).toEqual(["/still.jpg"]);

    // Wanted again: asked for again, and this time it comes and is shown.
    rerender(<Backdrop clip="/clip.gif" playing />);
    await arrived();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(pictures(container)).toEqual(["blob:showing/1"]);
  });

  it("does not stop a fetch it still wants, and stops one left in the air when it is removed", async () => {
    const asked: AbortSignal[] = [];
    vi.mocked(fetch).mockImplementation((_, init) => {
      asked.push(init?.signal as AbortSignal);
      return new Promise<Response>(() => {});
    });
    const { rerender, unmount } = render(<Backdrop clip="/clip.gif" playing />);
    // Drawn again for any other reason, the same fetch goes on.
    rerender(<Backdrop clip="/clip.gif" playing still="/still.jpg" />);
    expect(asked.map((signal) => signal.aborted)).toEqual([false]);
    unmount();
    expect(asked.map((signal) => signal.aborted)).toEqual([true]);
  });

  it("ends with one showing at a live address when React mounts it twice, as it does in development", async () => {
    const given = vi.spyOn(URL, "revokeObjectURL");
    const { container } = render(
      <StrictMode>
        <Backdrop clip="/clip.gif" playing />
      </StrictMode>,
    );
    await arrived();
    const shown = pictures(container);
    expect(shown).toHaveLength(1);
    // Whatever addresses were made and given up on the way, the one on the page is not among those given up.
    expect(given.mock.calls.map(([address]) => address)).not.toContain(shown[0]);
  });
});
