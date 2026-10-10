import { contrast, inOrder, parseStudy, readable, studies } from "./index";
import type { Study } from "./index";

const valid = {
  number: 7,
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

  it("falls back to white or the site's ink when no candidate reads", () => {
    expect(readable("#121212", ["#222222", "#333333"])).toBe("#ffffff");
    expect(readable("#f7f7f7", ["#eeeeee", "#dddddd"])).toBe("#14100c");
  });
});

describe("parseStudy", () => {
  it("reads a study and works out its small-text colour", () => {
    expect(parseStudy(valid, "./07.json")).toEqual({
      ...valid,
      colors: { ...valid.colors, text: "#ffffff" },
    });
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
    ["no font", without("font"), "font is missing"],
    ["a font that is not an object", { ...valid, font: null }, "font is missing"],
    ["a family that could not be an address", { ...valid, font: { ...valid.font, family: "Inter&x=1" } }, "font.family must be a Google Fonts family name"],
    ["no family", { ...valid, font: { weight: 700, italic: false } }, "font.family must be a Google Fonts family name"],
    ["a weight too light", { ...valid, font: { ...valid.font, weight: 50 } }, "font.weight must be from 100 to 900"],
    ["a weight too heavy", { ...valid, font: { ...valid.font, weight: 950 } }, "font.weight must be from 100 to 900"],
    ["a weight in words", { ...valid, font: { ...valid.font, weight: "bold" } }, "font.weight must be from 100 to 900"],
    ["no italic", { ...valid, font: { family: "Inter", weight: 700 } }, "font.italic must be true or false"],
    ["an icon that is not drawn", { ...valid, icon: "rocket" }, "icon must be one of house, key"],
    ["no icon", without("icon"), "icon must be one of house, key"],
  ])("refuses %s, and says why", (_, raw, problem) => {
    expect(() => parseStudy(raw, "./07-coinbase.json")).toThrow(`Study ./07-coinbase.json: ${problem}`);
  });
});

describe("inOrder", () => {
  const study = (number: number, brand: string) => ({ ...parseStudy(valid, "x"), number, brand }) as Study;

  it("sorts by number without changing the list it was given", () => {
    const given = [study(3, "GIFc"), study(1, "GIFa"), study(2, "GIFb")];
    expect(inOrder(given).map((s) => s.brand)).toEqual(["GIFa", "GIFb", "GIFc"]);
    expect(given.map((s) => s.number)).toEqual([3, 1, 2]);
    expect(inOrder([])).toEqual([]);
  });

  it("refuses two studies with one number, and names them", () => {
    expect(() => inOrder([study(2, "GIFb"), study(1, "GIFa"), study(2, "GIFc")])).toThrow(
      "Two studies are numbered 2: GIFb and GIFc",
    );
  });
});

describe("the studies in this folder", () => {
  it("are all valid, in order, and enough to fill a gallery", () => {
    expect(studies.length).toBeGreaterThanOrEqual(13);
    expect(studies.map((s) => s.number)).toEqual([...studies.map((s) => s.number)].sort((a, b) => a - b));
    expect(studies[0]).toMatchObject({ number: 1, brand: "GIFbnb", reference: "Airbnb" });
  });

  it("each have small text that reads on their ground", () => {
    for (const { colors } of studies) {
      expect(contrast(colors.text, colors.ground)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
