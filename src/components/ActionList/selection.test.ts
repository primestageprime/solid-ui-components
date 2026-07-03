import { describe, expect, it } from "vitest";
import { idRange } from "./selection";

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
