// Writes a copy of a GIF that is shown through once and then rests on its last frame.
//
//   node scripts/brand/once.mjs <in.gif> <out.gif>
//
// A GIF repeats only if it carries the NETSCAPE2.0 application extension, which says how many
// times. This removes that one block and nothing else: every frame, colour table and delay in the
// copy is byte for byte what it was. The title's clip has to play once: a GIF cannot be paused,
// and anything that moves for more than five seconds needs a way to stop it.
import { readFileSync, writeFileSync } from "node:fs";

const [source, target] = process.argv.slice(2);
if (!source || !target) {
  console.error("usage: node scripts/brand/once.mjs <in.gif> <out.gif>");
  process.exit(1);
}

const gif = readFileSync(source);
if (!["GIF89a", "GIF87a"].includes(gif.toString("latin1", 0, 6))) {
  console.error(`${source} is not a GIF`);
  process.exit(1);
}

// The block: an extension (21) for an application (ff), eleven bytes naming it, then one
// sub-block of three bytes (01 and the count, low byte first) and a terminator.
const named = Buffer.concat([Buffer.from([0x21, 0xff, 0x0b]), Buffer.from("NETSCAPE2.0", "latin1")]);
const at = gif.indexOf(named);
if (at < 0) {
  writeFileSync(target, gif);
  console.log(`${source} already plays once: it has no repeat block. Copied as it is.`);
  process.exit(0);
}

const end = at + named.length;
if (gif[end] !== 3 || gif[end + 1] !== 1 || gif[end + 4] !== 0 || gif.indexOf(named, end) >= 0) {
  console.error(`${source} has a repeat block of a shape this does not know. Nothing written.`);
  process.exit(1);
}

const asked = gif.readUInt16LE(end + 2);
writeFileSync(target, Buffer.concat([gif.subarray(0, at), gif.subarray(end + 5)]));
console.log(
  `Removed the repeat block at byte ${at} (it asked for ${asked === 0 ? "endless repeats" : `${asked} repeats`}). ` +
    `${gif.length} bytes in, ${gif.length - (end + 5 - at)} out.`,
);
