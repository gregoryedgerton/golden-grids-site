import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { BackgroundVideo, embedUrl } from "./BackgroundVideo";

describe("embedUrl", () => {
  const url = new URL(embedUrl("abc123XYZ_-"));

  it("is YouTube's own player on the privacy-enhanced host", () => {
    expect(url.origin).toBe("https://www.youtube-nocookie.com");
    expect(url.pathname).toBe("/embed/abc123XYZ_-");
  });

  it("plays silently, by itself, in place, and over again", () => {
    expect(url.searchParams.get("autoplay")).toBe("1");
    expect(url.searchParams.get("mute")).toBe("1");
    expect(url.searchParams.get("playsinline")).toBe("1");
    expect(url.searchParams.get("loop")).toBe("1");
    // A single video loops only as a playlist of itself.
    expect(url.searchParams.get("playlist")).toBe("abc123XYZ_-");
  });

  it("shows no controls and takes no keys", () => {
    expect(url.searchParams.get("controls")).toBe("0");
    expect(url.searchParams.get("disablekb")).toBe("1");
    expect(url.searchParams.get("rel")).toBe("0");
    expect(url.searchParams.get("iv_load_policy")).toBe("3");
  });
});

describe("BackgroundVideo", () => {
  it("is the player and a scrim over it, as decoration nothing can reach", async () => {
    const { container } = render(<BackgroundVideo id="abc" title="A video" playing />);
    const wrapper = container.querySelector(".bgvideo") as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    const frame = wrapper.querySelector("iframe") as HTMLIFrameElement;
    expect(frame).toHaveAttribute("src", embedUrl("abc"));
    expect(frame).toHaveAttribute("title", "A video");
    expect(frame).toHaveAttribute("tabindex", "-1");
    expect(frame).toHaveAttribute("allow", "autoplay; encrypted-media");
    // Without a referrer YouTube refuses to play an embedded video.
    expect(frame).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    // The scrim comes after the player, so it is drawn over it.
    expect(frame.nextElementSibling).toHaveClass("bgvideo__scrim");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows a still in the video's place while it is not playing, under the scrim", () => {
    const { container, rerender } = render(<BackgroundVideo id="abc" title="A video" playing={false} still="/still.jpg" />);
    const picture = container.querySelector("img.bgvideo__still") as HTMLImageElement;
    expect(picture).toHaveAttribute("src", "/still.jpg");
    // Decoration, like the video: no description, inside the hidden wrapper, under the scrim.
    expect(picture).toHaveAttribute("alt", "");
    expect(picture.closest("[aria-hidden='true']")).toHaveClass("bgvideo");
    expect(picture.nextElementSibling).toHaveClass("bgvideo__scrim");
    expect(container.querySelector("iframe")).toBeNull();
    // Never both: when the video plays, the still is gone.
    rerender(<BackgroundVideo id="abc" title="A video" playing still="/still.jpg" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("iframe")).toBeInTheDocument();
  });

  it("has no picture when it is given none", () => {
    const { container } = render(<BackgroundVideo id="abc" title="A video" playing={false} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("has no player at all when it is not playing, and keeps the scrim", () => {
    const { container, rerender } = render(<BackgroundVideo id="abc" title="A video" playing={false} />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector(".bgvideo__scrim")).toBeInTheDocument();
    rerender(<BackgroundVideo id="abc" title="A video" playing />);
    expect(container.querySelector("iframe")).toBeInTheDocument();
    rerender(<BackgroundVideo id="abc" title="A video" playing={false} />);
    expect(container.querySelector("iframe")).toBeNull();
  });
});
