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
