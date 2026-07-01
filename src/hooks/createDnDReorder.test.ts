import { describe, it, expect } from "vitest";
import {
  previewOrder,
  hitTestInsertPos,
  isAfterMidpoint,
  pointerToInsertIndex,
  type AxisRect,
} from "./createDnDReorder";

interface Item {
  id: string;
}
const items = (...ids: string[]): Item[] => ids.map((id) => ({ id }));
const getId = (it: Item) => it.id;
const ids = (list: Item[]) => list.map(getId);

describe("previewOrder", () => {
  it("returns the list unchanged when there is no active drag", () => {
    const base = items("a", "b", "c");
    expect(previewOrder(base, getId, null, null)).toBe(base);
    expect(previewOrder(base, getId, "a", null)).toBe(base);
    expect(previewOrder(base, getId, null, 1)).toBe(base);
  });

  it("splices the dragged item out and re-inserts it at insertPos (removed space)", () => {
    const base = items("a", "b", "c", "d");
    // drag "a" (removed → [b,c,d]); insert at 2 → [b,c,a,d]
    expect(ids(previewOrder(base, getId, "a", 2))).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    // drag "d" (removed → [a,b,c]); insert at 0 → [d,a,b,c]
    expect(ids(previewOrder(base, getId, "d", 0))).toEqual([
      "d",
      "a",
      "b",
      "c",
    ]);
    // drag "b" (removed → [a,c,d]); insert at end (3) → [a,c,d,b]
    expect(ids(previewOrder(base, getId, "b", 3))).toEqual([
      "a",
      "c",
      "d",
      "b",
    ]);
  });

  it("clamps insertPos into the dragged-removed range", () => {
    const base = items("a", "b", "c");
    expect(ids(previewOrder(base, getId, "a", -5))).toEqual(["a", "b", "c"]);
    expect(ids(previewOrder(base, getId, "a", 99))).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the input array", () => {
    const base = items("a", "b", "c");
    const snapshot = ids(base);
    previewOrder(base, getId, "a", 2);
    expect(ids(base)).toEqual(snapshot);
  });

  it("returns the list unchanged when dragId is not present", () => {
    const base = items("a", "b", "c");
    expect(previewOrder(base, getId, "zzz", 1)).toBe(base);
  });
});

describe("hitTestInsertPos", () => {
  const base = items("a", "b", "c", "d"); // removed("a") → [b,c,d]

  it("maps before/after a hovered item into the dragged-removed index space", () => {
    // hover "c" (index 1 in removed space). before → 1, after → 2.
    expect(hitTestInsertPos(base, getId, "a", "c", false)).toBe(1);
    expect(hitTestInsertPos(base, getId, "a", "c", true)).toBe(2);
  });

  it("returns null when hovering the dragged item's own placeholder", () => {
    expect(hitTestInsertPos(base, getId, "a", "a", false)).toBeNull();
    expect(hitTestInsertPos(base, getId, "a", "a", true)).toBeNull();
  });

  it("returns null for an unknown hovered id", () => {
    expect(hitTestInsertPos(base, getId, "a", "zzz", true)).toBeNull();
  });
});

// Full-drag composition: a real hover is hitTestInsertPos → previewOrder. These
// assert the FINAL committed order matches the user's cursor intent, and pin the
// dragged-removed coordinate space. A regression to a displayItems-index hit-test
// (k taken from the dragged-INCLUDED list) would push every "after" past a
// left-of-cursor dragged item by one — e.g. "drag a, after c" would wrongly
// commit [b,c,d,a] instead of [b,c,a,d] — so these guard that exact off-by-one.
describe("full drag (hitTestInsertPos → previewOrder) commits cursor intent", () => {
  const base = items("a", "b", "c", "d");
  const drop = (dragId: string, overId: string, after: boolean): string[] => {
    const pos = hitTestInsertPos(base, getId, dragId, overId, after);
    return ids(previewOrder(base, getId, dragId, pos));
  };

  it("drag a LEFT item rightward, after c → a lands after c [b,c,a,d]", () => {
    expect(drop("a", "c", true)).toEqual(["b", "c", "a", "d"]);
  });

  it("drag a LEFT item rightward, before c → a lands before c [b,a,c,d]", () => {
    expect(drop("a", "c", false)).toEqual(["b", "a", "c", "d"]);
  });

  it("drag a RIGHT item leftward, before b → d lands before b [a,d,b,c]", () => {
    expect(drop("d", "b", false)).toEqual(["a", "d", "b", "c"]);
  });

  it("drag a RIGHT item leftward, after b → d lands after b [a,b,d,c]", () => {
    expect(drop("d", "b", true)).toEqual(["a", "b", "d", "c"]);
  });

  it("drag a to the far end, after d → [b,c,d,a]", () => {
    expect(drop("a", "d", true)).toEqual(["b", "c", "d", "a"]);
  });

  it("no-op: drop back in place (drag a, before b) → [a,b,c,d]", () => {
    expect(drop("a", "b", false)).toEqual(["a", "b", "c", "d"]);
  });

  it("no-op: drop back in place (drag b, after a) → [a,b,c,d]", () => {
    expect(drop("b", "a", true)).toEqual(["a", "b", "c", "d"]);
  });
});

