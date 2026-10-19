import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// The title screen prints the library's version. It is read from the copy of
// the package this site is built against, so the number on the page is the
// number in the lockfile and never a guess.
const library = JSON.parse(
  readFileSync(new URL("./node_modules/@gifcommit/golden-grids/package.json", import.meta.url), "utf8"),
) as { version: string };

export default defineConfig({
  // GitHub Pages serves the site from /<repository>/ on github.io and from the
  // root of a domain of its own, and the same build has to work at both. So
  // every address the build writes for one of the site's own files is
  // relative to the file that names it. A fork or a rename needs no edit.
  base: "./",
  plugins: [react()],
  define: {
    __LIBRARY_VERSION__: JSON.stringify(library.version),
    // The day of the build, which is the day of the deploy: the last cell
    // says when the site was last updated, and the day is never a guess.
    __UPDATED__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/**/*.test.{ts,tsx}"],
      reporter: ["text-summary", "text", "lcov"],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
