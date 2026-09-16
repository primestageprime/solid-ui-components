// ============================================
// MutationSliders geometry — the headless observation.
//
// Every number the dial's SVG paints is decided in geometry.ts, so a whole row
// of mutations reads as a TABLE without a browser. These tests print that
// table as well as asserting on it: an old-vs-new bar is one of those shapes
// where an inverted axis looks perfectly plausible until you see two rows
// disagree about which way "up" is.
// ============================================
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { map } from "../../fn";
import {
  ARROW_HEIGHT,
  type Direction,
  type Domain,
  type Entity,
  TRACK_BOTTOM,
  TRACK_TOP,
  TRACK_X,
  VIEW_HEIGHT,
  arrowPath,
  boxFor,
  dialGeometry,
  directionOf,
  mutationGeometry,
  yFor,
} from "./geometry";

const DOMAIN: Domain = [0, 10];

/** The sketch, as data: three raised a little, two lowered a lot, Joe removed. */
const FIXTURE: readonly Entity[] = [
  { id: "peter", label: "Peter", old: 6, value: 7 },
  { id: "adlai", label: "Adlai", old: 5, value: 6 },
  { id: "elaina", label: "Elaina", old: 7, value: 8 },
  { id: "reilly", label: "Reilly", old: 7, value: 2 },
  { id: "flynn", label: "Flynn", old: 8, value: 1 },
  { id: "joe", label: "Joe", old: 5, value: null },
];

/** Every `x y` pair in a path, so a test reads points rather than substrings. */
const pointsOf = (d: string): readonly [number, number][] =>
  map(
    (pair) => [Number(pair[1]), Number(pair[2])] as [number, number],
    [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)],
  );

describe("yFor", () => {
  it("puts the domain MAX at the top of the track and the MIN at the bottom", () => {
    // The screen's y grows downward while the domain grows upward, so the
    // inversion lives here and nowhere else.
    expect(yFor(DOMAIN, 10)).toBe(TRACK_TOP);
    expect(yFor(DOMAIN, 0)).toBe(TRACK_BOTTOM);
  });

  it("is linear between the ends", () => {
    expect(yFor(DOMAIN, 5)).toBe((TRACK_TOP + TRACK_BOTTOM) / 2);
    expect(yFor([0, 4], 3)).toBe(TRACK_TOP + (TRACK_BOTTOM - TRACK_TOP) * 0.25);
  });

  it("clamps outside the domain rather than drawing off the track", () => {
    expect(yFor(DOMAIN, 999)).toBe(TRACK_TOP);
    expect(yFor(DOMAIN, -999)).toBe(TRACK_BOTTOM);
  });

  it("reads a zero-width domain as the middle instead of NaN", () => {
    expect(yFor([5, 5], 5)).toBe((TRACK_TOP + TRACK_BOTTOM) / 2);
    expect(yFor([5, 5], 9)).toBe((TRACK_TOP + TRACK_BOTTOM) / 2);
  });

  it("does not assume the domain starts at zero", () => {
    expect(yFor([100, 200], 200)).toBe(TRACK_TOP);
    expect(yFor([100, 200], 150)).toBe((TRACK_TOP + TRACK_BOTTOM) / 2);
  });
});

describe("directionOf", () => {
  it("names which way the level moved", () => {
    expect(directionOf(3, 7)).toBe("up");
    expect(directionOf(7, 3)).toBe("down");
    expect(directionOf(4, 4)).toBe("none");
  });

  it("reads a removed entity as no direction, not as a fall to zero", () => {
    // A removed entity has no NEW level at all. Calling that a drop would
    // draw an arrow for a change that never happened.
    expect(directionOf(9, null)).toBe("none");
  });
});

describe("boxFor", () => {
  it("spans old→new whichever way round they are", () => {
    const raised = boxFor(DOMAIN, 4, 6);
    const lowered = boxFor(DOMAIN, 6, 4);
    expect(raised).toEqual(lowered);
    expect(raised?.y).toBe(yFor(DOMAIN, 6));
    expect(raised?.height).toBe(yFor(DOMAIN, 4) - yFor(DOMAIN, 6));
  });

  it("is null when nothing changed, so no zero-height bar is drawn", () => {
    expect(boxFor(DOMAIN, 5, 5)).toBeNull();
  });

  it("is null for a removed entity", () => {
    expect(boxFor(DOMAIN, 5, null)).toBeNull();
  });

  it("grows with the size of the change", () => {
    const small = boxFor(DOMAIN, 5, 6);
    const large = boxFor(DOMAIN, 8, 2);
    expect(large?.height).toBeGreaterThan(small?.height ?? 0);
  });
});

