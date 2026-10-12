/** Facts about the site that more than one screen states. */
export const site = {
  name: "Golden Grids",
  presenter: "GIFcommit",
  /** Where the site is published. */
  url: "https://gregoryedgerton.github.io/golden-grids-site/",
  /** The page's title, in a browser tab and on a share card. */
  title: "GIFcommit presents Golden Grids",
  /** The page's description: the introduction of the library's README on npm, as written there. */
  description:
    "Golden Grids is a responsive layout library driven by the Fibonacci Sequence. Instead of traditional rows and columns you get proportionally aligned boxes that follow the golden ratio. What you do with those boxes is your business, but at least you won't be boring.",
  /** The library's version, from the copy this site is built against. */
  version: __LIBRARY_VERSION__,
  npm: "https://www.npmjs.com/package/@gifcommit/golden-grids",
  github: "https://github.com/gregoryedgerton/golden-grids",
  /**
   * Where the sign-up form sends an address: the Beehiiv publication's
   * subscribe page, which takes it as `email`. Empty until the publication
   * exists, and the form says so.
   */
  subscribe: "",
} as const;
