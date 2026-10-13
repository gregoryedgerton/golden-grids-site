GIFcommit00017

# Golden Grids site

**Live: <https://gregoryedgerton.github.io/golden-grids-site/>**

The marketing site for [Golden Grids](https://github.com/gregoryedgerton/golden-grids), the Fibonacci layout library published as [`@gifcommit/golden-grids`](https://www.npmjs.com/package/@gifcommit/golden-grids).

It is one page: a spiral dial. Swipe up or left, scroll, or use the arrow keys to go deeper; the opposites go back. The dial runs through a title, a statement of what the library is, its parameters, a gallery of the layout studies, and ends at a mailing-list sign-up.

The repository and the site are both public. `main` is published to GitHub Pages while the repository variable `PUBLISH_SITE` is `true` (with Pages enabled, source GitHub Actions). Unset it and nothing is deployed.

## Adding a study

A study asks for its place here. When one is first published, `captures/site-issue.cjs` in the study's own repository opens an issue on this repository's board, "Gallery: add ⟨Brand⟩ (Study NN)", with the study's live address, the day it was first published and what its file needs. The repository is public so that the board can take those issues. Work from the issue, and close it from the pull request that adds the study.

Add one file to `src/studies/`, named for its number and subject:

```json
{
  "number": 14,
  "release": 13,
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

- `number` orders the gallery, latest first, and is not shown.
- `release` is the study's number among GIFcommit's releases. It is given on GIFcommit's master list, which is kept with the GIFcommit site, and is copied from there: a study that has no number on that list yet cannot be added. It is the study's stamp, the last line of its cell, as a serial: `GIFcommit00013`.
- `published` is the day the study first went live, as `YYYY-MM-DD`. It is shown at the top left of the study's cell. Only a study's cell shows a day.
- `brand` is the parody name, written exactly. It is never case-transformed.
- `colors.ink` sets the name and `colors.accent` the icon and the rule; each needs 3:1 contrast with `ground`. Small text takes whichever of them reads at 4.5:1, or white or black.
- `colors.letters` is optional: a list of colours for the name's first letters, one each and in order, for a name that opens in the colours of a mark (GIF.org's red G, black I and blue F). Each needs 3:1 with `ground`, and the rest of the name is in `ink`.
- `font.family` is a Google Fonts family under an open licence. Only the letters of the name are requested.
- `icon` is one of the names in `src/ui/icons.tsx`. If none fits, the file can draw its own: `"icon": { "path": "M3 20 12 4l9 16z" }` is SVG path data on a 24-unit grid, drawn as a line. Left out, the study gets a golden rectangle.

A file that breaks a rule fails the tests with the file's name and the reason.

## Release serials

GIFcommit numbers what it releases. The library, each study and this site are each a release, and a cell that stands for a release wears that release's stamp: its serial, as small light print where a disclaimer would be, on a line of its own at the foot of the cell with everything else above it. Each study's is on its own cell, the library's on the title, and the site's own on the last cell, with the sign-up.

The numbers are GIFcommit's, given on its master list. This site's and the library's are `release` and `libraryRelease` in `src/site.ts`, and a study's is `release` in its file. This README opens with the site's own serial, as every released repository's does.

## Icons and the share image

`public/og.png` and the icons are drawn from `scripts/brand/art.html`, which sets "Golden Grids" and "GG" the way the title cell does. The share image sets the name over `scripts/brand/share-still.jpg`, a still the owner supplied, under a scrim. Run this again if the title's lettering changes, and commit what it writes:

```bash
node scripts/brand/make.mjs <a directory whose node_modules has playwright>
```

## The title's clip

Behind the title is `src/assets/title.gif`, a five-second GIF the owner supplied. It plays once each time the title is the focused cell and rests on its last frame. A reader who has asked for reduced motion gets `src/assets/title-still.jpg` instead, a frame of it at the same size.

A GIF cannot be paused, so it must not repeat and must not run past five seconds; the tests read the file and fail if it does either. A GIF usually arrives set to repeat for ever. To replace the clip, take that instruction out and leave every frame as it is:

```bash
node scripts/brand/once.mjs <the new clip> src/assets/title.gif
```

## The mailing list

`subscribe` in `src/site.ts` is the address the sign-up form sends to: the Beehiiv publication's subscribe page. While it is empty the form is shown closed.

## The address

GitHub Pages publishes the site, today at <https://gregoryedgerton.github.io/golden-grids-site/>. It is to have a domain of its own as well, `golden-grids.gifcommit.com`, and the build is ready for it: every address it writes for its own files is relative, so one build works from `/golden-grids-site/` and from the root of a domain.

Moving to the domain is these steps, in this order:

1. Verify `gifcommit.com` for GitHub Pages: in the account's settings, under Pages, "Add a domain", which asks for a TXT record at the domain's DNS host. A verified domain's names can be attached only to its owner's sites.
2. At the DNS host, add a CNAME record for `golden-grids` that points to `gregoryedgerton.github.io`.
3. Once that name resolves, and not before, set it as the custom domain in the repository's settings, under Pages. From that moment GitHub redirects the github.io address to the domain; if the name does not resolve yet, that is a redirect to nothing and the site is down.
4. Change the address in `src/site.ts`, in the three places in `index.html` that repeat it (the tests hold them together) and at the top of this file. Until the domain is live they stay as they are: a share card or a crawler sent to a name that does not resolve finds nothing.
5. When GitHub has issued the certificate, turn on "Enforce HTTPS" in the same settings.

The github.io address keeps working afterwards, as a redirect. No `CNAME` file is needed: a deploy from GitHub Actions ignores one.

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
