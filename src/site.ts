/** Facts about the site that more than one screen states. */
export const site = {
  name: "Golden Grids",
  presenter: "GIFcommit",
  /** The library's version, from the copy this site is built against. */
  version: __LIBRARY_VERSION__,
  npm: "https://www.npmjs.com/package/@gifcommit/golden-grids",
  github: "https://github.com/gregoryedgerton/golden-grids",
  /** The video behind the title, played from YouTube. */
  video: {
    id: "ohWEdv4bhdE",
    title: "David Bowie, “Golden Years”",
    url: "https://www.youtube.com/watch?v=ohWEdv4bhdE",
  },
  /**
   * Where the sign-up form sends an address: the Beehiiv publication's
   * subscribe page, which takes it as `email`. Empty until the publication
   * exists, and the form says so.
   */
  subscribe: "",
} as const;
