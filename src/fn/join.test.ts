import { describe, it, expect } from "vitest";
import { join } from "./join";

describe("join", () => {
  it("joins with the separator", () => {
    expect(join(", ")(["a", "b", "c"])).toBe("a, b, c");
  });

  it("is empty string for empty input", () => {
    expect(join(", ")([])).toBe("");
  });

  it("stringifies like Array.prototype.join (null/undefined -> '')", () => {
    expect(join("-")([1, null, 2, undefined])).toBe("1--2-");
  });
});
