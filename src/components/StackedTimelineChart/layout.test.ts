/**
 * StackedTimelineChart's size-responsive chrome, printed as a table:
 * box width × height → y ticks, x ticks, x-label step and the inset (G17).
 */
import { describe, expect, it } from "vitest";
import { join, map } from "../../fn";
import { stackedTimelineLayout, thinTicks } from "./layout";

const row = ([width, height]: readonly [number, number]): string => {
  const l = stackedTimelineLayout({ width, height }, [0, 80]);
  const m = l.margin;
  return join("  ", [
    `${width}×${height}`.padEnd(13),
    (l.yTickValues ? l.yTickValues.join(",") : "scale").padEnd(8),
    String(l.xTickCount).padEnd(6),
    String(l.xLabelStep).padEnd(5),
    `${m.top}/${m.right}/${m.bottom}/${m.left}`,
  ]);
};

describe("stackedTimelineLayout", () => {
  it("prints the size table", () => {
    const boxes = [
      [1440, 320],
      [1440, 220],
      [1440, 200],
      [1440, 199],
      [1440, 120],
      [800, 220],
      [400, 220],
      [399, 220],
      [390, 320],
      [390, 150],
    ] as const;
    const table = join("\n", [
      "box (y 0..80)  yTicks    xTick  step   margin t/r/b/l",
      ...map(row, boxes),
    ]);
    expect(table).toMatchInlineSnapshot(`
      "box (y 0..80)  yTicks    xTick  step   margin t/r/b/l
      1440×320       scale     5       1      8/8/28/36
      1440×220       scale     5       1      8/8/28/36
      1440×200       scale     5       1      8/8/28/36
      1440×199       0,40,80   5       1      4/4/20/32
      1440×120       0,40,80   5       1      4/4/20/32
      800×220        scale     5       1      8/8/28/36
      400×220        scale     5       1      8/8/28/36
      399×220        scale     3       2      8/8/28/36
      390×320        scale     3       2      8/8/28/36
      390×150        0,40,80   3       2      4/4/20/32"
    `);
  });

  it("a caller's curried margin wins over the compact inset, field by field", () => {
    const l = stackedTimelineLayout(
      { width: 390, height: 150 },
      [0, 80],
      { left: 48 },
    );
    expect(l.margin).toEqual({ top: 4, right: 4, bottom: 20, left: 48 });
  });

  it("thins tick values to every Nth, keeping the first", () => {
    expect(thinTicks([1, 2, 3, 4, 5], 2)).toEqual([1, 3, 5]);
    expect(thinTicks([1, 2, 3], 1)).toEqual([1, 2, 3]);
    expect(thinTicks([], 2)).toEqual([]);
  });
});
