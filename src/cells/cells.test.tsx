import { act, render, screen, within } from "@testing-library/react";
import html from "../../index.html?raw";
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
import { LENS, PLATFORMS, Vision } from "./Vision";

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
    expect(await axe(container)).toHaveNoViolations();
  });

  it("sets the name a word to a line at one size, the second word starting a little along from the first", () => {
    const { container } = render(<Title />);
    const lines = [...container.querySelectorAll(".title__name g.fit__line")];
    expect(lines.map((g) => g.querySelector("text:last-child")?.textContent)).toEqual(["Golden", "Grids"]);
    const placed = lines.map((g) => {
      const [x, , scale] = (g.getAttribute("transform")?.match(/-?[\d.]+/g) as string[]).map(Number) as [number, number, number];
      return { x, scale };
    });
    // One size for both words.
    expect(placed[0]?.scale).toBe(placed[1]?.scale);
    // "Grids" starts after the G of "Golden" (a glyph is 50 units wide here, at 100 to the em) and before its end.
    const glyph = 50 * (placed[0]?.scale as number);
    expect(placed[0]?.x).toBe(0);
    expect(placed[1]?.x).toBeGreaterThan(glyph);
    expect(placed[1]?.x).toBeLessThan(3 * glyph);
  });

  it("gives the name a gold gradient and depth that recedes to a point below it and to its left", () => {
    const { container } = render(<Title />);
    const name = container.querySelector(".title__name") as SVGSVGElement;
    expect(name.querySelectorAll("linearGradient stop").length).toBeGreaterThanOrEqual(3);
    for (const face of name.querySelectorAll(".fit__line > text:last-child")) {
      expect(face.getAttribute("fill")).toMatch(/^url\(#fit/);
    }
    const layers = [...name.querySelectorAll("g.fit__layer")];
    expect(layers.length).toBeGreaterThanOrEqual(12);
    // translate(x y) scale(s) translate(-x -y): the point is left of the drawing and below it.
    const [x, y, shrink] = (layers[0]?.getAttribute("transform")?.match(/-?[\d.]+/g) as string[]).map(Number) as [number, number, number];
    const height = Number(name.getAttribute("viewBox")?.split(" ")[3]);
    expect(x).toBeLessThan(0);
    expect(y).toBeGreaterThan(height);
    expect(shrink).toBeLessThan(1);
    expect(shrink).toBeGreaterThan(0.8);
  });

  it("puts the version at the foot, first, and carries no instructions, video link or video button", () => {
    const { container } = render(<Title />);
    const cell = container.querySelector(".title") as HTMLElement;
    const foot = cell.lastElementChild as HTMLElement;
    expect(foot).toHaveClass("title__foot");
    expect(foot.firstElementChild).toHaveClass("title__version");
    expect(screen.queryByText(/swipe|scroll|arrow keys/i)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["npm", "GitHub"]);
    expect(container.innerHTML).not.toMatch(/youtube\.com\/watch/);
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

  it("does not play for a reader who has asked for reduced motion", () => {
    setReducedMotion(true);
    render(focused(true));
    expect(frame()).toBeNull();
    // The scrim stays, so the cell looks the same without the picture.
    expect(document.querySelector(".bgvideo__scrim")).toBeInTheDocument();
  });

  it("stops if reduced motion is turned on while it plays, and starts if it is turned off", () => {
    render(focused(true));
    expect(frame()).toBeInTheDocument();
    act(() => setReducedMotion(true));
    expect(frame()).toBeNull();
    act(() => setReducedMotion(false));
    expect(frame()).toBeInTheDocument();
  });
});

describe("Vision", () => {
  it("is headed 4platforms, one word set large, and no longer says one layout model", async () => {
    const { container } = render(<Vision />);
    expect(screen.getByRole("heading", { level: 2, name: "4platforms" })).toBeInTheDocument();
    // One line, so it is as wide as the cell.
    expect([...container.querySelectorAll(".vision__heading .fit__line")].map((g) => g.textContent)).toEqual(["4platforms"]);
    expect(container).not.toHaveTextContent(/one layout model/i);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("makes room beside rows and columns, says what Golden Grids is, and ends on not being boring", () => {
    const { container } = render(<Vision />);
    const body = container.querySelector(".vision__body") as HTMLElement;
    expect(body).toHaveTextContent(/^Rows and columns have had a good run, but let’s make room for new ideas\./);
    expect(body).toHaveTextContent(/You still need them, let’s push the envelope\./);
    // The owner's own punctuation: commas.
    expect(body).not.toHaveTextContent(";");
    expect(body).toHaveTextContent(LENS);
    expect(LENS).toMatch(/^Golden Grids is a new lens to view layouts through that leverages the golden ratio/);
    expect(LENS).toMatch(/instinctually know through nature\.$/);
    expect(body).toHaveTextContent(/What you put on them is your business, at least you won’t be boring\.$/);
    expect(body).toHaveTextContent(/at least you won’t be boring\.$/);
    expect(body).not.toHaveTextContent(/same boxes|all four/);
  });

  it("says in the page's description what it says in the cell", () => {
    const description = /<meta\s+name="description"\s+content="([^"]+)"/.exec(html)?.[1];
    expect(description?.startsWith(LENS)).toBe(true);
    expect(description).toMatch(/React, React Native, SwiftUI and Jetpack Compose\.$/);
  });

  it("sets the 4 heavier than the word, and ends the heading's box at its baseline", () => {
    const { container } = render(<Vision />);
    const heading = container.querySelector(".vision__heading") as SVGSVGElement;
    expect(heading.querySelector("tspan.fit__strong")).toHaveTextContent(/^4$/);
    expect(heading.querySelector(".fit__line text")).toHaveTextContent("4platforms");
    // Ten glyphs at 50 wide scale by 2; the baseline is 80 down the line, so 160, not the full 200.
    expect(heading).toHaveAttribute("viewBox", "0 0 1000 160");
  });

  it("names each platform beside its mark, drawn in one colour and hidden as decoration", () => {
    render(<Vision />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["React", "React Native", "SwiftUI", "Jetpack Compose"]);
    expect(PLATFORMS.map((p) => p.logo)).toEqual(["react", "react", "apple", "android"]);
    for (const item of items) {
      const mark = item.querySelector("svg") as SVGSVGElement;
      expect(mark).toHaveAttribute("aria-hidden", "true");
      expect(mark).toHaveAttribute("fill", "currentColor");
      expect(mark.querySelectorAll("path")).toHaveLength(1);
      expect(mark.querySelector("[fill], [stroke]")).toBeNull();
    }
    // React and React Native share React's mark; the other two differ from it and from each other.
    const drawn = items.map((li) => li.querySelector("path")?.getAttribute("d"));
    expect(drawn[0]).toBe(drawn[1]);
    expect(new Set(drawn).size).toBe(3);
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

  it("gives the whole range, 1 to 91, and the lower React count as an asterisked note under it", () => {
    render(<Parameters />);
    const range = within(screen.getByRole("list", { name: "Values for from · to" })).getAllByRole("listitem");
    expect(range.map((li) => li.textContent)).toEqual(["1", "91"]);
    const item = screen.getByText("from · to").closest(".parameters__item") as HTMLElement;
    const says = item.querySelector(".parameters__says") as HTMLElement;
    expect(says).toHaveTextContent(/from 1 to 91\.\*/);
    const note = says.querySelector("small.parameters__note") as HTMLElement;
    expect(note).toHaveTextContent("* 1 to 78 in React and React Native.");
    // The note closes the first row: nothing follows it there, and the next row is skip.
    expect(says.lastElementChild).toBe(note);
    expect(item.lastElementChild).toBe(says);
    expect(item.nextElementSibling).toHaveTextContent(/^skip/);
    // What a range of five makes is left unsaid.
    expect(item).not.toHaveTextContent(/five squares|1 to 5/);
  });

  it("puts a note only where there is one", () => {
    const { container } = render(<Parameters />);
    expect(container.querySelectorAll(".parameters__note")).toHaveLength(1);
    expect(PARAMETERS.filter((p) => "note" in p)).toHaveLength(1);
  });

  it("is not a grid", () => {
    const { container } = render(<Parameters />);
    expect(container.querySelector(".golden-grid")).toBeNull();
  });
});

describe("Gallery", () => {
  it("says THESE ARE FAKE, as large as the cell allows, FAKE on a line of its own", async () => {
    const { container } = render(<Gallery count={13} />);
    expect(screen.getByRole("heading", { level: 2, name: "THESE ARE FAKE" })).toBeInTheDocument();
    expect([...container.querySelectorAll(".gallery__heading .fit__line")].map((g) => g.textContent)).toEqual([
      "THESE ARE",
      "FAKE",
    ]);
    // The shorter line is scaled up to the same width, so FAKE is the largest thing in the cell.
    const scales = [...container.querySelectorAll(".gallery__heading .fit__line")].map((g) =>
      Number(/scale\(([\d.]+)\)/.exec(g.getAttribute("transform") as string)?.[1]),
    );
    expect(scales[1]).toBeGreaterThan(2 * (scales[0] as number));
    // Capitals sit on the baseline: the heading's box ends there, so what follows is spaced from the letters.
    // "THESE ARE" is nine glyphs, 450 wide, scaled to 1000; FAKE is 200 wide, scaled by 5 and 500 tall.
    const first = (100 * (1000 / 450)) * 0.74;
    expect(Number(container.querySelector(".gallery__heading")?.getAttribute("viewBox")?.split(" ")[3])).toBeCloseTo(first + 400, 6);
    // The count is no longer the cell's big type.
    expect(container.querySelector(".gallery__count")).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("then says what a study is, and that none is the site it looks like", () => {
    const { container } = render(<Gallery count={13} />);
    const body = container.querySelector(".gallery__body") as HTMLElement;
    expect(body).toHaveTextContent(/^The next 13 cells are layout studies\./);
    expect(body).toHaveTextContent(/rebuilds it on Golden Grids under a parody name/);
    expect(body).toHaveTextContent(/None is affiliated with the site it studies/);
    expect(body).toHaveTextContent(/nothing in them can be bought, booked or signed up for\.$/);
    // In that order: the heading, the disclaimer, the call to act.
    const order = [...(container.querySelector(".gallery") as HTMLElement).children].map((c) => c.getAttribute("class"));
    expect(order).toEqual(["gallery__kicker", "visually-hidden", "fit gallery__heading", "gallery__body", "gallery__make"]);
  });

  it("does not call one study several", () => {
    const { container } = render(<Gallery count={1} />);
    expect(container.querySelector(".gallery__body")).toHaveTextContent(/^The next cell is a layout study\./);
  });

  it("ends by asking the reader to make their own, from the study template, in a new window", () => {
    render(<Gallery count={13} />);
    const link = screen.getByRole("link", { name: "Make your own study from the template (opens in a new window)" });
    expect(link).toHaveAttribute("href", site.template);
    expect(site.template).toBe("https://github.com/gregoryedgerton/golden-grids-study-template");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
    expect(link.closest(".gallery")?.lastElementChild).toContainElement(link);
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
    expect(container.querySelector(".gallery__body")).toHaveTextContent(/^The next 3 cells are layout studies\./);
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
