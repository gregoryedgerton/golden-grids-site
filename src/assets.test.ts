import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const bytes = (file: string) => readFileSync(resolve(process.cwd(), "src", "assets", file));

/**
 * What a GIF says of itself, read block by block: its size, how long each
 * frame is held, and which applications it carries instructions for. The
 * instruction to repeat is one of those, under the name NETSCAPE2.0.
 */
function readGif(gif: Buffer) {
  expect(gif.toString("latin1", 0, 6)).toBe("GIF89a");
  const size = [gif.readUInt16LE(6), gif.readUInt16LE(8)];
  /** A colour table of 2 to the power of (n + 1) colours, three bytes each, if the flag for one is set. */
  const table = (packed: number) => (packed & 0x80 ? 3 * 2 ** ((packed & 7) + 1) : 0);
  let at = 13 + table(gif[10] as number);
  /** Steps over a run of sub-blocks, each led by its length, to past the empty one that ends it. */
  const skip = () => {
    while (gif[at] !== 0) at += (gif[at] as number) + 1;
    at += 1;
  };
  const held: number[] = [];
  const applications: string[] = [];
  let frames = 0;
  for (;;) {
    const block = gif[at];
    if (block === 0x3b) break;
    if (block === 0x21) {
      const label = gif[at + 1];
      at += 2;
      // A frame's delay, in hundredths of a second, sits in the graphic control that precedes it.
      if (label === 0xf9) held.push(gif.readUInt16LE(at + 2) * 10);
      if (label === 0xff) applications.push(gif.toString("latin1", at + 1, at + 12));
      skip();
    } else {
      // An image: where it sits and how big it is, perhaps colours of its own, a code size, and its data.
      expect(block).toBe(0x2c);
      frames += 1;
      at += 10 + table(gif[at + 9] as number) + 1;
      skip();
    }
  }
  return { size, frames, held, applications, lasts: held.reduce((sum, ms) => sum + ms, 0) };
}

/** The width and height a JPEG says it is, from the frame header among its segments. */
function jpegSize(jpeg: Buffer) {
  expect(jpeg.readUInt16BE(0)).toBe(0xffd8);
  let at = 2;
  for (;;) {
    expect(jpeg[at]).toBe(0xff);
    const marker = jpeg[at + 1] as number;
    // The frame header: baseline, extended or progressive.
    if (marker >= 0xc0 && marker <= 0xc2) return [jpeg.readUInt16BE(at + 7), jpeg.readUInt16BE(at + 5)];
    at += 2 + jpeg.readUInt16BE(at + 2);
  }
}

/**
 * The clip behind the title cannot be paused: it is a GIF. So it must end by
 * itself, and soon. WCAG 2.2.2 asks for a way to pause, stop or hide anything
 * that moves for more than five seconds beside other content; this is why the
 * cell needs none.
 */
describe("the title's clip", () => {
  const clip = readGif(bytes("title.gif"));

  it("is shown through once: it carries no instruction to repeat", () => {
    // As the owner supplied it, it repeated for ever. `scripts/brand/once.mjs` takes that one block out.
    expect(clip.applications).toEqual([]);
  });

  it("moves for five seconds and no more", () => {
    // All fifty frames, the last five of them the dark shot it cuts to and rests on, which the owner wants kept.
    expect(clip.frames).toBe(50);
    expect(clip.held).toHaveLength(clip.frames);
    // Every frame says how long it is held. One that said nothing would be held as long as the browser liked.
    expect(Math.min(...clip.held)).toBeGreaterThan(0);
    expect(clip.lasts).toBeLessThanOrEqual(5000);
  });

  it("is the size of the still that stands in for it, so one takes the other's place without a jump", () => {
    expect(clip.size).toEqual([800, 450]);
    expect(jpegSize(bytes("title-still.jpg"))).toEqual(clip.size);
  });

  it("is small enough to fetch whole before it is shown", () => {
    // It is fetched in one piece and then played, so its weight is a wait on a slow line. Under three megabytes.
    expect(bytes("title.gif").length).toBeLessThan(3_000_000);
  });

  it("is read rightly by this test: the same reading finds the repeat in a GIF that has one", () => {
    const gif = bytes("title.gif");
    // The block the owner's file had, put back where it was: after the header and the colours shared by every frame.
    const repeat = Buffer.concat([Buffer.from([0x21, 0xff, 0x0b]), Buffer.from("NETSCAPE2.0", "latin1"), Buffer.from([3, 1, 0, 0, 0])]);
    const from = 13 + (gif[10] as number & 0x80 ? 3 * 2 ** (((gif[10] as number) & 7) + 1) : 0);
    const looping = readGif(Buffer.concat([gif.subarray(0, from), repeat, gif.subarray(from)]));
    expect(looping.applications).toEqual(["NETSCAPE2.0"]);
    expect(looping.frames).toBe(clip.frames);
    expect(looping.lasts).toBe(clip.lasts);
  });
});
