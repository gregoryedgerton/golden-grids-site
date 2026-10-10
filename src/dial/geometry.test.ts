import { AHEAD, BEHIND, SQUARES, TEXTURE_PX, TURN, layoutFor, mountedAround, paintTile, placeAt, trailFor } from "./geometry";

/** Every number in a CSS transform, in order. */
const numbers = (css: string) => (css.match(/-?\d+(\.\d+)?(e-?\d+)?/g) as string[]).map(Number);

/** `translate(x, y) rotate(r) scale(s)` as numbers, with the rotation taken within one turn. */
function parts(css: string) {
  const [x, y, rotate, scale] = numbers(css) as [number, number, number, number];
  return { x, y, rotate: ((rotate % 360) + 360) % 360, scale };
}

describe("placeAt", () => {
  it("leaves the first cells where the camera finds them", () => {
    expect(placeAt(0)).toEqual({ local: 0, shift: 0 });
    expect(placeAt(6.5)).toEqual({ local: 6.5, shift: 0 });
  });

  it("moves the cells one whole turn along the run every four steps", () => {
    expect(placeAt(7)).toEqual({ local: 3, shift: TURN });
    expect(placeAt(10.75)).toEqual({ local: 6.75, shift: TURN });
    expect(placeAt(11)).toEqual({ local: 3, shift: 2 * TURN });
    expect(placeAt(250.5)).toEqual({ local: 6.5, shift: 244 });
  });
});

describe("mountedAround", () => {
  it("keeps the cells the window can show and no others", () => {
    expect(mountedAround(20, 100)).toEqual(Array.from({ length: BEHIND + AHEAD + 1 }, (_, i) => 20 - BEHIND + i));
  });

  it("stops at both ends of the list", () => {
    expect(mountedAround(0, 3)).toEqual([0, 1, 2]);
    expect(mountedAround(99, 100)).toEqual([97, 98, 99]);
    expect(mountedAround(0, 1)).toEqual([0]);
  });
});

describe("trailFor", () => {
  it("grows the spiral into the stage's longer side", () => {
    expect(trailFor(1440, 900)).toBe("right");
    expect(trailFor(900, 900)).toBe("right");
    expect(trailFor(390, 800)).toBe("bottom");
  });
});

describe("layoutFor", () => {
  it("lays the run out once per trail", () => {
    expect(layoutFor("right")).toBe(layoutFor("right"));
    expect(layoutFor("right")).not.toBe(layoutFor("bottom"));
    expect(layoutFor("bottom").squares).toHaveLength(SQUARES);
  });
});

describe("paintTile", () => {
  const stages: [number, number][] = [
    [1440, 900],
    [390, 800],
  ];

  it.each(stages)("fills the shorter side of a %i by %i stage with the focused cell, pinned top left", (w, h) => {
    const side = Math.min(w, h);
    for (const depth of [0, 4, 8, 96]) {
      const tile = paintTile(depth, depth, w, h);
      const { x, y, rotate, scale } = parts(tile.transform);
      expect(x).toBeCloseTo(0, 6);
      expect(y).toBeCloseTo(0, 6);
      expect(rotate).toBeCloseTo(0, 6);
      expect(scale * TEXTURE_PX).toBeCloseTo(side, 6);
      expect(tile).toMatchObject({ opacity: 1, visible: true });
    }
  });

  it.each(stages)("puts the next cell in the room left over on a %i by %i stage", (w, h) => {
    const side = Math.min(w, h);
    const next = paintTile(1, 0, w, h);
    const { x, y, scale } = parts(next.transform);
    expect(next.visible).toBe(true);
    // Beside the focus on a wide stage, below it on a tall one.
    if (w >= h) expect(x).toBeCloseTo(side, 6);
    else expect(y).toBeCloseTo(side, 6);
    expect(scale * TEXTURE_PX).toBeCloseTo(side / ((1 + Math.sqrt(5)) / 2), 3);
  });

  it("holds the content level while its box turns", () => {
    const quarter = paintTile(1, 1, 1440, 900);
    expect(parts(quarter.transform).rotate).toBeCloseTo(90, 6);
    expect(numbers(quarter.content)[0]).toBeCloseTo(-90, 6);
    // No swell: the content is type and keeps its size.
    expect(numbers(quarter.content)[1]).toBe(1);
    const between = paintTile(1, 0.5, 1440, 900);
    expect(numbers(between.content)[0]).toBeCloseTo(-parts(between.transform).rotate, 6);
    expect(numbers(between.content)[1]).toBe(1);
  });

  it.each(stages)("draws the same picture on either side of a turn's seam on a %i by %i stage", (w, h) => {
    const seam = 3 + TURN;
    for (const index of [seam - 2, seam - 1, seam, seam + 1, seam + 5, seam + 10]) {
      const before = paintTile(index, seam - 1e-9, w, h);
      const after = paintTile(index, seam, w, h);
      const a = parts(before.transform);
      const b = parts(after.transform);
      expect(a.x).toBeCloseTo(b.x, 3);
      expect(a.y).toBeCloseTo(b.y, 3);
      expect(a.scale).toBeCloseTo(b.scale, 6);
      expect(Math.abs(a.rotate - b.rotate) % 360).toBeCloseTo(0, 3);
      expect(before.opacity).toBeCloseTo(after.opacity, 6);
      expect(before.visible).toBe(after.visible);
    }
  });

  it("draws the hundred-and-fiftieth cell exactly as it draws the sixth", () => {
    expect(paintTile(150, 150, 1440, 900)).toEqual(paintTile(6, 6, 1440, 900));
    expect(paintTile(152, 150.25, 390, 800)).toEqual(paintTile(8, 6.25, 390, 800));
  });

  it("fades the cells behind the focus and hides them by the third step", () => {
    expect(paintTile(5, 6, 1440, 900)).toMatchObject({ opacity: 1 });
    expect(paintTile(4, 6, 1440, 900).opacity).toBeCloseTo(0.5, 6);
    expect(paintTile(3, 6, 1440, 900)).toMatchObject({ opacity: 0, visible: false });
  });

  it("does not draw a cell too deep to see", () => {
    // Twelve steps in, a square is the focus divided by the golden ratio
    // twelve times: under three pixels of a large stage, under one of a phone.
    expect(paintTile(18, 6, 1440, 900)).toMatchObject({ opacity: 1, visible: true });
    expect(paintTile(16, 6, 320, 480)).toMatchObject({ opacity: 1, visible: true });
    expect(paintTile(18, 6, 320, 480)).toMatchObject({ opacity: 1, visible: false });
  });

  it("does not draw a cell the run has no square for", () => {
    expect(paintTile(0, 20, 1440, 900)).toEqual({ transform: "none", content: "none", opacity: 0, visible: false });
    expect(paintTile(60, 0, 1440, 900).visible).toBe(false);
  });
});