// pointerToInsertIndex is the CONTAINER-level, geometry-based hit-test that
// fixes the dead-zone bug: it computes the insert index from the cursor coord
// against the midpoints of the NON-DRAGGED items, so it returns a sensible
// index for ANY cursor position in the row — including gaps and the trailing
// empty space past the last item (where no per-pill handler ever fires).
describe("pointerToInsertIndex", () => {
  // Three non-dragged items along X with GAPS between them and trailing space:
  //   r0: 0..40  (mid 20)   r1: 100..140 (mid 120)   r2: 200..240 (mid 220)
  const rx: AxisRect[] = [
    { left: 0, right: 40, top: 0, bottom: 24 },
    { left: 100, right: 140, top: 0, bottom: 24 },
    { left: 200, right: 240, top: 0, bottom: 24 },
  ];

  it("axis x: before the first midpoint → 0", () => {
    expect(pointerToInsertIndex(rx, -50, "x")).toBe(0);
    expect(pointerToInsertIndex(rx, 0, "x")).toBe(0);
    expect(pointerToInsertIndex(rx, 19, "x")).toBe(0);
  });

  it("axis x: in each between-items gap → the count of midpoints before it", () => {
    expect(pointerToInsertIndex(rx, 60, "x")).toBe(1); // gap between r0 and r1
    expect(pointerToInsertIndex(rx, 170, "x")).toBe(2); // gap between r1 and r2
  });

  it("axis x: PAST the last item (trailing dead zone) → length (end)", () => {
    expect(pointerToInsertIndex(rx, 300, "x")).toBe(3);
    expect(pointerToInsertIndex(rx, 240, "x")).toBe(3);
  });

  it("axis x: clamps to [0, length]", () => {
    expect(pointerToInsertIndex(rx, -9999, "x")).toBe(0);
    expect(pointerToInsertIndex(rx, 9999, "x")).toBe(3);
    expect(pointerToInsertIndex([], 123, "x")).toBe(0);
  });

  it("axis y: counts midpoints above the cursor (before/after = top/bottom)", () => {
    const ry: AxisRect[] = [
      { left: 0, right: 40, top: 0, bottom: 20 }, // mid 10
      { left: 0, right: 40, top: 40, bottom: 60 }, // mid 50
      { left: 0, right: 40, top: 80, bottom: 100 }, // mid 90
    ];
    expect(pointerToInsertIndex(ry, 5, "y")).toBe(0); // above first
    expect(pointerToInsertIndex(ry, 30, "y")).toBe(1); // gap between 0 and 1
    expect(pointerToInsertIndex(ry, 70, "y")).toBe(2); // gap between 1 and 2
    expect(pointerToInsertIndex(ry, 200, "y")).toBe(3); // past last
  });

  it("works on rects that EXCLUDE the dragged item (caller filters them out)", () => {
    // Simulate dragging the middle of 3 items: rects only carry the 2 others.
    const nonDragged: AxisRect[] = [
      { left: 0, right: 40, top: 0, bottom: 24 }, // mid 20
      { left: 200, right: 240, top: 0, bottom: 24 }, // mid 220
    ];
    expect(pointerToInsertIndex(nonDragged, 10, "x")).toBe(0);
    expect(pointerToInsertIndex(nonDragged, 100, "x")).toBe(1); // between the two
    expect(pointerToInsertIndex(nonDragged, 300, "x")).toBe(2); // past last → end
  });
});

describe("isAfterMidpoint", () => {
  const rect = { left: 100, top: 50, width: 40, height: 20 };

  it("axis x compares clientX against the horizontal midpoint", () => {
    expect(isAfterMidpoint("x", rect, 105, 0)).toBe(false); // left half
    expect(isAfterMidpoint("x", rect, 135, 0)).toBe(true); // right half
  });

  it("axis y compares clientY against the vertical midpoint", () => {
    expect(isAfterMidpoint("y", rect, 0, 55)).toBe(false); // top half
    expect(isAfterMidpoint("y", rect, 0, 65)).toBe(true); // bottom half
  });
});
