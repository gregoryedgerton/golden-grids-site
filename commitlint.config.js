/**
 * Conventional commits, enforced, because the version is derived from them:
 * a `fix:` moves the patch, a `feat:` the minor, a `!` or a BREAKING CHANGE
 * footer the major. The body carries the reasoning and is not limited.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
};
