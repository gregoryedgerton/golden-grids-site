import { serial, site } from "../site";
import { contrast, isDate, latestFirst, parseStudy, readable, studies, writeDate } from "./index";
import type { Study } from "./index";

const valid = {
  number: 7,
  release: 6,
  published: "2026-10-07",
  brand: "GIFbase",
  reference: "Coinbase",
  subject: "A signed-in exchange app",
  url: "https://example.com/study-07/",
  colors: { ground: "#0052ff", ink: "#ffffff", accent: "#0a0b0d" },
  font: { family: "Inter", weight: 700, italic: false },
  icon: "coin",
};

const without = (key: string) => Object.fromEntries(Object.entries(valid).filter(([k]) => k !== key));

describe("contrast", () => {
  it("is 21 between black and white, either way round, and 1 between a colour and itself", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 6);
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 6);
    expect(contrast("#0052ff", "#0052FF")).toBe(1);
  });

  it("matches the published ratio for a mid grey on white", () => {
    // #767676 is the usual example of the darkest grey that just passes AA on white.
    expect(contrast("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});

describe("readable", () => {
  it("takes the first candidate that reads as body text", () => {
    expect(readable("#0052ff", ["#ffffff", "#0a0b0d"])).toBe("#ffffff");
    // White on this red is 3.5:1: large type only. The dark accent reads.
    expect(readable("#ff385c", ["#ffffff", "#222222"])).toBe("#222222");
  });

  it("falls back to white or black when no candidate reads", () => {
    expect(readable("#121212", ["#222222", "#333333"])).toBe("#ffffff");
    expect(readable("#f7f7f7", ["#eeeeee", "#dddddd"])).toBe("#000000");
  });

  it("finds a colour that reads on every grey there is", () => {
    for (let v = 0; v < 256; v++) {
      const grey = `#${v.toString(16).padStart(2, "0").repeat(3)}`;
      expect(contrast(readable(grey, []), grey)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("parseStudy", () => {
  it("reads a study and works out its small-text colour", () => {
    expect(parseStudy(valid, "./07.json")).toEqual({
      ...valid,
      colors: { ...valid.colors, text: "#ffffff" },
    });
  });

  it("gives small text a colour that reads even on a mid grey, where neither the name nor the accent does", () => {
    const grey = { ...valid, colors: { ground: "#777777", ink: "#ffffff", accent: "#eeeeee" } };
    const { colors } = parseStudy(grey, "./grey.json");
    expect(colors.text).toBe("#000000");
    expect(contrast(colors.text, colors.ground)).toBeGreaterThanOrEqual(4.5);
  });

  it("takes an icon the study draws for itself, so a new kind of subject is still one file", () => {
    const path = "M3 20 12 4l9 16zM12 10v5m0 2.5v.5";
    expect(parseStudy({ ...valid, icon: { path, note: "x" } }, "./07.json").icon).toEqual({ path });
    expect(parseStudy({ ...valid, icon: { path: "m1-1e-3 2.5,+3 A1 1 0 0 1 2 2z" } }, "./07.json").icon).toEqual({
      path: "m1-1e-3 2.5,+3 A1 1 0 0 1 2 2z",
    });
  });

  it("gives a study that names no icon the golden rectangle", () => {
    expect(parseStudy(without("icon"), "./07.json").icon).toBe("grid");
  });

  it("keeps colours of their own for the name's first letters when a study gives them, and has none when it does not", () => {
    const letters = ["#ffffff", "#0a0b0d", "#ffbe2e"];
    expect(parseStudy({ ...valid, colors: { ...valid.colors, letters } }, "./07.json").colors.letters).toEqual(letters);
    expect(parseStudy(valid, "./07.json").colors).not.toHaveProperty("letters");
    // One for every letter of the name's first word is the most there can be.
    const whole = Array.from({ length: "GIFbase".length }, () => "#ffffff");
    expect(parseStudy({ ...valid, colors: { ...valid.colors, letters: whole } }, "./07.json").colors.letters).toEqual(whole);
  });

  it("does not carry fields it does not know", () => {
    expect(parseStudy({ ...valid, note: "x" }, "./07.json")).not.toHaveProperty("note");
  });

  it.each<[string, unknown, string]>([
    ["nothing", null, "is not an object"],
    ["a string", "GIFbase", "is not an object"],
    ["no number", without("number"), "number must be a whole number from 1"],
    ["a fractional number", { ...valid, number: 1.5 }, "number must be a whole number from 1"],
    ["number zero", { ...valid, number: 0 }, "number must be a whole number from 1"],
    ["no release", without("release"), "release must be the study's number on GIFcommit's master list, a whole number from 1 to 10000"],
    ["a release written as a serial", { ...valid, release: "GIFcommit00006" }, "release must be the study's number on GIFcommit's master list, a whole number from 1 to 10000"],
    ["a part of a release", { ...valid, release: 6.5 }, "release must be the study's number on GIFcommit's master list, a whole number from 1 to 10000"],
    ["release nought", { ...valid, release: 0 }, "release must be the study's number on GIFcommit's master list, a whole number from 1 to 10000"],
    ["a release past the last GIFcommit has promised", { ...valid, release: 10_001 }, "release must be the study's number on GIFcommit's master list, a whole number from 1 to 10000"],
    ["no publish date", without("published"), "published must be a real date, as YYYY-MM-DD"],
    ["a date in words", { ...valid, published: "October 7, 2026" }, "published must be a real date, as YYYY-MM-DD"],
    ["a date that is a number", { ...valid, published: 20261007 }, "published must be a real date, as YYYY-MM-DD"],
    ["a day that does not exist", { ...valid, published: "2026-02-31" }, "published must be a real date, as YYYY-MM-DD"],
    ["a month that does not exist", { ...valid, published: "2026-13-01" }, "published must be a real date, as YYYY-MM-DD"],
    ["no brand", without("brand"), 'brand must be a parody name starting "GIF"'],
    ["a brand that is not a parody name", { ...valid, brand: "Coinbase" }, 'brand must be a parody name starting "GIF"'],
    ["a brand in the wrong case", { ...valid, brand: "gifbase" }, 'brand must be a parody name starting "GIF"'],
    ["a brand that is only GIF", { ...valid, brand: "GIF" }, 'brand must be a parody name starting "GIF"'],
    ["no reference", without("reference"), "reference is missing"],
    ["a blank reference", { ...valid, reference: "  " }, "reference is missing"],
    ["no subject", { ...valid, subject: 4 }, "subject is missing"],
    ["no url", without("url"), "url must be an https address"],
    ["an insecure url", { ...valid, url: "http://example.com" }, "url must be an https address"],
    ["no colours", without("colors"), "colors is missing"],
    ["colours that are not an object", { ...valid, colors: null }, "colors is missing"],
    ["a short hex", { ...valid, colors: { ...valid.colors, ground: "#05f" } }, "colors.ground must be a six-digit hex colour"],
    ["a named colour", { ...valid, colors: { ...valid.colors, ink: "white" } }, "colors.ink must be a six-digit hex colour"],
    ["no accent", { ...valid, colors: { ground: "#0052ff", ink: "#ffffff" } }, "colors.accent must be a six-digit hex colour"],
    ["a name too close to the ground", { ...valid, colors: { ...valid.colors, ink: "#3366ff" } }, "colors.ink has less than 3:1 contrast with the ground"],
    ["an accent too close to the ground", { ...valid, colors: { ...valid.colors, accent: "#1a52ee" } }, "colors.accent has less than 3:1 contrast with the ground"],
    ["letters that are not a list", { ...valid, colors: { ...valid.colors, letters: "#ffffff" } }, "colors.letters must be a list of one to 7 colours, one for each of the name's first letters"],
    ["an empty list of letters", { ...valid, colors: { ...valid.colors, letters: [] } }, "colors.letters must be a list of one to 7 colours"],
    ["more letters than the name has", { ...valid, colors: { ...valid.colors, letters: Array.from({ length: 8 }, () => "#ffffff") } }, "colors.letters must be a list of one to 7 colours"],
    ["more letters than the first word of a longer name has", { ...valid, brand: "GIFab Records", colors: { ...valid.colors, letters: Array.from({ length: 6 }, () => "#ffffff") } }, "colors.letters must be a list of one to 5 colours"],
    ["a letter that is not a hex colour", { ...valid, colors: { ...valid.colors, letters: ["#ffffff", "red"] } }, "colors.letters[1] must be a six-digit hex colour"],
    ["a letter that is not a string", { ...valid, colors: { ...valid.colors, letters: [7] } }, "colors.letters[0] must be a six-digit hex colour"],
    ["a letter too close to the ground", { ...valid, colors: { ...valid.colors, letters: ["#ffffff", "#3366ff"] } }, "colors.letters[1] has less than 3:1 contrast with the ground"],
    ["no font", without("font"), "font is missing"],
    ["a font that is not an object", { ...valid, font: null }, "font is missing"],
    ["a family that could not be an address", { ...valid, font: { ...valid.font, family: "Inter&x=1" } }, "font.family must be a Google Fonts family name"],
    ["no family", { ...valid, font: { weight: 700, italic: false } }, "font.family must be a Google Fonts family name"],
    ["a weight too light", { ...valid, font: { ...valid.font, weight: 50 } }, "font.weight must be from 100 to 900"],
    ["a weight too heavy", { ...valid, font: { ...valid.font, weight: 950 } }, "font.weight must be from 100 to 900"],
    ["a weight in words", { ...valid, font: { ...valid.font, weight: "bold" } }, "font.weight must be from 100 to 900"],
    ["no italic", { ...valid, font: { family: "Inter", weight: 700 } }, "font.italic must be true or false"],
    ["an icon that is not in the catalogue", { ...valid, icon: "rocket" }, "icon must be one of grid, house, key"],
    ["an icon that is neither a name nor a drawing", { ...valid, icon: 4 }, "icon must be one of grid, house, key"],
    ["an icon that is nothing", { ...valid, icon: null }, "icon must be one of grid, house, key"],
    ["a drawing with no path", { ...valid, icon: {} }, "icon.path must be SVG path data, starting with M"],
    ["a drawing that is not path data", { ...valid, icon: { path: "<script>" } }, "icon.path must be SVG path data, starting with M"],
    ["a drawing that does not start with a move", { ...valid, icon: { path: "L3 4" } }, "icon.path must be SVG path data, starting with M"],
    ["a drawing that carries markup", { ...valid, icon: { path: 'M0 0"/><script>' } }, "icon.path must be SVG path data, starting with M"],
  ])("refuses %s, and says why", (_, raw, problem) => {
    expect(() => parseStudy(raw, "./07-coinbase.json")).toThrow(`Study ./07-coinbase.json: ${problem}`);
  });
});

describe("isDate and writeDate", () => {
  it("accepts a real day written YYYY-MM-DD, leap days included", () => {
    expect(isDate("2026-10-09")).toBe(true);
    expect(isDate("2028-02-29")).toBe(true);
  });

  it("refuses anything else", () => {
    for (const value of ["", "2026-10-9", "10/09/2026", "2026-02-30", "2027-02-29", "2026-00-10", "2026-10-09T00:00:00Z"]) {
      expect(isDate(value)).toBe(false);
    }
  });

  it("writes a day the way a cell shows it, whatever the reader's time zone", () => {
    expect(writeDate("2026-10-09")).toBe("Oct 9, 2026");
    // The first and last days of a year stay in that year.
    expect(writeDate("2026-01-01")).toBe("Jan 1, 2026");
    expect(writeDate("2026-12-31")).toBe("Dec 31, 2026");
  });
});

describe("latestFirst", () => {
  const study = (number: number, brand: string, release = number) => ({ ...parseStudy(valid, "x"), number, brand, release }) as Study;

  it("puts the highest number first, without changing the list it was given", () => {
    const given = [study(3, "GIFc"), study(1, "GIFa"), study(2, "GIFb")];
    expect(latestFirst(given).map((s) => s.brand)).toEqual(["GIFc", "GIFb", "GIFa"]);
    expect(given.map((s) => s.number)).toEqual([3, 1, 2]);
    expect(latestFirst([])).toEqual([]);
  });

  it("refuses two studies with one number, and names them", () => {
    expect(() => latestFirst([study(2, "GIFb"), study(1, "GIFa"), study(2, "GIFc")])).toThrow(
      "Two studies are numbered 2: GIFb and GIFc",
    );
  });
});

describe("latestFirst, and the releases the studies are", () => {
  const study = (number: number, brand: string, release: number) => ({ ...parseStudy(valid, "x"), number, brand, release }) as Study;

  it("refuses two studies that are one release, and names them", () => {
    expect(() => latestFirst([study(1, "GIFa", 5), study(2, "GIFb", 6), study(3, "GIFc", 5)])).toThrow("Two studies are release 5: GIFc and GIFa");
    // Next to each other in the gallery or far apart.
    expect(() => latestFirst([study(1, "GIFa", 5), study(2, "GIFb", 5)])).toThrow("Two studies are release 5: GIFb and GIFa");
  });

  it("takes releases in any order: a study's number in the series is not its place among the releases", () => {
    expect(latestFirst([study(1, "GIFa", 9), study(2, "GIFb", 4)]).map((s) => s.release)).toEqual([4, 9]);
  });

  it("keeps the first and the last release GIFcommit has promised", () => {
    expect(parseStudy({ ...valid, release: 1 }, "x").release).toBe(1);
    expect(parseStudy({ ...valid, release: 10_000 }, "x").release).toBe(10_000);
  });
});

describe("the studies in this folder", () => {
  it("are each a release of GIFcommit's: 03 to 17 are the second to the sixteenth, in the order they were made", () => {
    const byNumber = [...studies].sort((a, b) => a.number - b.number);
    expect(byNumber.map((s) => s.number)).toEqual(Array.from({ length: byNumber.length }, (_, i) => i + 3));
    expect(byNumber.slice(0, 15).map((s) => s.release)).toEqual(Array.from({ length: 15 }, (_, i) => i + 2));
    expect(serial(studies.find((s) => s.brand === "GIFflix")?.release as number)).toBe("GIFcommit00002");
    expect(serial(studies.find((s) => s.brand === "GIF.org")?.release as number)).toBe("GIFcommit00016");
  });

  it("are none of them the release that the library is, or that this site is", () => {
    const taken = studies.map((s) => s.release);
    expect(new Set(taken).size).toBe(taken.length);
    expect(taken).not.toContain(site.libraryRelease);
    expect(taken).not.toContain(site.release);
  });

  it("are all valid, latest first, and enough to fill a gallery", () => {
    expect(studies.length).toBeGreaterThanOrEqual(13);
    expect(studies.map((s) => s.number)).toEqual([...studies.map((s) => s.number)].sort((a, b) => b - a));
    expect(studies[0]?.number).toBe(Math.max(...studies.map((s) => s.number)));
  });

  it("include GIFdepot and GIFvidia, each with a drawing of its own", () => {
    const depot = studies.find((s) => s.number === 14);
    const vidia = studies.find((s) => s.number === 15);
    expect(depot).toMatchObject({ brand: "GIFdepot", reference: "The Home Depot" });
    expect(vidia).toMatchObject({ brand: "GIFvidia", reference: "Nvidia" });
    expect(depot?.icon).toHaveProperty("path");
    expect(vidia?.icon).toHaveProperty("path");
    expect(studies.indexOf(vidia as Study)).toBeLessThan(studies.indexOf(depot as Study));
  });

  it("each say when they were published, none later than the one after it in the gallery", () => {
    expect(studies.every((s) => isDate(s.published))).toBe(true);
    // Latest first by number, so the dates never go up as the gallery goes on.
    const days = studies.map((s) => s.published);
    expect(days).toEqual([...days].sort().reverse());
    expect(studies.find((s) => s.number === 15)?.published).toBe("2026-10-09");
    expect(studies.find((s) => s.number === 3)?.published).toBe("2026-10-05");
  });

  it("set GIF.org's G, I and F in the red, black and blue of its mark, and the rest of the name in its ink", () => {
    const org = studies.find((s) => s.number === 17);
    expect(org).toMatchObject({
      brand: "GIF.org",
      colors: { ink: "#222222", letters: ["#d62021", "#222222", "#237bbd"] },
    });
  });

  it("no longer include the first two studies", () => {
    expect(studies.some((s) => s.number === 1 || s.number === 2)).toBe(false);
    expect(studies.at(-1)?.number).toBe(3);
  });

  it("each have small text that reads on their ground", () => {
    for (const { colors } of studies) {
      expect(contrast(colors.text, colors.ground)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
