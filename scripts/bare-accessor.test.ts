// @vitest-environment node
//
// Pins the `bareAccessorColumns` rule (scripts/bare-accessor.mjs): a string
// accessor is the violation; a function accessor — the renderer form every
// column helper produces — never is. Pure over text, no subprocess.
import { describe, it, expect } from "vitest";
import { findBareAccessors } from "./bare-accessor.mjs";

describe("findBareAccessors", () => {
  it("flags string accessors, quoted either way, with or without `as const`", () => {
    const src = [
      `const a = { id: "hour", header: "Hour", accessor: "hour" };`,
      `const b = { id: "imo", accessor: 'imo' as const, width: "6rem" };`,
      `const c = { id: "n", accessor:"name" };`,
    ].join("\n");
    expect(findBareAccessors(src)).toEqual([1, 2, 3]);
  });
  it("passes function accessors and column helpers", () => {
    const src = [
      `const a = { id: "qty", accessor: (p) => <IntCell value={p.qty} /> };`,
      `const b = dateTimeCol("hour", "Hour", { data: rows, precision: "minute" });`,
      `const c = { id: "x", accessor: (r) => r.name };`,
      `const d = { id: "k", accessor: key };`,
    ].join("\n");
    expect(findBareAccessors(src)).toEqual([]);
  });
  it("reports the line of each hit", () => {
    const src = `\n\n{ accessor: "a" }\n{ accessor: "b" }`;
    expect(findBareAccessors(src)).toEqual([3, 4]);
  });
});