describe("arrowPath", () => {
  it("points up for a raise and down for a drop, from the same value", () => {
    const up = arrowPath(DOMAIN, 5, "up");
    const down = arrowPath(DOMAIN, 5, "down");
    expect(up).not.toBeNull();
    expect(down).not.toBeNull();
    expect(up).not.toBe(down);
  });

  it("puts the apex ahead of the thumb, in the direction of travel", () => {
    const mid = yFor(DOMAIN, 5);
    // The apex is the path's first point — `M x y`.
    expect(pointsOf(arrowPath(DOMAIN, 5, "up") as string)[0][1]).toBeLessThan(
      mid,
    );
    expect(
      pointsOf(arrowPath(DOMAIN, 5, "down") as string)[0][1],
    ).toBeGreaterThan(mid);
  });

  it("draws nothing when the level did not move", () => {
    expect(arrowPath(DOMAIN, 5, "none")).toBeNull();
  });

  it("stays inside the canvas at either end of the domain", () => {
    const atTop = pointsOf(arrowPath(DOMAIN, 10, "up") as string);
    const atBottom = pointsOf(arrowPath(DOMAIN, 0, "down") as string);
    for (const [, y] of atTop) expect(y).toBeGreaterThanOrEqual(0);
    for (const [, y] of atBottom) expect(y).toBeLessThanOrEqual(VIEW_HEIGHT);
  });
});

describe("dialGeometry", () => {
  it("keeps the OLD tick for a removed entity and drops the thumb", () => {
    const joe = dialGeometry(DOMAIN, FIXTURE[5]);
    expect(joe.removed).toBe(true);
    expect(joe.oldY).toBe(yFor(DOMAIN, 5));
    expect(joe.valueY).toBeNull();
    expect(joe.box).toBeNull();
    expect(joe.arrow).toBeNull();
  });

  it("carries a box and an arrow for a changed entity", () => {
    const peter = dialGeometry(DOMAIN, FIXTURE[0]);
    expect(peter.removed).toBe(false);
    expect(peter.direction).toBe("up");
    expect(peter.box).not.toBeNull();
    expect(peter.arrow).not.toBeNull();
  });

  it("carries neither for an unchanged entity", () => {
    const still = dialGeometry(DOMAIN, {
      id: "still",
      label: "Still",
      old: 4,
      value: 4,
    });
    expect(still.direction).toBe("none");
    expect(still.box).toBeNull();
    expect(still.arrow).toBeNull();
  });
});

describe("mutationGeometry — the sketch as a table", () => {
  const rows = mutationGeometry(DOMAIN, FIXTURE);

  it("prints the whole row so it can be read without a browser", () => {
    console.table(
      map(
        (row) => ({
          id: row.id,
          old: row.old,
          new: row.value ?? "—",
          direction: row.direction,
          oldY: row.oldY,
          valueY: row.valueY ?? "—",
          boxY: row.box?.y ?? "—",
          boxH: row.box?.height ?? "—",
          removed: row.removed,
        }),
        rows,
      ),
    );
    expect(rows).toHaveLength(6);
  });

  it("reads three raises, two drops and one removal", () => {
    const dirs = map((row) => row.direction, rows);
    expect(dirs).toEqual(["up", "up", "up", "down", "down", "none"]);
    expect(map((row) => row.removed, rows)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  it("draws the two drops as visibly bigger boxes than the three raises", () => {
    // The sketch's whole point: the SIZE of the change reads at a glance.
    const heightOf = (i: number) => rows[i].box?.height ?? 0;
    expect(Math.min(heightOf(3), heightOf(4))).toBeGreaterThan(
      Math.max(heightOf(0), heightOf(1), heightOf(2)),
    );
  });

  it("puts every raised box in the top half and every dropped box lower", () => {
    const middle = (i: number) =>
      (rows[i].box?.y ?? 0) + (rows[i].box?.height ?? 0) / 2;
    const centre = (TRACK_TOP + TRACK_BOTTOM) / 2;
    for (const i of [0, 1, 2]) expect(middle(i)).toBeLessThan(centre);
    for (const i of [3, 4]) expect(middle(i)).toBeGreaterThan(centre);
  });

  it("keeps the row in the order it was given", () => {
    expect(map((row) => row.id, rows)).toEqual(map((e) => e.id, FIXTURE));
  });
});

describe("the CSS mirrors the canvas", () => {
  // The dial's SVG overlay covers the Kobalte root exactly, and the Kobalte
  // TRACK is inset inside it by TRACK_TOP — that inset is what makes a thumb
  // at `bottom: 0%` land on the same y this file calls TRACK_BOTTOM. The two
  // numbers live in two languages, so this test pins them together rather
  // than leaving a comment nobody re-reads.
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(join(here, "MutationSliders.css"), "utf8");

  it("declares the dial height this file draws into", () => {
    expect(css).toContain(`--sui-mutation-dial-height: ${VIEW_HEIGHT}px`);
  });

  it("declares the track inset this file maps the domain onto", () => {
    expect(css).toContain(`--sui-mutation-track-inset: ${TRACK_TOP}px`);
    expect(VIEW_HEIGHT - TRACK_BOTTOM).toBe(TRACK_TOP);
  });

  it("declares the dial width its centre line sits in the middle of", () => {
    expect(css).toContain(`--sui-mutation-dial-width: ${TRACK_X * 2}px`);
  });

  it("leaves room above the top of the track for a raised arrowhead", () => {
    expect(TRACK_TOP).toBeGreaterThanOrEqual(ARROW_HEIGHT);
  });
});
