import { describe, it, expect } from "vitest";
import { lengthOf } from "./lengthOf";

describe("lengthOf", () => {
  it("returns the length of the keyed property (curried)", () => {
    const hits = { dotChains: [1, 2, 3, 4], other: [] as number[] };
    expect(lengthOf("dotChains")(hits)).toBe(4);
  });

  it("works on a string-valued property", () => {
    expect(lengthOf("name")({ name: "abcd" })).toBe(4);
  });
});

describe("lengthOf — direct form", () => {
  it("applies immediately: lengthOf(key, obj)", () => {
    const hits = { dotChains: [1, 2, 3] };
    expect(lengthOf("dotChains", hits)).toBe(3);
  });

  it("direct === curried-then-applied", () => {
    const obj = { xs: [1, 2] };
    expect(lengthOf("xs", obj)).toBe(lengthOf("xs")(obj));
  });

  it("equals length(prop(key, obj)) — the composition it is defined as", () => {
    const obj = { xs: [9, 8, 7] };
    expect(lengthOf("xs", obj)).toBe(obj.xs.length);
  });

  it("rejects a property whose value has no length at compile time", () => {
    const reversed = () =>
      // @ts-expect-error `count` is a number; it has no `length`.
      lengthOf("count", { count: 5 });
    expect(typeof reversed).toBe("function"); // never invoked; type-only check
  });
});
