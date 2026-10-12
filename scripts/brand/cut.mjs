// Writes a copy of a GIF that ends after its first frames.
//
//   node scripts/brand/cut.mjs <in.gif> <out.gif> <frames to keep>
//
// A GIF is a run of blocks: each frame is a picture, with a small block before it saying how
// long it is held. This copies the file up to the end of the last frame wanted and closes it
// there. Nothing is drawn again: every frame that stays is byte for byte what it was, and so is
// how long it is held. The title's clip was cut this way, to end on the explosion.
import { readFileSync, writeFileSync } from "node:fs";

const [source, target, count] = process.argv.slice(2);
const keep = Number(count);
if (!source || !target || !Number.isInteger(keep) || keep < 1) {
  console.error("usage: node scripts/brand/cut.mjs <in.gif> <out.gif> <frames to keep>");
  process.exit(1);
}

const gif = readFileSync(source);
if (!["GIF89a", "GIF87a"].includes(gif.toString("latin1", 0, 6))) {
  console.error(`${source} is not a GIF`);
  process.exit(1);
}

// A colour table of 2 to the power of (n + 1) colours, three bytes each, if the flag for one is set.
const table = (packed) => (packed & 0x80 ? 3 * 2 ** ((packed & 7) + 1) : 0);
// After the header and the screen's size come the colours every frame shares.
let at = 13 + table(gif[10]);
// Steps over a run of sub-blocks, each led by its length, to past the empty one that ends it.
const skip = () => {
  while (gif[at] !== 0) at += gif[at] + 1;
  at += 1;
};

let frames = 0;
let end = -1;
while (gif[at] !== 0x3b) {
  if (gif[at] === 0x21) {
    // An extension: how long the next frame is held, a comment, an instruction to an application.
    at += 2;
    skip();
  } else if (gif[at] === 0x2c) {
    // A frame: where it sits and how big it is, perhaps colours of its own, a code size, and its data.
    at += 10 + table(gif[at + 9]) + 1;
    skip();
    frames += 1;
    if (frames === keep && end < 0) end = at;
  } else {
    console.error(`${source} has a block this does not know at byte ${at}. Nothing written.`);
    process.exit(1);
  }
}

if (frames <= keep) {
  writeFileSync(target, gif);
  console.log(`${source} has ${frames} frames, no more than the ${keep} asked for. Copied as it is.`);
  process.exit(0);
}

// Up to the end of the last frame wanted, and the byte that ends a GIF.
writeFileSync(target, Buffer.concat([gif.subarray(0, end), Buffer.from([0x3b])]));
console.log(`Kept ${keep} of ${frames} frames. ${gif.length} bytes in, ${end + 1} out.`);
