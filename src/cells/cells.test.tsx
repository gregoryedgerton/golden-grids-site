import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { fills } from "../../test/fills";
import { setReducedMotion } from "../../test/media";
import { clock } from "../dial/clock";
import { CellCurrent, CellLanding } from "../dial/current";
import { Dial } from "../dial/Dial";
import { prefersReducedMotion } from "../dial/motion";
import { site } from "../site";
import { embedUrl } from "../ui/BackgroundVideo";
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
import { LENS, PLATFORMS, Vision } from "./Vision";

const espn = parseStudy(
  {
    number: 6,
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

  const picture = () => document.querySelector(".bgvideo__still");

  it("shows a still from the video, and no player, for a reader who has asked for reduced motion", () => {
    setReducedMotion(true);
    render(focused(true));
    expect(frame()).toBeNull();
    expect(picture()).toHaveAttribute("src", expect.stringMatching(/title-still.*\.jpg$/));
    expect(document.querySelector(".bgvideo__scrim")).toBeInTheDocument();
  });

  it("keeps the still while another cell is focused, since it does not move", () => {
    setReducedMotion(true);
    render(focused(false));
    expect(picture()).toBeInTheDocument();
    expect(frame()).toBeNull();
  });

  it("shows no still while motion is allowed, playing or not", () => {
    const { rerender } = render(focused(true));
    expect(picture()).toBeNull();
    rerender(focused(false));
    expect(picture()).toBeNull();
    expect(frame()).toBeNull();
  });

  it("swaps the video for the still if reduced motion is turned on while it plays, and back", () => {
    render(focused(true));
    expect(frame()).toBeInTheDocument();
    act(() => setReducedMotion(true));
    expect(frame()).toBeNull();
    expect(picture()).toBeInTheDocument();
    act(() => setReducedMotion(false));
    expect(frame()).toBeInTheDocument();
    expect(picture()).toBeNull();
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
    expect(body).toHaveTextContent(/You still need them, but let’s push the envelope\./);
    // The owner's own punctuation: commas.
    expect(body).not.toHaveTextContent(";");
    expect(body).toHaveTextContent(LENS);
    expect(LENS).toMatch(/^Golden Grids is a new lens to view layouts through that leverages the golden ratio/);
    expect(LENS).toMatch(/instinctually know through nature\.$/);
    expect(body).toHaveTextContent(/What you put on them is your business, at least you won’t be boring\.$/);
    expect(body).toHaveTextContent(/at least you won’t be boring\.$/);
    expect(body).not.toHaveTextContent(/same boxes|all four/);
  });

  it("sets the 4 in the same weight as the word, and ends the heading's box at its baseline", () => {
    const { container } = render(<Vision />);
    const heading = container.querySelector(".vision__heading") as SVGSVGElement;
    // Nothing in the heading is marked out from the rest.
    expect(heading.querySelector("tspan")).toBeNull();
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
  it("is a reference to read: three parameters, their values and what each does", async () => {
    const { container } = render(<Parameters />);
    expect(screen.getByRole("heading", { level: 2, name: "Parameters" })).toBeInTheDocument();
    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual(["from · to", "placement", "clockwise"]);
    for (const { term, values, says } of PARAMETERS) {
      const list = screen.getByRole("list", { name: `Values for ${term}` });
      expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual([...values]);
      const item = screen.getByText(term).closest(".parameters__item") as HTMLElement;
      expect(item.querySelector(".parameters__says")).toHaveTextContent(says);
    }
    // Each term has two descriptions: what it takes, then what it does.
    const item = screen.getByText("placement").closest(".parameters__item") as HTMLElement;
    expect([...item.children].map((c) => c.tagName)).toEqual(["DT", "DD", "DD"]);
    expect(screen.getAllByRole("definition")).toHaveLength(PARAMETERS.length * 2);
    expect(within(screen.getByRole("list", { name: "Values for placement" })).getAllByRole("listitem")).toHaveLength(4);
    expect(PARAMETERS[2].says).toMatch(/clockwise, or counter-clockwise/);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("describes the range in the owner's words, with skipping as part of it and not a parameter or a byline", () => {
    const { container } = render(<Parameters />);
    const range = screen.getByText("from · to").closest(".parameters__item") as HTMLElement;
    // toHaveTextContent with a string would pass on a part of it; this is the whole of it.
    expect(range.querySelector(".parameters__says")?.textContent).toBe(
      "Determines number of boxes a grid contains using Fibonacci indexes for box count and values for box proportions. Grid cells are always squares except when the sequence is skipped. If a grid starts at index 4 then previous indexes are combined into a single rectangular box.",
    );
    expect(PARAMETERS.map((p) => p.term)).not.toContain("skip");
    expect(container.querySelector(".parameters__byline")).toBeNull();
    // One paragraph: nothing set apart inside the description.
    expect(range.querySelector(".parameters__says")?.children).toHaveLength(0);
  });

  it("puts the asterisk on the range itself, 0 – 91*, and the note it points to right under it", () => {
    render(<Parameters />);
    const range = within(screen.getByRole("list", { name: "Values for from · to" })).getAllByRole("listitem");
    // One chip, read as a range, not two numbers. It starts at 0: from 0 to 1 is a grid of one box.
    expect(range.map((li) => li.textContent)).toEqual(["0 – 91*"]);
    const item = screen.getByText("from · to").closest(".parameters__item") as HTMLElement;
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
    expect(item.nextElementSibling).toHaveTextContent(/^placement/);
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
  it("sets the parody name exactly, with the day it was published, its subject and a way to it", async () => {
    const { container } = render(<StudyCell study={espn} />);
    expect(screen.getByRole("heading", { level: 2, name: "GIFspn" })).toBeInTheDocument();
    // The date is the first thing in the cell, top left, where the number used to be.
    const date = container.querySelector(".study")?.firstElementChild as HTMLElement;
    expect(date).toHaveClass("study__date");
    expect(date).toHaveTextContent("Published Oct 6, 2026");
    expect(date.querySelector("time")).toHaveAttribute("datetime", "2026-10-06");
    // The study's number is not shown anywhere.
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
    expect(document.head.querySelector("link[data-face]")).toHaveAttribute("href", fontHref(espn.font, "GIFspn"));
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

  it("sets an upright face upright, a long name a word to a line, and any day as it is written", () => {
    const records = { ...espn, published: "2027-01-31", brand: "GIFmilk Records", font: { ...espn.font, italic: false } };
    const { container } = render(<StudyCell study={records} />);
    expect((container.querySelector(".study") as HTMLElement).style.getPropertyValue("--face-style")).toBe("normal");
    expect([...container.querySelectorAll(".study__name text")].map((t) => t.textContent)).toEqual(["GIFmilk", "Records"]);
    expect(screen.getByText("Jan 31, 2027")).toBeInTheDocument();
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
