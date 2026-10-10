import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { setReducedMotion } from "../../test/media";
import { CellCurrent } from "../dial/current";
import { site } from "../site";
import { embedUrl } from "../ui/BackgroundVideo";
import { parseStudy, studies } from "../studies";
import { fontHref } from "../ui/fonts";
import { Gallery } from "./Gallery";
import { buildCells } from "./index";
import { PARAMETERS, Parameters } from "./Parameters";
import { Signup } from "./Signup";
import { StudyCell } from "./StudyCell";
import { Title } from "./Title";
import { Vision } from "./Vision";

const espn = parseStudy(
  {
    number: 6,
    brand: "GIFspn",
    reference: "ESPN",
    subject: "A sports front page",
    url: "https://example.com/study-06/",
    colors: { ground: "#cc0000", ink: "#ffffff", accent: "#000000" },
    font: { family: "Barlow Condensed", weight: 800, italic: true },
    icon: "scoreboard",
  },
  "espn",
);

describe("Title", () => {
  it("says who presents it, names the library, and gives its version and where to get it", async () => {
    const { container } = render(<Title />);
    expect(screen.getByText("GIFcommit presents")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Golden Grids" })).toBeInTheDocument();
    expect(screen.getByText(/^Version/).parentElement).toHaveTextContent(`Version v${site.version}`);
    expect(screen.getByRole("link", { name: "npm" })).toHaveAttribute("href", site.npm);
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", site.github);
    // The name is drawn large, a word to a line.
    expect([...container.querySelectorAll(".title__name g > text:last-child")].map((t) => t.textContent)).toEqual([
      "Golden",
      "Grids",
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Title, and the video behind it", () => {
  const frame = () => document.querySelector(".bgvideo iframe");
  const focused = (current: boolean) => (
    <CellCurrent value={current}>
      <Title />
    </CellCurrent>
  );

  it("plays the video behind the title while the title is the focused cell", async () => {
    const { container } = render(focused(true));
    expect(frame()).toHaveAttribute("src", embedUrl(site.video.id));
    expect(frame()).toHaveAttribute("title", site.video.title);
    // Behind: the video is the cell's first child, and everything else follows it.
    expect(container.querySelector(".title")?.firstElementChild).toHaveClass("bgvideo");
    expect(container.querySelector(".bgvideo__scrim")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `${site.video.title}, on YouTube` })).toHaveAttribute("href", site.video.url);
    expect(site.video.url).toContain(site.video.id);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no player while another cell is focused, or outside a dial", () => {
    const { rerender } = render(focused(false));
    expect(frame()).toBeNull();
    rerender(focused(true));
    expect(frame()).toBeInTheDocument();
    rerender(focused(false));
    expect(frame()).toBeNull();
    rerender(<Title />);
    expect(frame()).toBeNull();
  });

  it("stops and starts with the button", () => {
    render(focused(true));
    fireEvent.click(screen.getByRole("button", { name: "Pause video" }));
    expect(frame()).toBeNull();
    expect(screen.queryByRole("button", { name: "Pause video" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Play video" }));
    expect(frame()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause video" })).toBeInTheDocument();
  });

  it("remembers the reader's choice after the cell has been removed and drawn again", () => {
    const first = render(focused(true));
    fireEvent.click(screen.getByRole("button", { name: "Pause video" }));
    first.unmount();
    // Back from the gallery: still stopped.
    const second = render(focused(true));
    expect(frame()).toBeNull();
    expect(screen.getByRole("button", { name: "Play video" })).toBeInTheDocument();
    second.unmount();
    // And a video asked for under reduced motion is still playing.
    setReducedMotion(true);
    fireEvent.click(render(focused(true)).getByRole("button", { name: "Play video" }));
    cleanup();
    render(focused(true));
    expect(frame()).toBeInTheDocument();
  });

  it("does not start by itself for a reader who has asked for reduced motion, and plays if they ask", () => {
    setReducedMotion(true);
    render(focused(true));
    expect(frame()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Play video" }));
    expect(frame()).toBeInTheDocument();
  });

  it("stops if reduced motion is turned on while it plays, unless the reader chose to play it", () => {
    const { unmount } = render(focused(true));
    expect(frame()).toBeInTheDocument();
    act(() => setReducedMotion(true));
    expect(frame()).toBeNull();
    expect(screen.getByRole("button", { name: "Play video" })).toBeInTheDocument();
    unmount();
    setReducedMotion(false);
    render(focused(true));
    fireEvent.click(screen.getByRole("button", { name: "Pause video" }));
    fireEvent.click(screen.getByRole("button", { name: "Play video" }));
    act(() => setReducedMotion(true));
    expect(frame()).toBeInTheDocument();
  });
});

describe("Vision", () => {
  it("states what the library is under one heading", async () => {
    const { container } = render(<Vision />);
    expect(screen.getByRole("heading", { level: 2, name: "One layout model, four platforms." })).toBeInTheDocument();
    expect(screen.getByText(/React, React Native, SwiftUI and\s+Jetpack Compose/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Parameters", () => {
  it("is a reference to read: each parameter, its values and what it does", async () => {
    const { container } = render(<Parameters />);
    expect(screen.getByRole("heading", { level: 2, name: "The parameters" })).toBeInTheDocument();
    const terms = screen.getAllByRole("term").map((t) => t.textContent);
    expect(terms).toEqual(["from · to", "skip", "placement", "clockwise"]);
    for (const { term, values, says } of PARAMETERS) {
      const list = screen.getByRole("list", { name: `Values for ${term}` });
      expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual([...values]);
      expect(screen.getByText(says)).toBeInTheDocument();
    }
    // Each term has two descriptions: what it takes, then what it does.
    const item = screen.getByText("skip").closest(".parameters__item") as HTMLElement;
    expect([...item.children].map((c) => c.tagName)).toEqual(["DT", "DD", "DD"]);
    expect(item.children[2]).toHaveTextContent(PARAMETERS[1].says);
    expect(screen.getAllByRole("definition")).toHaveLength(PARAMETERS.length * 2);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("covers the range, skipping, where the spiral starts and which way it turns", () => {
    render(<Parameters />);
    const says = (term: string) => PARAMETERS.find((p) => p.term === term)?.says;
    expect(says("from · to")).toMatch(/positions on the Fibonacci sequence/);
    expect(says("skip")).toMatch(/squares before it are skipped.*not a plain run/);
    expect(within(screen.getByRole("list", { name: "Values for placement" })).getAllByRole("listitem")).toHaveLength(4);
    expect(says("clockwise")).toMatch(/clockwise, or counter-clockwise/);
  });

  it("gives the whole range, 1 to 91, with JavaScript's lower ceiling, and 1 to 5 only as an example", () => {
    render(<Parameters />);
    const range = within(screen.getByRole("list", { name: "Values for from · to" })).getAllByRole("listitem");
    expect(range.map((li) => li.textContent)).toEqual(["1", "91"]);
    const says = PARAMETERS[0].says;
    // The lower ceiling is JavaScript's, so it is React Native's as well as the web's.
    expect(says).toMatch(/from 1 to 91, or to 78 in React and React Native/);
    expect(says).not.toMatch(/on the web/);
    expect(says).toMatch(/1 to 5, say, is five squares/);
  });

  it("is not a grid", () => {
    const { container } = render(<Parameters />);
    expect(container.querySelector(".golden-grid")).toBeNull();
  });
});

describe("Gallery", () => {
  it("counts the studies and says what they are to their references", async () => {
    const { container } = render(<Gallery count={13} />);
    expect(screen.getByRole("heading", { level: 2, name: "The studies" })).toBeInTheDocument();
    expect(container.querySelector(".gallery__count")).toHaveTextContent("13");
    expect(container.querySelector(".gallery__body")).toHaveTextContent(
      "13 sites rebuilt on the grid, each under a parody name. None is affiliated with the site it studies.",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("does not call one study several", () => {
    const { container } = render(<Gallery count={1} />);
    expect(container.querySelector(".gallery__body")).toHaveTextContent(/^1 site rebuilt/);
  });
});

describe("StudyCell", () => {
  it("sets the parody name exactly, with its number, its subject and a way to it", async () => {
    const { container } = render(<StudyCell study={espn} />);
    expect(screen.getByRole("heading", { level: 2, name: "GIFspn" })).toBeInTheDocument();
    expect(screen.getByText("Study 06")).toBeInTheDocument();
    expect(container.querySelector(".study__subject")).toHaveTextContent(
      "A sports front page After ESPN; not affiliated with it.",
    );
    const link = screen.getByRole("link", { name: "Open the study: GIFspn" });
    expect(link).toHaveAttribute("href", espn.url);
    expect(container.querySelector(".study__name")).toHaveTextContent("GIFspn");
    expect(container.querySelector("svg.study__icon")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("carries the study's own colours and face, and asks for the face", () => {
    const { container } = render(<StudyCell study={espn} />);
    const style = (container.querySelector(".study") as HTMLElement).style;
    expect(style.getPropertyValue("--ground")).toBe("#cc0000");
    expect(style.getPropertyValue("--ink")).toBe("#ffffff");
    expect(style.getPropertyValue("--accent")).toBe("#000000");
    expect(style.getPropertyValue("--text")).toBe("#ffffff");
    expect(style.getPropertyValue("--face")).toBe('"Barlow Condensed"');
    expect(style.getPropertyValue("--face-weight")).toBe("800");
    expect(style.getPropertyValue("--face-style")).toBe("italic");
    expect(document.head.querySelector("link[data-face]")).toHaveAttribute("href", fontHref(espn.font, "GIFspn"));
  });

  it("sets an upright face upright, a long name a word to a line, and a later number unpadded", () => {
    const records = { ...espn, number: 105, brand: "GIFmilk Records", font: { ...espn.font, italic: false } };
    const { container } = render(<StudyCell study={records} />);
    expect((container.querySelector(".study") as HTMLElement).style.getPropertyValue("--face-style")).toBe("normal");
    expect([...container.querySelectorAll(".study__name text")].map((t) => t.textContent)).toEqual(["GIFmilk", "Records"]);
    expect(screen.getByText("Study 105")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "GIFmilk Records" })).toBeInTheDocument();
  });
});

describe("Signup", () => {
  it("sends an address straight to the list when the list is open", async () => {
    const { container } = render(<Signup action="https://example.beehiiv.com/subscribe" />);
    expect(screen.getByRole("heading", { level: 2, name: "Next study, by email." })).toBeInTheDocument();
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form).toHaveAttribute("action", "https://example.beehiiv.com/subscribe");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("target", "_blank");
    expect(form).toHaveAttribute("rel", "noopener");
    const field = screen.getByLabelText("Email address");
    expect(field).toHaveAttribute("type", "email");
    expect(field).toHaveAttribute("name", "email");
    expect(field).toHaveAttribute("autocomplete", "email");
    expect(field).toBeRequired();
    expect(field).toHaveAccessibleDescription(/sent with Beehiiv\. Subscribing opens Beehiiv in a new tab\./);
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeEnabled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("cannot be sent, and says so, while the list is not open", async () => {
    const { container } = render(<Signup action="" />);
    expect(container.querySelector("form")).not.toHaveAttribute("action");
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeDisabled();
    expect(screen.getByLabelText("Email address")).toHaveAccessibleDescription("The list is not open yet.");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("gives two forms on one page fields of their own", () => {
    render(
      <>
        <Signup action="" />
        <Signup action="" />
      </>,
    );
    const [a, b] = screen.getAllByLabelText("Email address");
    expect(a?.id).not.toBe(b?.id);
  });
});

describe("buildCells", () => {
  const cells = buildCells(studies, "https://example.beehiiv.com/subscribe");

  it("runs introduction, gallery, studies in order, then the sign-up", () => {
    expect(cells.map((cell) => cell.id)).toEqual([
      "title",
      "vision",
      "parameters",
      "gallery",
      ...studies.map((study) => `study-${study.number}`),
      "signup",
    ]);
    expect(new Set(cells.map((cell) => cell.id)).size).toBe(cells.length);
  });

  it("labels each study by number and name, and draws it on its own ground", () => {
    const study = studies[1] as (typeof studies)[number];
    expect(cells[5]).toMatchObject({ label: `Study ${study.number}: ${study.brand}`, ground: study.colors.ground });
    render(<>{cells[5]?.content}</>);
    expect(screen.getByRole("heading", { level: 2, name: study.brand })).toBeInTheDocument();
  });

  it("counts the studies it was given on the gallery cell", () => {
    const { container } = render(<>{buildCells(studies.slice(0, 3), "")[3]?.content}</>);
    expect(container.querySelector(".gallery__count")).toHaveTextContent("3");
  });

  it("puts the email field in the last cell and nowhere else", () => {
    cells.forEach((cell, i) => {
      const { container, unmount } = render(<>{cell.content}</>);
      const fields = within(container).queryAllByRole("textbox");
      expect(fields).toHaveLength(i === cells.length - 1 ? 1 : 0);
      expect(container.querySelectorAll("form")).toHaveLength(i === cells.length - 1 ? 1 : 0);
      unmount();
    });
    render(<>{cells.at(-1)?.content}</>);
    expect(document.querySelector("form")).toHaveAttribute("action", "https://example.beehiiv.com/subscribe");
  });

  it("is a dial of two cells or more even with no studies", () => {
    expect(buildCells([], "").map((cell) => cell.id)).toEqual(["title", "vision", "parameters", "gallery", "signup"]);
  });
});
