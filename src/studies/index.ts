import { ICON_NAMES, isPath } from "../ui/icons";
import type { IconName, IconSource } from "../ui/icons";
import type { Face } from "../ui/fonts";

/**
 * The studies, read from this folder. Adding a study is adding one JSON file
 * here: the gallery, its count and its order follow.
 *
 * Every file is checked as it is read, so a missing field or a pair of
 * colours that cannot be read fails the tests, not the page.
 */
export type Study = {
  /** The study's number in the series. Orders the gallery, latest first. */
  number: number;
  /** The parody name, exactly as written: GIF, then the tail of the reference's name. */
  brand: string;
  /** The site the study rebuilds. */
  reference: string;
  /** What of that site was rebuilt, in a few words. */
  subject: string;
  /** Where the study is published. */
  url: string;
  colors: {
    /** The cell's square. */
    ground: string;
    /** The name. */
    ink: string;
    /** The icon and the rule. */
    accent: string;
    /** Small text: whichever colour reads at body size on the ground. Derived. */
    text: string;
  };
  font: Face;
  /**
   * A name from the catalogue, or the study's own drawing: `{ "path": "…" }`,
   * SVG path data on a 24-unit grid, drawn as a line. Left out, the study
   * gets the golden rectangle. Either way the study is one file.
   */
  icon: IconSource;
};

const HEX = /^#[0-9a-f]{6}$/i;
/** WCAG AA for large type and for graphics. */
const LARGE = 3;
/** WCAG AA for body text. */
const BODY = 4.5;
/**
 * Whatever the ground, one of these reads on it: black and white between them
 * leave no colour below 4.58:1. A softer black would, on a mid grey.
 */
const FALLBACKS = ["#ffffff", "#000000"];

function luminance(hex: string): number {
  const channel = (at: number) => {
    const v = parseInt(hex.slice(at, at + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** The WCAG contrast ratio of two colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** The first candidate that reads as body text on the ground, or else white or black. */
export function readable(ground: string, candidates: string[]): string {
  return [...candidates, ...FALLBACKS].find((color) => contrast(color, ground) >= BODY) as string;
}

function fail(file: string, problem: string): never {
  throw new Error(`Study ${file}: ${problem}`);
}

/** Reads one study file, or says exactly what is wrong with it. */
export function parseStudy(raw: unknown, file: string): Study {
  if (typeof raw !== "object" || raw === null) fail(file, "is not an object");
  const { number, brand, reference, subject, url, colors, font, icon } = raw as Record<string, unknown>;

  if (!Number.isInteger(number) || (number as number) < 1) fail(file, "number must be a whole number from 1");
  if (typeof brand !== "string" || !/^GIF\S/.test(brand)) fail(file, 'brand must be a parody name starting "GIF"');
  for (const [name, value] of [["reference", reference], ["subject", subject]] as const) {
    if (typeof value !== "string" || !value.trim()) fail(file, `${name} is missing`);
  }
  if (typeof url !== "string" || !url.startsWith("https://")) fail(file, "url must be an https address");

  if (typeof colors !== "object" || colors === null) fail(file, "colors is missing");
  const { ground, ink, accent } = colors as Record<string, unknown>;
  for (const [name, value] of [["ground", ground], ["ink", ink], ["accent", accent]] as const) {
    if (typeof value !== "string" || !HEX.test(value)) fail(file, `colors.${name} must be a six-digit hex colour`);
  }
  const palette = { ground: ground as string, ink: ink as string, accent: accent as string };
  for (const name of ["ink", "accent"] as const) {
    if (contrast(palette[name], palette.ground) < LARGE) {
      fail(file, `colors.${name} has less than ${LARGE}:1 contrast with the ground`);
    }
  }

  if (typeof font !== "object" || font === null) fail(file, "font is missing");
  const { family, weight, italic } = font as Record<string, unknown>;
  if (typeof family !== "string" || !/^[A-Za-z0-9 ]+$/.test(family)) fail(file, "font.family must be a Google Fonts family name");
  if (!Number.isInteger(weight) || (weight as number) < 100 || (weight as number) > 900) {
    fail(file, "font.weight must be from 100 to 900");
  }
  if (typeof italic !== "boolean") fail(file, "font.italic must be true or false");

  let drawn: IconSource = "grid";
  if (typeof icon === "object" && icon !== null) {
    const { path } = icon as Record<string, unknown>;
    if (!isPath(path)) fail(file, "icon.path must be SVG path data, starting with M");
    drawn = { path };
  } else if (icon !== undefined) {
    if (!ICON_NAMES.includes(icon as IconName)) {
      fail(file, `icon must be one of ${ICON_NAMES.join(", ")}, or { "path": "…" }, or left out`);
    }
    drawn = icon as IconName;
  }

  return {
    number: number as number,
    brand,
    reference: reference as string,
    subject: subject as string,
    url,
    colors: { ...palette, text: readable(palette.ground, [palette.ink, palette.accent]) },
    font: { family, weight: weight as number, italic },
    icon: drawn,
  };
}

/** From the latest study to the oldest. Two studies cannot share a number. */
export function latestFirst(list: Study[]): Study[] {
  const sorted = [...list].sort((a, b) => b.number - a.number);
  sorted.forEach((study, i) => {
    if (i > 0 && (sorted[i - 1] as Study).number === study.number) {
      throw new Error(`Two studies are numbered ${study.number}: ${(sorted[i - 1] as Study).brand} and ${study.brand}`);
    }
  });
  return sorted;
}

const files = import.meta.glob<unknown>("./*.json", { eager: true, import: "default" });

export const studies: Study[] = latestFirst(Object.entries(files).map(([file, raw]) => parseStudy(raw, file)));
