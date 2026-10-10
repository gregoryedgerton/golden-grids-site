# AGENTS.md

## Code review rules

For any automated reviewer on a pull request. Formatting, types, lint and the
coverage threshold are already gates in CI; raising them here dilutes the
signal. These are the things CI cannot see.

**Two is the floor for anything the library lays out.** `generateGoldenGridLayout`
and `trailToRotateDeg` throw below two squares, and a throw during render
unmounts the whole page. Flag any path that can hand either fewer than two.

**The sign-up form is reached only at the last cell.** No link, shortcut or
focus order may put the email field in front of a reader anywhere else, and
only the focused cell may hold focusable content: every other cell is inert.

**Motion is opt-out.** Under `prefers-reduced-motion` the dial moves in whole
steps with no travel between them. Flag any animation, transition or
`requestAnimationFrame` loop that does not consult the preference.

**The title's video is YouTube's.** It is played through YouTube's embedded
player and never copied into the repository or the build. The one exception is
`scripts/brand/still.jpg`, a single still the owner supplied, which is used
only behind the title on the share image. Flag any other frame or clip of
the video, and any use of that still on the page itself. It plays only while
the title is the focused cell and never under reduced motion. It has no
control of its own by the owner's decision; do not flag the missing pause
button, and do flag anything that would let it play in another cell.

**Directions are fixed.** Swiping up or left, scrolling down or right, and the
Down, Right, Page Down and Space keys go deeper; the opposites go back. Keys
typed into a form field never move the dial.

**A study is data.** Adding a study is one file in `src/studies/`. Flag a
change that needs a second edit elsewhere to add one, and any study entry
whose brand is case-transformed in CSS: the parody names are written exactly
(GIFbnb, GIFspn) and `text-transform` must not touch them.

**Nothing from a studied site is shipped.** Lockups use the parody name, the
study's colours and a face from an open licence. No logos, wordmarks or
photography from the reference.

**Platform marks are the one exception to "no logos".** The cell on platforms
shows the React, Apple and Android marks in one colour to name where the
library runs, by the owner's decision. Flag any other third-party logo, and
any change that recolours, alters or restyles these three.

**Email addresses are not handled here.** The form posts straight to the
mailing-list provider. Flag any code that stores, logs or sends an address
anywhere else.

**A test that cannot fail is worse than no test.** Watch for assertions that
only check a mock was called and tests that re-implement the code under test.
