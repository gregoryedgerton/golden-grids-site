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

`main` releases itself with semantic-release and deploys to GitHub Pages.

## Rules

- **Accessible.** Every cell is a labelled section; only the focused cell is
  interactive, the rest are inert. The dial has Previous and Next buttons and
  announces the focused cell. axe runs in the test suite.
- **Reduced motion.** Under `prefers-reduced-motion` the dial jumps whole
  steps with no travel.
- **Directions.** Up or left goes deeper, down or right goes back. No
  calibration.
- **Studies are data.** One file per study in `src/studies/`; the gallery,
  the count and the order derive from the folder, latest study first.
- **Brand.** Parody names are written exactly and never case-transformed in
  CSS. GIFcommit is the presenter and the npm scope.
- **Copy.** Plain and exact. No jokes at a reference's expense, no verdicts on
  whether the grid suits a site.

## Where things are

- `src/dial/` is the dial: `geometry.ts` (where each cell sits at a depth),
  `input.ts` (what each gesture means), `controller.ts` (depth over time, with
  an injected clock), `Dial.tsx` (the page wiring).
- `src/cells/` is what is on it. `index.tsx` sets the order; the sign-up is
  always last.
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
