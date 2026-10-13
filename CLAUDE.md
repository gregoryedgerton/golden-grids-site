# CLAUDE.md

Guidance for agents working on the Golden Grids marketing site.

## What this repo is

One page: a spiral dial. A reader swipes, scrolls or keys through an
introduction to Golden Grids (title, vision, parameters), then a gallery of
the layout studies, one lockup per study, and reaches an email sign-up in the
last cell. The library is consumed from npm at its published version; never
link a local checkout.

## The working loop

Issue → pull request → review → merge. No exceptions, including for docs.

1. File the issue first. Branch from a freshly pulled `main`.
2. Conventional commits (`type: subject`, lower case, imperative). Coverage
   stays at 100% of statements, branches, functions and lines.
3. Open the pull request with `Closes #N`. Comment `@codex review` after every
   push and resolve the threads that push fixed.
4. Merge only when both hold: Codex's review of HEAD reports no issues, and CI
   is green. Then `gh pr merge --rebase --delete-branch`.

`main` releases itself with semantic-release. It deploys to GitHub Pages only
while the repository variable `PUBLISH_SITE` is `true`, which it is.

The repository is public, by the owner's decision (2026-10-10), so that its
issue board can take a study's request to join the gallery. Every published
study opens "Gallery: add ⟨Brand⟩ (Study NN)" here, from
`captures/site-issue.cjs` in the study's own repository, with its live
address, the day it was first published and what its file in `src/studies/`
needs. That issue is the one to work from: confirm the study is live, add its
file, and close the issue from the pull request. Anyone can read the
repository, its history, its issues and its pull requests, so nothing secret
goes into any of them.

## Where it is served

GitHub Pages, from `/golden-grids-site/` on github.io and, once its domain is
set, from the root of `golden-grids.gifcommit.com`. One build goes to both, so
the build is relative (`base: "./"` in `vite.config.ts`) and
`src/build.test.ts` builds the site to check it. Do not address one of the
site's own files from the server's root, and do not read the path the page is
served from.

Moving to the domain is a sequence with an order (README, "The address"). The
custom domain is never set before its DNS name resolves: GitHub redirects the
github.io address at once, and until the name resolves the site is down. The
address in `src/site.ts`, `index.html` and the README changes only once the
domain is live.

## Rules

- **Accessible.** Every cell is a labelled section; only the focused cell is
  interactive, the rest are inert. The dial has Previous and Next buttons and
  announces the focused cell. axe runs in the test suite.
- **Reduced motion.** Under `prefers-reduced-motion` the dial jumps whole
  steps with no travel. The gallery's statement still changes colour, a word
  at a time on its beat, and nothing travels across a word: the owner asked
  for the colour to stay and the slide to go.
- **Directions.** Up or left goes deeper, down or right goes back. No
  calibration.
- **Studies are data.** One file per study in `src/studies/`; the gallery
  and its order derive from the folder, latest study first. The page states
  no count of them.
- **Serials.** The library, each study and this site are each one of
  GIFcommit's releases, numbered on GIFcommit's master list (`RELEASES.md` in
  the GIFcommit site's repository). The title shows the library's serial,
  each study's cell shows its own where its date used to be, and the last
  cell shows this site's. Copy a number from the list; never make one up.
- **Brand.** Parody names are written exactly and never case-transformed in
  CSS. GIFcommit is the presenter and the npm scope.
- **Copy.** Plain and exact. No jokes at a reference's expense, no verdicts on
  whether the grid suits a site.

## Where things are

- `src/dial/` is the dial: `geometry.ts` (where each cell sits at a depth),
  `input.ts` (what each gesture means), `controller.ts` (depth over time, with
  an injected clock), `Dial.tsx` (the page wiring).
- `src/cells/` is what is on it. `index.tsx` sets the order; the sign-up is
  always last. `statement.ts` is THESE ARE FAKE over time: the pace of the
  three words, and a controller on an injected clock, as the dial's is. It is
  said once a visit, white and then black. There is one statement for the
  page, made in `buildCells` and handed to the cell: cells are mounted only
  near the focus, and what a cell keeps is lost when it goes.
- A cell's content reads `useCellCurrent()` to know its cell is the focused
  one, and `useCellLanding()` to know the dial is landing on it: at rest on
  it or coming to rest on it, not passing it and not under a finger
  (`src/dial/current.ts`). The title's clip plays on the first, the gallery's
  statement starts on the second.
- `src/studies/*.json` are the studies, validated by `src/studies/index.ts`.
- `src/ui/FitText.tsx` fits display type to its box. A cell's square is
  100cqw on a side at any size, so cell styles are written in `cqw`.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```
