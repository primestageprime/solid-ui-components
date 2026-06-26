import { describe, it, expect } from "vitest";
import {
  previewOrder,
  hitTestInsertPos,
  isAfterMidpoint,
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
    expect(ids(previewOrder(base, getId, "a", 2))).toEqual(["b", "c", "a", "d"]);
    // drag "d" (removed → [a,b,c]); insert at 0 → [d,a,b,c]
    expect(ids(previewOrder(base, getId, "d", 0))).toEqual(["d", "a", "b", "c"]);
    // drag "b" (removed → [a,c,d]); insert at end (3) → [a,c,d,b]
    expect(ids(previewOrder(base, getId, "b", 3))).toEqual(["a", "c", "d", "b"]);
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
