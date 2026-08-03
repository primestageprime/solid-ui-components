// Guards the bundle-budget decision layer. These never build anything — see
// the header of bundle-budget-rules.mjs for why that separation is deliberate.
import { describe, it, expect } from "vitest";
import {
  toKb,
  classifyContamination,
  rendersMarkup,
  HEAVY_DEPS,
} from "./bundle-budget-rules.mjs";

describe("toKb", () => {
  it("rounds up, so a bundle can never sit just under its ceiling", () => {
    expect(toKb(1)).toBe(1);
    expect(toKb(1024)).toBe(1);
    expect(toKb(1025)).toBe(2);
  });

  // The whole reason sizes are ratcheted in KB rather than bytes: dependency
  // patches move bundles by tens of bytes and must not fail CI, in either
  // direction (the ratchet also fails on unlocked improvements).
  it("absorbs sub-KB dependency noise", () => {
    expect(toKb(15403)).toBe(toKb(15403 + 40));
    expect(toKb(15403)).toBe(toKb(15403 - 40));
  });

  // ...while still resolving every leak it exists to catch. The smallest real
  // one is d3-dag at ~100 KB.
  it("still separates a leak from the noise", () => {
    expect(toKb(15403 + 100_000)).toBeGreaterThan(toKb(15403));
  });
});

describe("classifyContamination", () => {
  it("passes a bundle that carries only what it should", () => {
    expect(classifyContamination(["katex"], ["katex"])).toEqual({
      leaked: [],
      starved: [],
    });
  });

  it("flags a heavy dep in a bundle that should be clean", () => {
    expect(classifyContamination(["katex"], []).leaked).toEqual(["katex"]);
  });

  // The two-sided half. A bundle that shook away a dep it genuinely needs gets
  // SMALLER, so a size-only check would read that correctness bug as a win.
  it("flags a dep that went missing from a bundle that needs it", () => {
    expect(classifyContamination([], ["katex"]).starved).toEqual(["katex"]);
  });

  it("reports leaks and starvation independently", () => {
    expect(classifyContamination(["d3-dag"], ["katex"])).toEqual({
      leaked: ["d3-dag"],
      starved: ["katex"],
    });
  });
});

describe("HEAVY_DEPS", () => {
  it("covers both ADR 0005 libraries plus the server-only kobalte case", () => {
    expect(HEAVY_DEPS).toContain("katex");
    expect(HEAVY_DEPS).toContain("d3-dag");
    // Only the SERVER build can leak kobalte — it inlines it via ssr.noExternal,
    // so kobalte lands inside the bundle. The client keeps it external.
    expect(HEAVY_DEPS).toContain("kobalte");
  });
});

describe("rendersMarkup", () => {
  it("accepts real SSR output", () => {
    expect(rendersMarkup('<button class="sui-btn">hi</button>')).toBe(true);
  });

  // The case that motivated it: the per-module SSR fix took one bundle to 953 B,
  // which is indistinguishable by size from a bundle that renders nothing.
  it("rejects empty or non-markup output", () => {
    expect(rendersMarkup("")).toBe(false);
    expect(rendersMarkup("undefined")).toBe(false);
  });
});
