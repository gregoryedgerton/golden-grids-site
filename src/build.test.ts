import { build } from "vite";

/** One file of the build: its name, and its text if it has any. */
type Built = { name: string; text: string };

/**
 * The site as it is published: built here with the project's own
 * configuration, in memory, so nothing is written to disk.
 */
async function builtSite(): Promise<Built[]> {
  const result = await build({ logLevel: "silent", build: { write: false } });
  const bundles = Array.isArray(result) ? result : [result];
  return bundles.flatMap((bundle) => {
    // Only a watcher has no output, and nothing here asks for one.
    if (!("output" in bundle)) throw new Error("the build returned no files");
    return bundle.output.map((file) => ({
      name: file.fileName,
      text: file.type === "chunk" ? file.code : typeof file.source === "string" ? file.source : "",
    }));
  });
}

/**
 * GitHub Pages serves the site from /golden-grids-site/ on github.io and from
 * the root of a domain of its own. One build is deployed to both, so nothing
 * in it may address one of the site's own files from the server's root.
 */
describe("the built site, which is served from more than one path", () => {
  let files: Built[];
  const file = (named: RegExp) => files.find(({ name }) => named.test(name)) as Built;

  beforeAll(async () => {
    // What is published is a production build; the test runner's own setting would make another kind.
    vi.stubEnv("NODE_ENV", "production");
    files = await builtSite();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("addresses its script, its styles and its icons from where the page is", () => {
    const page = file(/^index\.html$/).text;
    const addresses = [...page.matchAll(/<(?:script|link)\b[^>]*\s(?:src|href)="([^"]*)"/g)].map(
      (tag) => tag[1] as string,
    );
    // A whole address is another site's, or the page's own canonical one.
    const own = addresses.filter((address) => !address.startsWith("https://"));

    expect(own).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^\.\/assets\/[^/]+\.js$/),
        expect.stringMatching(/^\.\/assets\/[^/]+\.css$/),
        "./favicon-32.png",
        "./favicon-96.png",
        "./apple-touch-icon.png",
      ]),
    );
    expect(own.filter((address) => !address.startsWith("./"))).toEqual([]);
  });

  it("finds the title's clip and its still beside the script, not from the server's root", () => {
    const script = file(/\.js$/).text;
    // The script names both pictures, so it is the script that has to find
    // them: every address it holds for either, as written there.
    const named = [...script.matchAll(/["'`]([^"'`]*title-[^"'`]*\.(?:gif|jpg))["'`]/g)].map((quoted) => quoted[1] as string);

    expect(file(/title-still/).name).toMatch(/^assets\/[^/]+\.jpg$/);
    expect(file(/title-[^/]*\.gif$/).name).toMatch(/^assets\/[^/]+\.gif$/);
    expect(named.some((address) => address.endsWith(".gif"))).toBe(true);
    expect(named.some((address) => address.endsWith(".jpg"))).toBe(true);
    expect(named.filter((address) => address.startsWith("/"))).toEqual([]);
  });
});
