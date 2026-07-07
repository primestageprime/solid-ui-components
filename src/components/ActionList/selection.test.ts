import { describe, expect, it } from "vitest";
import { idRange, foldRange } from "./selection";

const list = ["a", "b", "c", "d", "e"];

describe("idRange", () => {
  it("selects the inclusive range anchor→target going down", () => {
    expect(idRange(list, "b", "e")).toEqual(["b", "c", "d", "e"]);
  });

  it("selects the inclusive range when target is above the anchor", () => {
    expect(idRange(list, "d", "a")).toEqual(["a", "b", "c", "d"]);
  });

  it("returns just the one item when anchor and target coincide", () => {
    expect(idRange(list, "c", "c")).toEqual(["c"]);
  });

  it("returns null with no anchor", () => {
    expect(idRange(list, null, "c")).toBeNull();
  });

  it("returns null when the anchor is no longer in the list", () => {
    expect(idRange(list, "gone", "c")).toBeNull();
  });

  it("returns null when the target is not in the list", () => {
    expect(idRange(list, "a", "gone")).toBeNull();
  });
});

describe("foldRange", () => {
  // A span the caller has already computed via idRange (anchor "b" → target "d").
  const span = ["b", "c", "d"];

  describe("extend mode", () => {
    it("merges the span into the selection in list order when the anchor is selected", () => {
      expect(foldRange(list, ["b"], span, "b", "extend")).toEqual(["b", "c", "d"]);
    });

    it("keeps ids outside the span untouched (merge)", () => {
      // "a" is outside the span and stays; result is in list order.
      expect(foldRange(list, ["a", "b"], span, "b", "extend")).toEqual(["a", "b", "c", "d"]);
    });

    it("subtracts the span when the anchor is not selected", () => {
      // Anchor "b" is absent from the current selection → drop the whole span.
      expect(foldRange(list, ["c", "e"], span, "b", "extend")).toEqual(["e"]);
    });

    it("treats a null anchor as unselected and subtracts the span", () => {
      expect(foldRange(list, ["c"], span, null, "extend")).toEqual([]);
    });
  });

  describe("replace mode", () => {
    it("returns exactly the span, discarding selection outside it", () => {
      expect(foldRange(list, ["a", "e"], span, "b", "replace")).toEqual(["b", "c", "d"]);
    });

    it("returns the span regardless of whether the anchor is selected", () => {
      expect(foldRange(list, [], span, "b", "replace")).toEqual(["b", "c", "d"]);
    });

    it("does not mutate the passed range", () => {
      const range = [...span];
      const out = foldRange(list, ["a"], range, "b", "replace");
      out.push("z");
      expect(range).toEqual(["b", "c", "d"]);
    });
  });
});
