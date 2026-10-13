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
`requestAnimationFrame` loop that does not consult the preference. A colour
that changes in place is not travel; the gallery's statement, below, is the
one case of it.

**The gallery's opening statement is said, once a visit.** By the owner's
direction, as the dial lands on its cell white crosses THESE, ARE and FAKE in
turn, inside the letters and from the left of each word. A word starts when it
would be said and takes about as long as it takes to say. The statement rests
white for as long again, black crosses it the same way, and it stays black. It
does not repeat: the owner asked that it not loop once it is back to black.

- It begins at once, as the dial lands: when the cell is the focused one and
  the dial is at rest on it or on its way to rest on it with nothing holding
  it. The owner asked for no wait, so do not flag that it starts while the
  cell is still arriving. Do flag it starting for a cell the dial is only
  passing on its way to another, or for one under a finger that has not let
  go, and any delay put back in front of the first word. A finger is on the
  dial from the moment it comes down, before it has moved anything, and with
  motion reduced too, where it moves nothing until it lifts.
- The only rest is white's, before black crosses it. A reader who comes back
  while the crossing they left is still finishing is owed a saying, and it
  begins the moment that crossing ends, not a rest later.
- It is said again only to a reader who has left the cell and come back. The
  dial stirring on a cell the reader never left, a finger taking it and
  letting it go, says nothing again.
- When the cell loses the focus, a crossing under way finishes and the
  statement stays the colour it reached. Nothing more is said while another
  cell has the focus: a statement left white stays white, and is crossed by
  black, and by black alone, when the reader returns. Flag anything that can
  leave it part white and part black.
- That holds while the cell is off the dial. The dial mounts only the cells
  near the focus, so the gallery's cell is removed when the reader is three or
  more cells past it and made again when they return. The statement is
  therefore kept outside the cell, one for the page, made in `buildCells`.
  Flag any of its state that moves into the cell, where it would be lost.
- Under reduced motion nothing travels across a word: each word changes
  colour whole, on its beat. The owner asked for exactly that, the colour
  still changing and the slide hidden. Do not flag the change of colour; do
  flag an edge that moves through a word, or a frame requested, under the
  preference.
- The colour is one fill with a hard edge, drawn by `FitText`, never a second
  copy of the letters laid over the first.
- White and the cell's own ink each keep 3:1 against the cell's red. Under a
  forced palette the statement keeps the reader's text colour and nothing
  crosses it.
- All of it is over in under five seconds, so it has no control of its own
  and needs none. Flag a change that would make it run longer.

**The presenter's line stands where the owner put it.** "GIFcommit presents"
is set 1cqw down from the top of the title's column, and centred exactly.
The owner has moved it more than once: last upward, when the stamp's line at
the foot made the name a little smaller, and back to the centre from half an
em right of it, which it no longer needed once it stood clear of the name.
Do not flag where it stands, and flag a change that moves it without the
owner's word.

**The title's clip is the owner's, and it plays once.** Behind the title is a
GIF the owner supplied, five seconds of an old film, in `src/assets/title.gif`,
and beside it the still the owner supplied to stand in for it,
`src/assets/title-still.jpg`. They replace YouTube's embedded player by the
owner's decision; nothing of YouTube's is left. A third picture,
`scripts/brand/share-still.jpg`, is the owner's still behind the share image.
Flag any other frame or clip of film in the repository or the build.

- A GIF cannot be paused, so this one has to end by itself, and soon. It
  carries no instruction to repeat and its frames add up to five seconds.
  WCAG 2.2.2 asks for a control only for what moves for more than five
  seconds, which is why the cell has none: do not flag the missing control.
  `src/assets.test.ts` reads the file and holds it to both. Flag any change
  that lets it repeat or run longer, and any replacement of the file that has
  not been through `scripts/brand/once.mjs`.
- It is on the page only while the title is the focused cell, and it plays
  once, from its first frame, each time the title is focused again. Each
  showing has an address of its own, because a browser that has played a GIF
  may show a new picture of the same file at its last frame. Flag a change
  that shows it from the file's own address, or lets it play in another cell.
