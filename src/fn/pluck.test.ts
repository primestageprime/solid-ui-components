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

describe("pluck — direct form", () => {
  it("applies immediately and recovers the value type", () => {
    const rows = [
      { id: "a", n: 1 },
      { id: "b", n: 2 },
    ];
    const ids: string[] = pluck("id", rows);
    expect(ids).toEqual(["a", "b"]);
  });

  it("direct === curried-then-applied", () => {
    const rows = [{ id: "a" }, { id: "b" }];
    expect(pluck("id", rows)).toEqual(pluck("id")(rows));
  });

  it("rejects reversed argument order at compile time", () => {
    const rows = [{ id: "a" }];
    const reversed = () =>
      // @ts-expect-error key must come first, array second.
      pluck(rows, "id");
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
