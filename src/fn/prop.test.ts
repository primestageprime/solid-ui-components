import { describe, it, expect } from "vitest";
import { prop } from "./prop";

describe("prop", () => {
  it("reads the property (curried), typed as its value", () => {
    const getId = prop("id");
    const value: number = getId({ id: 7, name: "x" });
    expect(value).toBe(7);
  });

  it("works as a projection source via map", () => {
    const rows = [{ w: 3 }, { w: 1 }];
    expect(rows.map(prop("w"))).toEqual([3, 1]);
  });
});

describe("prop — direct form", () => {
  it("reads the property immediately, typed as T[K]", () => {
    const value: number = prop("id", { id: 7, name: "x" });
    expect(value).toBe(7);
  });

  it("direct === curried-then-applied", () => {
    const obj = { id: "a", n: 1 };
    expect(prop("id", obj)).toBe(prop("id")(obj));
  });

  it("rejects a key that is not on the object at compile time", () => {
    const reversed = () =>
      // @ts-expect-error "missing" is not a key of the object.
      prop("missing", { id: 7 });
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
