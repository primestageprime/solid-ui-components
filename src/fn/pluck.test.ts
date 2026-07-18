import { describe, it, expect } from "vitest";
import { pluck } from "./pluck";

describe("pluck", () => {
  it("collects one property across the array", () => {
    const rows = [{ id: "a", n: 1 }, { id: "b", n: 2 }];
    const ids: string[] = pluck("id")(rows);
    expect(ids).toEqual(["a", "b"]);
  });

  it("returns [] on empty input", () => {
    const rows: { id: string }[] = [];
    expect(pluck("id")(rows)).toEqual([]);
  });
});
