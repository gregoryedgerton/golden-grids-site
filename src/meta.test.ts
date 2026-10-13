import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import html from "../index.html?raw";
import { serial, site } from "./site";
import { isDate } from "./studies";

/** The content of a meta tag in index.html, by its name or property. */
function meta(key: string): string | undefined {
  const tag = new RegExp(`<meta\\s+(?:name|property)="${key}"\\s+content="([^"]*)"`).exec(html);
  return tag?.[1];
}

/** The width and height a PNG says it is, from its header. */
function pngSize(file: string): [number, number] {
  const bytes = readFileSync(resolve(process.cwd(), "public", file));
  expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

describe("the page's title and description", () => {
  it("is titled GIFcommit presents Golden Grids, in the tab and on a share card", () => {
    expect(site.title).toBe("GIFcommit presents Golden Grids");
    expect(/<title>([^<]*)<\/title>/.exec(html)?.[1]).toBe(site.title);
    expect(meta("og:title")).toBe(site.title);
    expect(site.title).toBe(`${site.presenter} presents ${site.name}`);
  });

  it("is described by the introduction of the library's README on npm, in both places", () => {
    expect(site.description).toMatch(/^Golden Grids is a responsive layout library driven by the Fibonacci Sequence\./);
    expect(site.description).toMatch(/but at least you won't be boring\.$/);
    expect(meta("description")).toBe(site.description);
    expect(meta("og:description")).toBe(site.description);
  });
});

describe("the share card", () => {
  it("points at the published site and a picture with a whole address", () => {
    expect(meta("og:url")).toBe(site.url);
    expect(/<link rel="canonical" href="([^"]*)"/.exec(html)?.[1]).toBe(site.url);
    expect(meta("og:image")).toBe(`${site.url}og.png`);
    expect(meta("og:type")).toBe("website");
    expect(meta("twitter:card")).toBe("summary_large_image");
    expect(meta("og:image:alt")).toMatch(/Golden Grids/);
  });

  it("has a picture of the size it says", () => {
    expect(pngSize("og.png")).toEqual([1200, 630]);
    expect([meta("og:image:width"), meta("og:image:height")]).toEqual(["1200", "630"]);
  });
});

describe("the icons", () => {
  it.each([
    ["favicon-32.png", 32, 'rel="icon" type="image/png" sizes="32x32"'],
    ["favicon-96.png", 96, 'rel="icon" type="image/png" sizes="96x96"'],
    ["apple-touch-icon.png", 180, 'rel="apple-touch-icon"'],
  ])("%s is a square of %i pixels, and the page links to it", (file, side, link) => {
    expect(pngSize(file)).toEqual([side, side]);
    expect(html).toContain(`<link ${link} href="%BASE_URL%${file}" />`);
  });

  it("no longer links an SVG icon, which share sheets and iOS do not read", () => {
    expect(html).not.toMatch(/favicon\.svg/);
  });
});

describe("the serials of GIFcommit's releases", () => {
  it("are the name, exactly, and the release's number to five places", () => {
    expect(serial(1)).toBe("GIFcommit00001");
    expect(serial(17)).toBe("GIFcommit00017");
    expect(serial(9999)).toBe("GIFcommit09999");
    expect(serial(10_000)).toBe("GIFcommit10000");
  });

  it("give this site and the library one each, with the day each was released, as GIFcommit's master list has them", () => {
    expect([serial(site.library.number), site.library.released]).toEqual(["GIFcommit00001", "2026-02-26"]);
    expect([serial(site.release.number), site.release.released]).toEqual(["GIFcommit00017", "2026-10-09"]);
    expect(isDate(site.library.released) && isDate(site.release.released)).toBe(true);
  });

  it("head the README: this site's own serial is its first line, alone, above its heading", () => {
    const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8").split("\n");
    expect(readme.slice(0, 3)).toEqual([serial(site.release.number), "", "# Golden Grids site"]);
  });
});
