# Golden Grids site

**Live: <https://gregoryedgerton.github.io/golden-grids-site/>**

The marketing site for [Golden Grids](https://github.com/gregoryedgerton/golden-grids), the Fibonacci layout library published as [`@gifcommit/golden-grids`](https://www.npmjs.com/package/@gifcommit/golden-grids).

It is one page: a spiral dial. Swipe up or left, scroll, or use the arrow keys to go deeper; the opposites go back. The dial runs through a title, a statement of what the library is, its parameters, a gallery of the layout studies, and ends at a mailing-list sign-up.

The repository is private; the site is public. `main` is published to GitHub Pages while the repository variable `PUBLISH_SITE` is `true` (with Pages enabled, source GitHub Actions). Unset it and nothing is deployed.

## Adding a study

Add one file to `src/studies/`, named for its number and subject:

```json
{
  "number": 14,
  "published": "2026-10-09",
  "brand": "GIFdepot",
  "reference": "The Home Depot",
  "subject": "A product page",
  "url": "https://gregoryedgerton.github.io/golden-grids-study-14-homedepot/",
  "colors": { "ground": "#f96302", "ink": "#ffffff", "accent": "#000000" },
  "font": { "family": "Archivo", "weight": 800, "italic": false },
  "icon": "house"
}
```

Nothing else changes: the gallery comes from the folder and runs from the latest study to the oldest.

- `number` orders the gallery, latest first, and is not shown. `published` is the day the study first went live, as `YYYY-MM-DD`; it is shown on the study's cell.
- `brand` is the parody name, written exactly. It is never case-transformed.
- `colors.ink` sets the name and `colors.accent` the icon and the rule; each needs 3:1 contrast with `ground`. Small text takes whichever of them reads at 4.5:1, or white or black.
- `font.family` is a Google Fonts family under an open licence. Only the letters of the name are requested.
- `icon` is one of the names in `src/ui/icons.tsx`. If none fits, the file can draw its own: `"icon": { "path": "M3 20 12 4l9 16z" }` is SVG path data on a 24-unit grid, drawn as a line. Left out, the study gets a golden rectangle.

A file that breaks a rule fails the tests with the file's name and the reason.

## Icons and the share image

`public/og.png` and the icons are drawn from `scripts/brand/art.html`, which sets "Golden Grids" and "GG" the way the title cell does. Run this again if the title's lettering changes, and commit what it writes:

```bash
node scripts/brand/make.mjs <a directory whose node_modules has playwright>
```

## The mailing list

`subscribe` in `src/site.ts` is the address the sign-up form sends to: the Beehiiv publication's subscribe page. While it is empty the form is shown closed.

## Running it

```bash
npm install
npm run dev
```

## Gates

Every change arrives by pull request and merges only when the Codex review of
its head commit reports no issues and CI is green. CI runs commitlint, ESLint,
`tsc`, the tests with a 100% coverage threshold, and the build. `main` is
released by semantic-release, and deployed to GitHub Pages when `PUBLISH_SITE`
is on.
