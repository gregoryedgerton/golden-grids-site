/**
 * Draws the site's icons and share image from `art.html` into `public/`.
 *
 *   node scripts/brand/make.mjs <directory holding node_modules/playwright>
 *
 * Playwright is not a dependency of this site; point the script at any
 * checkout that has it. Run it again whenever the title's lettering changes,
 * and commit what it writes.
 */
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../public");
const from = process.argv[2];
if (!from) throw new Error("Pass the directory whose node_modules has playwright.");
const { chromium } = createRequire(resolve(from, "package.json"))("playwright");

const page = pathToFileURL(resolve(here, "art.html")).href;
const shots = [
  { art: "share", file: "og.png", width: 1200, height: 630, scale: 1 },
  { art: "icon", file: "apple-touch-icon.png", width: 512, height: 512, scale: 180 / 512 },
  { art: "icon", file: "favicon-96.png", width: 512, height: 512, scale: 96 / 512 },
  { art: "icon", file: "favicon-32.png", width: 512, height: 512, scale: 32 / 512 },
];

// Playwright's own Chromium if it has been downloaded, or else the Chrome installed on this machine.
const browser = await chromium.launch().catch(() => chromium.launch({ channel: "chrome" }));
for (const { art, file, width, height, scale } of shots) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
  const tab = await context.newPage();
  await tab.goto(`${page}?art=${art}`);
  await tab.waitForSelector("body[data-ready]");
  if ((await tab.getAttribute("body", "data-ready")) !== "yes") throw new Error(`${art}: the artwork's picture did not load.`);
  await tab.locator("#stage").screenshot({ path: resolve(out, file) });
  await context.close();
  console.log("wrote", file);
}
await browser.close();
