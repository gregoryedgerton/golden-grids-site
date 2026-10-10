# Golden Grids site

The marketing site for [Golden Grids](https://github.com/gregoryedgerton/golden-grids), the Fibonacci layout library published as [`@gifcommit/golden-grids`](https://www.npmjs.com/package/@gifcommit/golden-grids).

## Running it

```bash
npm install
npm run dev
```

## Gates

Every change arrives by pull request and merges only when the Codex review of
its head commit reports no issues and CI is green. CI runs commitlint, ESLint,
`tsc`, the tests with a 100% coverage threshold, and the build. `main` is
released by semantic-release and deployed to GitHub Pages.
