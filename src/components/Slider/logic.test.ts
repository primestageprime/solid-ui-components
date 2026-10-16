// @vitest-environment node
// ============================================
// Slider rules as tables. The ONE mounting test per API in Slider.test.tsx
// ("integration: …") proves these reach the DOM; the rules are proven here.
// ============================================
import { describe, expect, it } from "vitest";
import {
  commitTyped,
  resolveTicks,
  snapToDomain,
  ticksFromStep,
} from "./logic";

describe("ticksFromStep — every step from min to max, never past max", () => {
  it.each([
    [0, 15, 0.5, 31],
    [3, 18, 1, 16],
    [0, 100, 25, 5],
  ])("%d..%d by %d marks %d notches", (min, max, step, count) => {
    expect(ticksFromStep(min, max, step)).toHaveLength(count);
  });

  it("stops short rather than marking past max", () => {
    expect(ticksFromStep(0, 15, 4)).toEqual([0, 4, 8, 12]);
  });
});

describe("resolveTicks — what the `ticks` prop asks for", () => {
  it.each([
    ["absent", undefined, []],
    ["false", false, []],
    ["true, by step", true, [3, 4, 5, 6]],
    ["an explicit list, step ignored", [3, 5, 6], [3, 5, 6]],
    [
      "a list with values off the domain, which are dropped",
      [0, 3, 5, 6, 9],
      [3, 5, 6],
    ],
  ] as const)("%s", (_, ticks, expected) => {
    expect(resolveTicks(ticks, 3, 6, 1)).toEqual(expected);
  });
});

describe("snapToDomain — clamped, then onto the grid counted from min", () => {
  it.each([
    [11, 3, 18, 1, 11],
    [400, 3, 18, 1, 18],
    [-9, 3, 18, 1, 3],
    [63, 0, 100, 25, 75],
    [0.3, 0.1, 1, 0.1, 0.3],
    [0.34, 0.1, 1, 0.1, 0.3],
  ])("%d in [%d, %d] by %d → %d", (value, min, max, step, expected) => {
    expect(snapToDomain(value, min, max, step)).toBe(expected);
  });
});

describe("commitTyped — what the editable readout emits", () => {
  const domain = { min: 3, max: 18, current: 6 };
  it.each([
    ["a figure inside the domain", "11", 11],
    ["a figure above the domain is clamped", "400", 18],
    ["a figure below the domain is clamped", "-9", 3],
    ["text that is not a number emits nothing", "soon", null],
    ["an empty field emits nothing", "", null],
    ["the value already held emits nothing", "6", null],
    ["a figure that snaps onto the held value emits nothing", "6.4", null],
  ] as const)("%s", (_, raw, expected) => {
    expect(commitTyped(raw, domain)).toBe(expected);
  });

  it("snaps onto the step before comparing with the held value", () => {
    expect(commitTyped("63", { min: 0, max: 100, step: 25, current: 0 })).toBe(
      75,
    );
    expect(
      commitTyped("63", { min: 0, max: 100, step: 25, current: 75 }),
    ).toBeNull();
  });
});
