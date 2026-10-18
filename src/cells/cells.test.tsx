import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { fills } from "../../test/fills";
import { setReducedMotion } from "../../test/media";
import { clock } from "../dial/clock";
import { CellCurrent, CellLanding } from "../dial/current";
import { Dial } from "../dial/Dial";
import { paintTile } from "../dial/geometry";
import { prefersReducedMotion } from "../dial/motion";
import { site } from "../site";
import { contrast, parseStudy, studies } from "../studies";
import { FitText } from "../ui/FitText";
import { fontHref } from "../ui/fonts";
import { Gallery, INKS } from "./Gallery";
import { buildCells } from "./index";
import { PARAMETERS, Parameters } from "./Parameters";
import { Signup } from "./Signup";
import { SAID_MS, createStatement } from "./statement";
import type { Statement } from "./statement";
import { StudyCell } from "./StudyCell";
import { Title } from "./Title";
import { Vision } from "./Vision";

const espn = parseStudy(
  {
    number: 6,
    release: 5,
    published: "2026-10-06",
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

/** A statement of its own for a test, made as the page makes its one: on the browser's clock, which a test may fake. */
const newStatement = () => createStatement({ reduced: prefersReducedMotion, clock });

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

  it("carries the library's stamp on its last line, under the foot: its serial, whose it is, and no date", () => {
    const { container } = render(<Title />);
    const cell = container.querySelector(".title") as HTMLElement;
    const stamp = cell.lastElementChild as HTMLElement;
    expect(stamp).toHaveClass("stamp", "title__release");
    expect(stamp.previousElementSibling).toHaveClass("title__foot");
    expect(cell.querySelector(".title__foot .stamp")).toBeNull();
    expect(stamp).toHaveTextContent(/^Library release GIFcommit00001$/);
    expect(stamp.querySelector(".visually-hidden")).toHaveTextContent(/^Library release$/);
    // No day here: only a study's cell shows one.
    expect(cell.querySelector("time")).toBeNull();
    // Nothing is put before the presenter's line: the title opens as it did.
    const said = [...cell.children].filter((child) => !child.classList.contains("backdrop"));
    expect(said[0]).toHaveClass("title__presents");
    // The library's and no other: this site's own stamp is on the last cell.
    expect(container.textContent?.match(/GIFcommit\d{5}/g)).toEqual(["GIFcommit00001"]);
  });

  it("puts the version at the foot, first, and carries no instructions, link to a video or button for one", () => {
    const { container } = render(<Title />);
    const cell = container.querySelector(".title") as HTMLElement;
    const foot = cell.querySelector(".title__foot") as HTMLElement;
    // The foot is the last thing in the cell but the stamp's own line.
    expect(foot.nextElementSibling).toBe(cell.lastElementChild);
    expect(foot.firstElementChild).toHaveClass("title__version");
    expect(screen.queryByText(/swipe|scroll|arrow keys/i)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["npm", "GitHub"]);
    // Nothing of YouTube's is left: no player and no address.
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.innerHTML).not.toMatch(/youtu/i);
  });
});

