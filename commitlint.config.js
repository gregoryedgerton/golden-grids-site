/**
 * Conventional commits, enforced, because the version is derived from them:
 * a `fix:` moves the patch, a `feat:` the minor, a `!` or a BREAKING CHANGE
 * footer the major. The body carries the reasoning and is not limited.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  // Dependabot writes its own subjects, with the type this repository gives
  // it and then "Bump …" with a capital, which the subject's case rule
  // rejects. Its wording cannot be configured, so its commits are let
  // through as they are; the type in front still decides the release.
  ignores: [(message) => /^(fix|chore|ci)(\([^)]*\))?: [Bb]ump /.test(message)],
  rules: {
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
};
