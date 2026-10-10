import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// The title screen prints the library's version. It is read from the copy of
// the package this site is built against, so the number on the page is the
// number in the lockfile and never a guess.
const library = JSON.parse(
  readFileSync(new URL("./node_modules/@gifcommit/golden-grids/package.json", import.meta.url), "utf8"),
) as { version: string };

// On GitHub Pages the site is served from /<repository>/. The base is derived
// so a fork or a rename needs no edit.
const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  base: repository ? `/${repository}/` : "/",
  plugins: [react()],
  define: {
    __LIBRARY_VERSION__: JSON.stringify(library.version),
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