describe("Title, and the clip behind it", () => {
  /** The pictures behind the title: the address each is shown from. */
  const pictures = () => [...document.querySelectorAll(".title .backdrop img")].map((picture) => picture.getAttribute("src"));
  /** Let what has been fetched arrive and be drawn. */
  const arrived = () => act(async () => {});
  const focused = (current: boolean) => (
    <CellCurrent value={current}>
      <Title />
    </CellCurrent>
  );
  const STILL = expect.stringMatching(/title-still.*\.jpg$/);

  it("plays the owner's clip behind the title while the title is the focused cell", async () => {
    const { container } = render(focused(true));
    await arrived();
    // The clip, fetched once and shown from an address of its own.
    expect(vi.mocked(fetch).mock.calls.map(([address]) => address)).toEqual([expect.stringMatching(/title.*\.gif$/)]);
    expect(pictures()).toEqual(["blob:showing/1"]);
    // Behind: the picture is the cell's first child, and everything else follows it.
    expect(container.querySelector(".title")?.firstElementChild).toHaveClass("backdrop");
    expect(container.querySelector(".backdrop__scrim")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no clip while another cell is focused, or outside a dial, and plays it afresh each time the title is focused again", async () => {
    const { rerender } = render(focused(false));
    await arrived();
    expect(pictures()).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    rerender(focused(true));
    await arrived();
    expect(pictures()).toEqual(["blob:showing/1"]);
    rerender(focused(false));
    expect(pictures()).toEqual([]);
    // Back on the title: a new showing, which starts from the first frame. Nothing is fetched again.
    rerender(focused(true));
    expect(pictures()).toEqual(["blob:showing/2"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    rerender(<Title />);
    expect(pictures()).toEqual([]);
  });

  it("shows the owner's still, and no clip, for a reader who has asked for reduced motion", async () => {
    setReducedMotion(true);
    render(focused(true));
    await arrived();
    expect(pictures()).toEqual([STILL]);
    // The clip is not even fetched for a reader it will not be shown to.
    expect(fetch).not.toHaveBeenCalled();
    expect(document.querySelector(".backdrop__scrim")).toBeInTheDocument();
  });

  it("keeps the still while another cell is focused, since it does not move", () => {
    setReducedMotion(true);
    render(focused(false));
    expect(pictures()).toEqual([STILL]);
  });

  it("shows no still while motion is allowed, playing or not", async () => {
    const { rerender } = render(focused(true));
    await arrived();
    expect(pictures()).toEqual(["blob:showing/1"]);
    rerender(focused(false));
    expect(pictures()).toEqual([]);
  });

  it("swaps the clip for the still if reduced motion is turned on while it plays, and back", async () => {
    render(focused(true));
    await arrived();
    expect(pictures()).toEqual(["blob:showing/1"]);
    act(() => setReducedMotion(true));
    expect(pictures()).toEqual([STILL]);
    act(() => setReducedMotion(false));
    expect(pictures()).toEqual(["blob:showing/2"]);
  });
});

describe("Vision", () => {
  it("asks WHAT IS THIS?, in capitals set large, two words and then one, as the gallery's statement is set", async () => {
    const { container } = render(<Vision />);
    expect(screen.getByRole("heading", { level: 2, name: "WHAT IS THIS?" })).toBeInTheDocument();
    const lines = [...container.querySelectorAll(".vision__heading .fit__line text:last-child")].map((line) => line.textContent);
    // Written in capitals, not made so by a style.
    expect(lines).toEqual(["WHAT IS", "THIS?"]);
    const heading = container.querySelector(".vision__heading") as SVGSVGElement;
    // Nothing in the heading is marked out from the rest, and nothing colours it over time: it is not the statement.
    expect(heading.querySelector("tspan")).toBeNull();
    expect(heading.querySelector("linearGradient")).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("answers with the page's own description, word for word, and nothing more", () => {
    const { container } = render(<Vision />);
    const body = container.querySelector(".vision__body") as HTMLElement;
    expect(body.textContent).toBe(site.description);
    expect([...container.querySelectorAll("p")]).toEqual([body]);
    // The question is read straight into its answer.
    expect(container.querySelector(".vision__heading")?.nextElementSibling).toBe(body);
  });

  it("calls out no platforms: no marks, no list of them", () => {
    const { container } = render(<Vision />);
    expect(container.querySelector("ul, li, svg:not(.vision__heading)")).toBeNull();
    expect(container).not.toHaveTextContent(/SwiftUI|Jetpack|React/);
  });

});

describe("Parameters", () => {
  it("is a reference to read: three parameters, their values and what each does", async () => {
    const { container } = render(<Parameters />);
    expect(screen.getByRole("heading", { level: 2, name: "Parameters" })).toBeInTheDocument();
    // The names are headings here, written in capitals. The values under them are as code takes them.
    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual(["FROM – TO", "PLACEMENT", "CLOCKWISE"]);
    expect(PARAMETERS.flatMap((p) => [...p.values]).filter((value) => value !== value.toLowerCase())).toEqual([]);
    for (const { term, values, says } of PARAMETERS) {
      const list = screen.getByRole("list", { name: `Values for ${term}` });
      expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual([...values]);
      const item = screen.getByText(term).closest(".parameters__item") as HTMLElement;
      expect(item.querySelector(".parameters__says")).toHaveTextContent(says);
    }
    // Each term has two descriptions: what it takes, then what it does.
    const item = screen.getByText("PLACEMENT").closest(".parameters__item") as HTMLElement;
    expect([...item.children].map((c) => c.tagName)).toEqual(["DT", "DD", "DD"]);
    expect(screen.getAllByRole("definition")).toHaveLength(PARAMETERS.length * 2);
    expect(within(screen.getByRole("list", { name: "Values for PLACEMENT" })).getAllByRole("listitem")).toHaveLength(4);
    expect(PARAMETERS[2].says).toMatch(/clockwise, or counter-clockwise/);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("describes the range in the owner's words, with skipping as part of it and not a parameter or a byline", () => {
    const { container } = render(<Parameters />);
    const range = screen.getByText("FROM – TO").closest(".parameters__item") as HTMLElement;
    // toHaveTextContent with a string would pass on a part of it; this is the whole of it.
    expect(range.querySelector(".parameters__says")?.textContent).toBe(
      "Determines number of boxes a grid contains using Fibonacci indexes for box count and values for box proportions. Grid cells are always squares except when the sequence is skipped resulting in an inner rectangular grid cell.",
    );
    expect(PARAMETERS.map((p) => p.term)).not.toContain("skip");
    expect(container.querySelector(".parameters__byline")).toBeNull();
    // One paragraph: nothing set apart inside the description.
    expect(range.querySelector(".parameters__says")?.children).toHaveLength(0);
  });

  it("puts the asterisk on the range itself, 0 – 91*, and the note it points to right under it", () => {
    render(<Parameters />);
    const range = within(screen.getByRole("list", { name: "Values for FROM – TO" })).getAllByRole("listitem");
    // One chip, read as a range, not two numbers. It starts at 0: from 0 to 1 is a grid of one box.
    expect(range.map((li) => li.textContent)).toEqual(["0 – 91*"]);
    const item = screen.getByText("FROM – TO").closest(".parameters__item") as HTMLElement;
    const takes = item.querySelector(".parameters__takes") as HTMLElement;
    const note = takes.querySelector("small.parameters__note") as HTMLElement;
    expect(note).toHaveTextContent("* 0 – 78 in React and React Native.");
    // Straight after the list the asterisk is in, and the last thing said about what the range takes.
    expect(note.previousElementSibling?.tagName).toBe("UL");
    expect(takes.lastElementChild).toBe(note);
    // The description carries no asterisk now, and no note.
    const says = item.querySelector(".parameters__says") as HTMLElement;
    expect(says).not.toHaveTextContent("*");
    expect(says.querySelector("small")).toBeNull();
    expect(item.nextElementSibling).toHaveTextContent(/^PLACEMENT/);
  });

  it("puts a note, and an asterisk, only where there is one", () => {
    const { container } = render(<Parameters />);
    expect(container.querySelectorAll(".parameters__note")).toHaveLength(1);
    expect(PARAMETERS.filter((p) => "note" in p)).toHaveLength(1);
    expect(PARAMETERS.flatMap((p) => [...p.values]).filter((value) => value.includes("*"))).toEqual(["0 – 91*"]);
  });

  it("is not a grid", () => {
    const { container } = render(<Parameters />);
    expect(container.querySelector(".golden-grid")).toBeNull();
  });
});

describe("Gallery", () => {
  it("says THESE ARE FAKE, as large as the cell allows, FAKE on a line of its own", async () => {
    const { container } = render(<Gallery statement={newStatement()} />);
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
    // Capitals sit on the baseline, so the heading's box ends there: shorter than the same lines drawn whole.
    const height = (svg: Element | null) => Number(svg?.getAttribute("viewBox")?.split(" ")[3]);
    const whole = render(<FitText lines={["THESE ARE", "FAKE"]} leading={0.86} />);
    expect(height(container.querySelector(".gallery__heading"))).toBeLessThan(height(whole.container.querySelector("svg")));
    whole.unmount();
    // The count is no longer the cell's big type.
    expect(container.querySelector(".gallery__count")).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("then says what a study is, and that none is the site it looks like", () => {
    const { container } = render(<Gallery statement={newStatement()} />);
    const body = container.querySelector(".gallery__body") as HTMLElement;
    // The owner's words, whole. It says what studies are, not what the cells after it are: the last of those is the sign-up.
    expect(body.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Layout studies look at an existing website, brand or general concept and reimagine it with Golden Grids under a parody name. None of these studies are affiliated with the brands mentioned, and nothing in them can be bought, booked or signed up for.",
    );
    expect(body).not.toHaveTextContent(/cells? that follow|next/i);
    // In that order: the heading, then the disclaimer.
    const order = [...(container.querySelector(".gallery") as HTMLElement).children].map((c) => c.getAttribute("class"));
    expect(order).toEqual(["gallery__kicker", "visually-hidden", "fit gallery__heading", "gallery__body"]);
  });

  it("gives no count, since studies keep being added", () => {
    const { container } = render(<Gallery statement={newStatement()} />);
    expect(container.querySelector(".gallery")).not.toHaveTextContent(/\d/);
  });

  it("has no call to act: the disclaimer is the last thing in the cell", () => {
    const { container } = render(<Gallery statement={newStatement()} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector(".gallery")?.lastElementChild).toHaveClass("gallery__body");
    expect(container).not.toHaveTextContent(/make your own/i);
  });
});

describe("Gallery, and the statement being said", () => {
  /** The cell as the dial holds it: the focused one or not, and with the dial landing on it or not. */
  const holding = (statement: Statement) => (current: boolean, landing: boolean) => (
    <CellCurrent value={current}>
      <CellLanding value={landing}>
        <Gallery statement={statement} />
      </CellLanding>
    </CellCurrent>
  );
  let held: ReturnType<typeof holding>;
  const pass = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
  const BLACK = INKS.black;
  const WHITE = INKS.white;
  // Here a glyph is 50 units: THESE runs from 0 to 250 of its line's 450 and ARE from 300, so they meet at 275.
  const MEET = Number((275 / 450).toFixed(4));
  /** Every look the statement has from now, for this long, a frame at a time. */
  const watch = (container: Element, ms: number) => {
    const looks: string[] = [];
    for (let t = 0; t < ms; t += 10) {
      pass(10);
      const now = JSON.stringify(fills(container));
      if (now !== looks.at(-1)) looks.push(now);
    }
    return looks.map((look) => JSON.parse(look) as ReturnType<typeof fills>);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    held = holding(newStatement());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is black, as the rest of the cell is, until the dial lands on it", () => {
    // Looked at every frame: said once, it ends black as it began, so the end alone would not show it had been said.
    const outside = render(<Gallery statement={newStatement()} />);
    expect(watch(outside.container, 20_000)).toEqual([[BLACK, BLACK]]);
    outside.unmount();
    // The focused cell, but under a finger or only being passed: not yet.
    const passing = render(held(true, false));
    expect(watch(passing.container, 20_000)).toEqual([[BLACK, BLACK]]);
    // The ink is the cell's own, whatever that is set to.
    expect(BLACK).toBe("currentColor");
  });

  it("is crossed by white the moment the dial lands on it: THESE, then ARE, then FAKE, each from its left", () => {
    const { container } = render(held(true, true));
    // No wait: a few frames in, white is already into THESE.
    pass(50);
    expect((fills(container)[0] as [number, string][]).map(([, colour]) => colour)).toEqual([WHITE, WHITE, BLACK, BLACK]);

    // Further into THESE: white from the left to an edge inside the word, black from there on. FAKE is untouched.
    pass(100);
    const [these, fake] = fills(container) as [[number, string][], string];
    expect(these.map(([, colour]) => colour)).toEqual([WHITE, WHITE, BLACK, BLACK]);
    expect(these[1]?.[0]).toBeGreaterThan(0.3);
    expect(these[1]?.[0]).toBeLessThan(250 / 450);
    expect(these[2]?.[0]).toBe(these[1]?.[0]);
    expect(fake).toBe(BLACK);

    // THESE said, ARE not begun: white up to where the two words meet.
    pass(190);
    expect(fills(container)).toEqual([
      [
        [0, WHITE],
        [MEET, WHITE],
        [MEET, BLACK],
        [1, BLACK],
      ],
      BLACK,
    ]);

    // ARE said: the first line is white, and FAKE is next.
    pass(320);
    expect(fills(container)).toEqual([WHITE, BLACK]);
    pass(250);
    const [line, last] = fills(container) as [string, [number, string][]];
    expect(line).toBe(WHITE);
    expect(last.map(([, colour]) => colour)).toEqual([WHITE, WHITE, BLACK, BLACK]);
    expect(last[1]?.[0]).toBeGreaterThan(0.5);
    expect(last[1]?.[0]).toBeLessThan(1);

    // Said.
    pass(250);
    expect(fills(container)).toEqual([WHITE, WHITE]);
  });

  it("rests white, is crossed by black the same way, and then stays black however long the reader stays", () => {
    const { container } = render(held(true, true));
    pass(SAID_MS + 20);
    expect(fills(container)).toEqual([WHITE, WHITE]);
    // The rest is as long as the saying.
    pass(SAID_MS - 60);
    expect(fills(container)).toEqual([WHITE, WHITE]);

    pass(60 + 150);
    const [these] = fills(container) as [[number, string][]];
    expect(these.map(([, colour]) => colour)).toEqual([BLACK, BLACK, WHITE, WHITE]);
    pass(SAID_MS - 150);
    expect(fills(container)).toEqual([BLACK, BLACK]);

    // It is said once. A minute on, looked at every frame, it has never been anything but black.
    expect(watch(container, 60_000)).toEqual([[BLACK, BLACK]]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("is not said again when the dial stirs on the cell: under a finger and let go, the reader never having left", () => {
    const { container, rerender } = render(held(true, true));
    // In the middle of the white rest a finger takes the dial and lets it go. It goes on to black as it would have.
    pass(SAID_MS + 300);
    rerender(held(true, false));
    pass(200);
    rerender(held(true, true));
    pass(SAID_MS + SAID_MS);
    expect(fills(container)).toEqual([BLACK, BLACK]);

    // Done, and stirred again: nothing.
    rerender(held(true, false));
    rerender(held(true, true));
    expect(watch(container, 10_000)).toEqual([[BLACK, BLACK]]);
  });

  it("is said again to a reader who leaves the cell and comes back", () => {
    const { container, rerender } = render(held(true, true));
    pass(4 * SAID_MS);
    expect(fills(container)).toEqual([BLACK, BLACK]);
    rerender(held(false, false));
    pass(5000);
    rerender(held(true, true));
    pass(150);
    const [these] = fills(container) as [[number, string][]];
    expect(these.map(([, colour]) => colour)).toEqual([WHITE, WHITE, BLACK, BLACK]);
    pass(SAID_MS);
    expect(fills(container)).toEqual([WHITE, WHITE]);
    pass(SAID_MS + SAID_MS);
    expect(fills(container)).toEqual([BLACK, BLACK]);
  });

  it("finishes what it is saying when the cell loses the focus, stays that colour, and on return is crossed by black alone", () => {
    const { container, rerender } = render(held(true, true));
    pass(420);
    expect(fills(container)[1]).toBe(BLACK);
    rerender(held(false, false));

    // The crossing goes on to its end with the reader elsewhere.
    pass(400);
    expect(fills(container)[0]).toBe(WHITE);
    expect(fills(container)[1]).not.toBe(BLACK);
    pass(400);
    expect(fills(container)).toEqual([WHITE, WHITE]);
    // And no further: it is white however long it is left. No black follows behind the reader's back.
    expect(watch(container, 20_000)).toEqual([[WHITE, WHITE]]);

    // The focused cell again, but under a finger: nothing yet. Let go, and black crosses it at once.
    rerender(held(true, false));
    pass(5000);
    expect(fills(container)).toEqual([WHITE, WHITE]);
    rerender(held(true, true));
    pass(150);
    const [these] = fills(container) as [[number, string][]];
    expect(these.map(([, colour]) => colour)).toEqual([BLACK, BLACK, WHITE, WHITE]);
    pass(SAID_MS);
    expect(fills(container)).toEqual([BLACK, BLACK]);
    // It had only to come back to black. No white follows.
    expect(watch(container, 10_000)).toEqual([[BLACK, BLACK]]);
  });

  it("stays white if the reader leaves while it rests white", () => {
    const { container, rerender } = render(held(true, true));
    pass(SAID_MS + 400);
    rerender(held(false, false));
    expect(vi.getTimerCount()).toBe(0);
    expect(watch(container, 10_000)).toEqual([[WHITE, WHITE]]);
  });

  it("changes a word at a time, whole, when motion is reduced: the colour changes and nothing travels", () => {
    setReducedMotion(true);
    const { container } = render(held(true, true));
    const meet = [
      [0, WHITE],
      [MEET, WHITE],
      [MEET, BLACK],
      [1, BLACK],
    ];
    const back = meet.map(([at, colour]) => [at, colour === WHITE ? BLACK : WHITE]);
    // THESE is white from the moment the dial lands.
    expect(fills(container)).toEqual([meet, BLACK]);
    // Then THESE ARE; all of it; and black a word at a time. An edge only ever sits between two words. Then nothing.
    expect(watch(container, 20_000)).toEqual([
      [meet, BLACK],
      [WHITE, BLACK],
      [WHITE, WHITE],
      [back, WHITE],
      [BLACK, WHITE],
      [BLACK, BLACK],
    ]);
  });

  it("follows the motion preference while it is being said", () => {
    const { container } = render(held(true, true));
    pass(100);
    const [these] = fills(container) as [[number, string][]];
    expect(these[1]?.[0]).toBeLessThan(MEET - 0.05);
    act(() => setReducedMotion(true));
    pass(20);
    // THESE is white whole, at once: the edge is where the words meet.
    expect((fills(container)[0] as [number, string][])[1]).toEqual([MEET, WHITE]);
  });

  it("finishes what it was saying when the cell is taken off the dial, and is that colour when the cell is put back", () => {
    const statement = newStatement();
    const cell = holding(statement);
    const first = render(cell(true, true));
    pass(420);
    expect(fills(first.container)[1]).toBe(BLACK);
    // Off the dial in the middle of the white crossing, as when the reader goes far from it.
    first.unmount();
    expect(statement.look().ink).toBe("black");
    pass(SAID_MS);
    expect(statement.look()).toEqual({ ink: "white", crossed: [0, 0, 0] });
    // Finished, and nothing is left running: no black crossing waits its turn.
    expect(vi.getTimerCount()).toBe(0);
    pass(60_000);
    expect(statement.look()).toEqual({ ink: "white", crossed: [0, 0, 0] });

    // Put back, near the focus but not on it: white, as it was left. Then black, as the dial lands on it.
    const again = render(cell(false, false));
    expect(fills(again.container)).toEqual([WHITE, WHITE]);
    again.rerender(cell(true, true));
    pass(150);
    const [these] = fills(again.container) as [[number, string][]];
    expect(these.map(([, colour]) => colour)).toEqual([BLACK, BLACK, WHITE, WHITE]);
  });

  it("says no more once it is off the dial, even if it was the focused cell when it was taken off", () => {
    // Resting white, with the black crossing still to come: it is called off.
    const resting = newStatement();
    const rest = render(holding(resting)(true, true));
    pass(SAID_MS + 300);
    expect(vi.getTimerCount()).toBe(1);
    rest.unmount();
    expect(vi.getTimerCount()).toBe(0);
    pass(20_000);
    expect(resting.look()).toEqual({ ink: "white", crossed: [0, 0, 0] });

    // In the middle of a crossing, with motion reduced, where a timer waits for the next word: it finishes, and stops.
    setReducedMotion(true);
    const crossing = newStatement();
    const cross = render(holding(crossing)(true, true));
    pass(100);
    cross.unmount();
    expect(vi.getTimerCount()).toBe(1);
    pass(SAID_MS);
    expect(vi.getTimerCount()).toBe(0);
    pass(20_000);
    expect(crossing.look()).toEqual({ ink: "white", crossed: [0, 0, 0] });
  });

  it("heeds the reader's motion preference in the statement the page's own cells are built with", () => {
    setReducedMotion(true);
    const gallery = buildCells([], "").find((cell) => cell.id === "gallery");
    const { container } = render(
      <CellCurrent value>
        <CellLanding value>{gallery?.content}</CellLanding>
      </CellCurrent>,
    );
    const edges = new Set<number>();
    for (const look of [fills(container), ...watch(container, SAID_MS)]) {
      for (const fill of look) if (Array.isArray(fill)) edges.add((fill[1] as [number, string])[0]);
    }
    // White crossed the whole statement, and the only edge there ever was sat between THESE and ARE.
    expect(fills(container)).toEqual([WHITE, WHITE]);
    expect([...edges]).toEqual([MEET]);
  });

  it("shows two cells one statement the same, and each set of cells has a statement of its own", () => {
    const cells = buildCells([], "");
    const gallery = cells.find((cell) => cell.id === "gallery");
    const shown = render(
      <CellCurrent value>
        <CellLanding value>{gallery?.content}</CellLanding>
      </CellCurrent>,
    );
    pass(SAID_MS + 20);
    expect(fills(shown.container)).toEqual([WHITE, WHITE]);
    shown.unmount();
    // The same cells, shown again: the statement is the one they were built with.
    const again = render(<>{gallery?.content}</>);
    expect(fills(again.container)).toEqual([WHITE, WHITE]);
    // Other cells have never said theirs.
    const others = render(<>{buildCells([], "").find((cell) => cell.id === "gallery")?.content}</>);
    expect(fills(others.container)).toEqual([BLACK, BLACK]);
  });

  it("keeps large type's contrast against the cell's red in white as it does in black", () => {
    const gallery = buildCells([], "").find((cell) => cell.id === "gallery");
    expect(INKS.white).toBe("#ffffff");
    expect(contrast(INKS.white, gallery?.ground as string)).toBeGreaterThanOrEqual(3);
    // The cell's ink is the site's ground colour, which the first cell is set on.
    const ground = buildCells([], "").find((cell) => cell.id === "title")?.ground as string;
    expect(contrast(ground, gallery?.ground as string)).toBeGreaterThanOrEqual(3);
  });

  it("is still read as the three words, whatever colour they are", async () => {
    vi.useRealTimers();
    const { container } = render(held(true, true));
    expect(screen.getByRole("heading", { level: 2, name: "THESE ARE FAKE" })).toBeInTheDocument();
    expect(container.querySelector(".gallery__heading")).toHaveAttribute("aria-hidden", "true");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("the statement, on a dial that mounts only the cells near the focus", () => {
  const pass = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
  /** A frame at a time, so the page is drawn between frames as a browser draws it. */
  const frames = (ms: number) => {
    for (let t = 0; t < ms; t += 16) pass(16);
  };
  const key = (name: string) => fireEvent.keyDown(document.body, { key: name });
  const gallery = () => document.querySelector(".gallery");
  const said = () => fills(gallery() as Element);
  const announced = () => screen.getByTestId("dial-announce").textContent;
  const whole = (now: ReturnType<typeof said>) => now.every((fill) => typeof fill === "string");
  /** Frames go by until the statement looks like this, or far too long has passed. Returns how long it took. */
  const until = (looks: (now: ReturnType<typeof said>) => boolean) => {
    let waited = 0;
    for (; waited < 6000 && !looks(said()); waited += 16) pass(16);
    return waited;
  };
  /** Every look the statement has while this long goes by, a frame at a time. */
  const through = (ms: number) => {
    const looks = new Set<string>();
    for (let t = 0; t < ms; t += 16) {
      pass(16);
      if (gallery()) looks.add(said().map((fill) => (typeof fill === "string" ? fill : "crossing")).join());
    }
    return [...looks];
  };
  const [WHITE, BLACK] = [INKS.white, INKS.black];

  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom lays nothing out; the dial draws only on a stage with a size.
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1440);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(900);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("begins as the dial lands on the cell, well before the dial has come to rest, and is said once", () => {
    setReducedMotion(false);
    render(<Dial cells={buildCells(studies, "")} />);
    key("ArrowDown");
    frames(1000);
    key("ArrowDown");
    frames(1000);
    // Ahead and in reach, never yet the focused cell: black.
    expect(said()).toEqual([BLACK, BLACK]);

    key("ArrowDown");
    // White is into THESE within a few frames of the key. The dial is still most of a second from rest.
    expect(until((now) => !whole(now))).toBeLessThan(200);
    expect(announced()).toMatch(/^Case Studies, 4 of/);
    const tile = (gallery() as Element).closest(".dial__tile") as HTMLElement;
    const landing = tile.style.transform;
    frames(1000);
    expect(tile.style.transform).not.toBe(landing);

    // White, a rest, black, and then black for good.
    until((now) => now.every((fill) => fill === WHITE));
    expect(said()).toEqual([WHITE, WHITE]);
    until((now) => now.every((fill) => fill === BLACK));
    expect(said()).toEqual([BLACK, BLACK]);
    expect(through(20_000)).toEqual([`${BLACK},${BLACK}`]);
  });

  it("does not begin under a finger resting on the dial as the cell arrives, and begins when the finger lifts", () => {
    setReducedMotion(false);
    render(<Dial cells={buildCells(studies, "")} />);
    key("ArrowDown");
    frames(1000);
    key("ArrowDown");
    frames(1000);
    const finger = { pointerId: 7, isPrimary: true, pointerType: "touch" };
    key("ArrowDown");
    fireEvent.pointerDown(document.querySelector(".dial__stage") as Element, { ...finger, clientX: 200, clientY: 400 });
    // The cell arrives and is the focused one, with the finger still down: not a word.
    expect(through(3000)).toEqual([`${BLACK},${BLACK}`]);
    expect(announced()).toMatch(/^Case Studies, 4 of/);
    fireEvent.pointerUp(window, { ...finger, clientX: 200, clientY: 400 });
    expect(until((now) => !whole(now))).toBeLessThan(100);
  });

  it("does not begin for a cell the dial only passes on its way to the far end, or on its way back", () => {
    setReducedMotion(false);
    render(<Dial cells={buildCells(studies, "")} />);
    key("End");
    // The gallery's cell is the focused one for a moment on the way, and is never crossed.
    expect(through(4000)).toEqual([`${BLACK},${BLACK}`]);
    expect(announced()).toMatch(/^The mailing list/);
    expect(gallery()).toBeNull();
    key("Home");
    expect(through(4000)).toEqual([`${BLACK},${BLACK}`]);
    expect(announced()).toMatch(/^Golden Grids, 1 of/);
    expect(said()).toEqual([BLACK, BLACK]);
  });

  it.each([
    ["travelling there", false],
    ["jumping there, with motion reduced", true],
  ])("finishes and keeps its colour while the reader is at the far end of the dial, %s", (_, reduced) => {
    setReducedMotion(reduced);
    render(<Dial cells={buildCells(studies, "")} />);
    key("ArrowDown");
    frames(1000);
    key("ArrowDown");
    frames(1000);
    key("ArrowDown");
    // On the cell, and white is part of the way across it.
    until((now) => !whole(now));
    expect(announced()).toMatch(/^Case Studies, 4 of/);
    frames(100);
    expect(whole(said())).toBe(false);

    // To the last cell. The gallery's is far behind and is taken off the dial with the crossing unfinished.
    key("End");
    frames(4000);
    expect(announced()).toMatch(/^The mailing list/);
    expect(gallery()).toBeNull();
    pass(20_000);

    // Back to the first cell. The gallery's is ahead and mounted again: white, as the crossing left it.
    key("Home");
    frames(4000);
    expect(announced()).toMatch(/^Golden Grids, 1 of/);
    expect(said()).toEqual([WHITE, WHITE]);
    pass(20_000);
    expect(said()).toEqual([WHITE, WHITE]);

    // And when the dial lands on it again, black crosses it, and it stays black.
    key("ArrowDown");
    frames(1000);
    key("ArrowDown");
    frames(1000);
    expect(said()).toEqual([WHITE, WHITE]);
    key("ArrowDown");
    until((now) => !whole(now));
    expect(said().flat().at(0)).toEqual([0, BLACK]);
    until((now) => now.every((fill) => fill === BLACK));
    expect(said()).toEqual([BLACK, BLACK]);
    expect(through(10_000)).toEqual([`${BLACK},${BLACK}`]);
  });
});

describe("StudyCell", () => {
  it("sets the parody name exactly, with the day it was published, its subject, a way to it, and its stamp on the last line", async () => {
    const { container } = render(<StudyCell study={espn} />);
    expect(screen.getByRole("heading", { level: 2, name: "GIFspn" })).toBeInTheDocument();
    const cell = container.querySelector(".study") as HTMLElement;
    // The day is the first thing in the cell, top left.
    const date = cell.firstElementChild as HTMLElement;
    expect(date).toHaveClass("study__date");
    expect(date).toHaveTextContent(/^Published Oct 6, 2026$/);
    expect(date.querySelector("time")).toHaveAttribute("datetime", "2026-10-06");
    expect(cell.querySelectorAll("time")).toHaveLength(1);
    // The stamp is fine print with a line to itself: the last thing in the cell, after the foot and not in it.
    const stamp = cell.lastElementChild as HTMLElement;
    expect(stamp).toHaveClass("stamp", "study__release");
    expect(stamp.previousElementSibling).toHaveClass("study__foot");
    expect(cell.querySelector(".study__foot .stamp")).toBeNull();
    expect(stamp).toHaveTextContent(/^Release GIFcommit00005$/);
    // Said as a release to a reader who cannot see where it is, and written bare for one who can.
    expect(stamp.querySelector(".visually-hidden")).toHaveTextContent(/^Release$/);
    // The day is not part of the stamp, which is the serial alone.
    expect(stamp.querySelector("time")).toBeNull();
    // The study's number in the series is not shown anywhere.
    expect(container).not.toHaveTextContent(/Study\s*0?6/);
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
    // The name's letters, and the notice's question, which is set in the face too.
    expect(document.head.querySelector("link[data-face]")).toHaveAttribute("href", fontHref(espn.font, "GIFspnYou Good?"));
  });

  it("sets a name's first letters in colours of their own when the study gives them, and all in its ink when it does not", () => {
    const org = { ...espn, brand: "GIF.org", colors: { ...espn.colors, letters: ["#d62021", "#222222", "#237bbd"] } };
    const { container, unmount } = render(<StudyCell study={org} />);
    const face = container.querySelector(".study__name .fit__face") as SVGTextElement;
    expect([...face.querySelectorAll("tspan")].map((t) => [t.textContent, t.getAttribute("fill")])).toEqual([
      ["G", "#d62021"],
      ["I", "#222222"],
      ["F", "#237bbd"],
    ]);
    expect(face).toHaveTextContent("GIF.org");
    // The name itself is unchanged for a reader who cannot see it.
    expect(screen.getByRole("heading", { level: 2, name: "GIF.org" })).toBeInTheDocument();
    unmount();
    const plain = render(<StudyCell study={espn} />);
    expect(plain.container.querySelector(".study__name tspan")).toBeNull();
  });

  it("sets an upright face upright, a long name a word to a line, and any day and any release as they are written", () => {
    const records = { ...espn, published: "2027-01-31", release: 4, brand: "GIFmilk Records", font: { ...espn.font, italic: false } };
    const { container, rerender } = render(<StudyCell study={records} />);
    expect((container.querySelector(".study") as HTMLElement).style.getPropertyValue("--face-style")).toBe("normal");
    expect([...container.querySelectorAll(".study__name text")].map((t) => t.textContent)).toEqual(["GIFmilk", "Records"]);
    expect(screen.getByText("Jan 31, 2027")).toBeInTheDocument();
    expect(container.querySelector(".study__release")).toHaveTextContent(/^Release GIFcommit00004$/);
    // To five places, whatever the number: the first, and the last GIFcommit has promised.
    rerender(<StudyCell study={{ ...records, release: 1 }} />);
    expect(container.querySelector(".study__release")).toHaveTextContent(/^Release GIFcommit00001$/);
    rerender(<StudyCell study={{ ...records, release: 10_000 }} />);
    expect(container.querySelector(".study__release")).toHaveTextContent(/^Release GIFcommit10000$/);
    expect(screen.getByRole("heading", { level: 2, name: "GIFmilk Records" })).toBeInTheDocument();
  });
});

describe("StudyNotice", () => {
  const notice = () => document.querySelector("dialog.notice") as HTMLDialogElement;
  const open = () => fireEvent.click(screen.getByRole("link", { name: "Open the study: GIFspn" }));

  it("is there but closed until the study's link is clicked, and is not in the cell", () => {
    const { container } = render(<StudyCell study={espn} />);
    expect(notice()).not.toHaveAttribute("open");
    expect(screen.queryByRole("dialog")).toBeNull();
    // Outside the cell, and so outside the dial.
    expect(container.querySelector("dialog")).toBeNull();
    expect(notice().parentElement).toBe(document.body);
  });

  it("asks before a study opens, in the study's own colours and face, with the owner's words", async () => {
    render(<StudyCell study={espn} />);
    // The link keeps its address, but a click on it does not follow it.
    expect(open()).toBe(false);
    const dialog = screen.getByRole("dialog", { name: "You Good?" });
    expect(dialog).toBe(notice());
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleDescription(
      "This isn't actually ESPN, it's a layout study for Golden Grids made for wonder and awe. I want you to use the library, not your personal info.",
    );
    expect(within(dialog).getByRole("heading", { level: 2, name: "You Good?" })).toBeInTheDocument();
    expect(dialog.querySelector(".notice__brand")).toHaveTextContent(/^GIFspn$/);
    expect(dialog.querySelector("svg.notice__icon")).toBeInTheDocument();
    expect(dialog.style.getPropertyValue("--ground")).toBe("#cc0000");
    expect(dialog.style.getPropertyValue("--ink")).toBe("#ffffff");
    expect(dialog.style.getPropertyValue("--accent")).toBe("#000000");
    expect(dialog.style.getPropertyValue("--face")).toBe('"Barlow Condensed"');
    expect(within(dialog).getByRole("link", { name: "Yes, continue" })).toHaveAttribute("href", espn.url);
    // The focus is on No, not on Yes, which is first: an Enter held down on the cell's link closes the notice rather than following the study unread.
    expect(within(dialog).getByRole("button", { name: "No, stay here" })).toHaveFocus();
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it("closes for No and stays closed, and opens again for the link", () => {
    render(<StudyCell study={espn} />);
    open();
    const no = within(notice()).getByRole("button", { name: "No, stay here" });
    expect(fireEvent.click(no)).toBe(true);
    expect(notice()).not.toHaveAttribute("open");
    expect(screen.queryByRole("dialog")).toBeNull();
    open();
    expect(notice()).toHaveAttribute("open");
  });

  it("asks for a middle click too, which would open the study in a new tab, and leaves a right click to its menu", () => {
    render(<StudyCell study={espn} />);
    const link = screen.getByRole("link", { name: "Open the study: GIFspn" });
    const aux = (button: number) => fireEvent(link, new MouseEvent("auxclick", { bubbles: true, cancelable: true, button }));
    expect(aux(2)).toBe(true);
    expect(notice()).not.toHaveAttribute("open");
    expect(aux(1)).toBe(false);
    expect(notice()).toHaveAttribute("open");
  });

  it("follows the study for Yes, and closes on the way, so a reader who comes back finds the dial", () => {
    render(<StudyCell study={espn} />);
    open();
    const yes = within(notice()).getByRole("link", { name: "Yes, continue" });
    // Heard last, after the page has had the click. jsdom goes nowhere, so the test stops it there.
    let followed = false;
    const watch = (event: Event) => {
      followed = !event.defaultPrevented;
      event.preventDefault();
    };
    document.addEventListener("click", watch);
    fireEvent.click(yes);
    document.removeEventListener("click", watch);
    expect(followed).toBe(true);
    expect(notice()).not.toHaveAttribute("open");
  });

  it("closes for a middle click on Yes too, which opens the study in a new tab and leaves this one on the dial", () => {
    render(<StudyCell study={espn} />);
    open();
    const yes = within(notice()).getByRole("link", { name: "Yes, continue" });
    const aux = (button: number) => fireEvent(yes, new MouseEvent("auxclick", { bubbles: true, cancelable: true, button }));
    // A right click is its menu's, and the notice stays.
    aux(2);
    expect(notice()).toHaveAttribute("open");
    aux(1);
    expect(notice()).not.toHaveAttribute("open");
  });

  it("brings the dial to rest on its cell as it opens, so nothing goes on moving behind it", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1440);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(900);
    setReducedMotion(false);
    vi.useFakeTimers();
    try {
      const ground = espn.colors.ground;
      const cells = [
        { id: "first", label: "First cell", ground, content: <p>First</p> },
        { id: "study", label: "GIFspn", ground, content: <StudyCell study={espn} /> },
        { id: "third", label: "Third cell", ground, content: <p>Third</p> },
        { id: "last", label: "Last cell", ground, content: <p>Last</p> },
      ];
      render(<Dial cells={cells} />);
      const announced = () => screen.getByTestId("dial-announce").textContent;
      const tile = () => document.querySelector('.dial__tile[data-current="true"]') as HTMLElement;
      fireEvent.keyDown(document.body, { key: "End" });
      while (announced() !== "GIFspn, 2 of 4") act(() => void vi.advanceTimersByTime(16));
      expect(tile().style.transform).not.toBe(paintTile(1, 1, 1440, 900).transform);
      open();
      expect(notice()).toHaveAttribute("open");
      expect(tile().style.transform).toBe(paintTile(1, 1, 1440, 900).transform);
      for (let i = 0; i < 300; i++) act(() => void vi.advanceTimersByTime(16));
      expect(announced()).toBe("GIFspn, 2 of 4");
      expect(tile().style.transform).toBe(paintTile(1, 1, 1440, 900).transform);
    } finally {
      vi.useRealTimers();
    }
  });

  it("holds the dial still while it is open: its keys are its own, and the dial's wheel and swipes do not reach it", () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1440);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(900);
    setReducedMotion(true);
    const ground = espn.colors.ground;
    render(
      <Dial
        cells={[
          { id: "study", label: "GIFspn", ground, content: <StudyCell study={espn} /> },
          { id: "next", label: "Next cell", ground, content: <p>Next</p> },
        ]}
      />,
    );
    const announced = () => screen.getByTestId("dial-announce").textContent;
    open();
    const yes = within(notice()).getByRole("link", { name: "Yes, continue" });
    for (const target of [notice(), yes]) {
      for (const key of ["ArrowDown", "End", "PageDown", " "]) expect(fireEvent.keyDown(target, { key })).toBe(true);
    }
    expect(fireEvent.wheel(notice(), { deltaY: 300 })).toBe(true);
    fireEvent.pointerDown(notice(), { pointerId: 7, isPrimary: true, pointerType: "touch", clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, { pointerId: 7, isPrimary: true, pointerType: "touch", clientX: 200, clientY: -400 });
    fireEvent.pointerUp(window, { pointerId: 7, isPrimary: true, pointerType: "touch", clientX: 200, clientY: -400 });
    expect(announced()).toBe("GIFspn, 1 of 2");
    // Closed, the dial is the reader's again.
    fireEvent.click(within(notice()).getByRole("button", { name: "No, stay here" }));
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(announced()).toBe("Next cell, 2 of 2");
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

  it("carries this site's own stamp as the cell's last line, under the form: its serial, that it is the site's, and no date", async () => {
    const { container } = render(<Signup action="" />);
    const cell = container.querySelector(".signup") as HTMLElement;
    const stamp = cell.lastElementChild as HTMLElement;
    expect(stamp).toHaveClass("stamp", "signup__release");
    expect(stamp.previousElementSibling?.tagName).toBe("FORM");
    expect(stamp).toHaveTextContent(/^This site is release GIFcommit00017$/);
    expect(stamp.querySelector(".visually-hidden")).toHaveTextContent(/^This site is release$/);
    expect(container.querySelector("time")).toBeNull();
    expect(container.textContent?.match(/GIFcommit\d{5}/g)).toEqual(["GIFcommit00017"]);
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

  it("names the introduction's cells for what a reader finds in them", () => {
    // What is announced as each takes the focus, and what its section is called.
    expect(cells.slice(0, 4).map((cell) => cell.label)).toEqual(["Golden Grids", "What is this?", "Parameters", "Case Studies"]);
  });

  it("labels each study by its name, and draws it on its own ground", () => {
    const study = studies[1] as (typeof studies)[number];
    expect(cells[5]).toMatchObject({ label: study.brand, ground: study.colors.ground });
    render(<>{cells[5]?.content}</>);
    expect(screen.getByRole("heading", { level: 2, name: study.brand })).toBeInTheDocument();
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