- Under reduced motion the clip is not shown and not fetched, and a fetch of
  it under way when the preference is turned on is stopped. The still stands
  in for it, whether or not the title is the focused cell.
- The clip ends on a cut to a dark shot, and rests there. The owner wants that
  shot kept: it is the rhythm of the clip. It has been tried without. The
  owner had the shot taken off so that the clip ended on the explosion, saw
  it, and had it put back: a clip that stops dead on the explosion looks like
  a glitch. Do not flag the dark frame the title rests on, and do flag a
  change that trims the clip or ends it sooner.
- The owner hosts the clip rather than embed a player for it, having weighed
  what the player cost every reader in load. Do not flag that it is a file
  here and not an embed.

**Directions are fixed.** Swiping up or left, scrolling down or right, and the
Down, Right, Page Down and Space keys go deeper; the opposites go back. Keys
typed into a form field never move the dial.

**A scroll turns the dial one cell.** The smallest notch a wheel reports is a
scroll (three pixels of travel make one), and a scroll is one cell and no
more, the tail of a flick and a wheel held spinning included. Within an
unbroken stream of wheel events the dial turns again for two things only:

- a second push, which is looked for only after a hard one. A scroll that
  peaked at 8 px or more falls to a third of that peak, and then an event is
  more than three times its lowest since and at least 8 px itself;
- the wheel turned the other way on the scroll's axis.

Otherwise it turns again only once the wheel has gone quiet. Travel that
never reaches 8 px in an event is one scroll however it dips and recovers:
`4, 1, 4` is one cell, by design. At a few pixels a stream of wheel events
wobbles by a factor of three on its own, as a flick starts, at the faint end
of its tail and all through a slow drag, and a rule that read a push into
that turned one flick into two cells. Do not flag a gentle second push as
lost.

A scroll has one axis: before it turns the dial, travel is gathered on each
axis by itself and the first to have a scroll's worth is the scroll's; after,
only that axis is read. Flag anything that lets a steady or dying stream of
wheel events carry the dial across several cells, drops a notch or a hard
second flick the reader made, or leaves the dial between two cells.

**Every cell that is a release wears one stamp.** GIFcommit numbers its
releases on a master list kept with the GIFcommit site. By the owner's
direction a cell that stands for a release carries that release's stamp: its
serial, alone, as fine print where a disclaimer would be
(`src/ui/Stamp.tsx`). It is the cell's last line and has that line to itself,
across the cell's whole width, with everything else in the cell above it and
a little room over it. There are three kinds: each study's on its own cell;
the library's on the title, which is the library's; and the site's own on the
last cell, with the sign-up.

The stamp is small and light, by the owner's direction: release numbers are
to be discreet. The stamp carries no date. The owner tried the serial at the
top left, tried the day beside it, and settled on this. Do not flag the size
or the light weight; do flag a stamp set larger or heavier than the cell's
other fine print, one that shares its line with anything or is not the
cell's last, and a date put into a stamp.

**Only a study's cell shows a day.** The day a study was published is at the
top left of its cell, where it always was, by the owner's direction. The
title, which is the library's, and the last cell show none: the owner asked
for the day on the case studies and nowhere else. Flag a day on any other
cell, and a study's cell without one.

Numbers are GIFcommit's, and are copied from its list, never made up here.
Flag a serial written any way but the name exactly and the number to five
places, a number that is not on that list, two studies with one release, and
a cell that is a release and has no stamp. The README opens with this site's
serial alone on its first line, above its heading: do not flag that line.

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

**The built site does not know where it is served.** GitHub Pages serves it
from `/golden-grids-site/` on github.io and from the root of a domain of its
own, and one build goes to both. Flag any address of one of the site's own
files that starts at the server's root, in the page, the styles or the
script; anything that reads the path the page is served from; and any return
to an absolute `base`. The canonical address and the share card's are the
exception: they are whole addresses on purpose, because whatever reads them
fetches from elsewhere, and `src/meta.test.ts` holds them to `site.url`.

**A test that cannot fail is worse than no test.** Watch for assertions that
only check a mock was called and tests that re-implement the code under test.
