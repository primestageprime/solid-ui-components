import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// jsdom does not lay out CSS, so the stacked gutter is checked where it is
// written: the ≤900px block of ThreePanelLayout.css. The numbers print as a
// table of the gap each pair of stacked panels is left with.
const css = readFileSync(join(__dirname, "ThreePanelLayout.css"), "utf8");

/** The text of the first block opened by `head`, braces balanced. */
const block = (source: string, head: string): string => {
  const open = source.indexOf(head);
  if (open < 0) throw new Error(`no block ${head}`);
  let depth = 0;
  for (let i = source.indexOf("{", open); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(source.indexOf("{", open) + 1, i);
  }
  throw new Error(`unbalanced block ${head}`);
};

/** A length's px: a bare `16px`, or the fallback of a `var(--token, 16px)` (the themes' dense tokens). */
const px = (value: string): number => {
  const fallback = /^var\(\s*--[\w-]+\s*,\s*([^)]+)\)$/.exec(value);
  return parseFloat(fallback ? fallback[1] : value);
};

/** [top, right, bottom, left] px from a `padding:` shorthand of 1 to 4 values. */
const sides = (shorthand: string): [number, number, number, number] => {
  const v = shorthand.trim().match(/var\([^)]*\)|\S+/g)!.map(px);
  const [t, r = t, b = t, l = r] = v;
  return [t, r, b, l];
};

/** The padding the LAST rule with a `padding:` for `selector` sets (a comma list's last member counts too). */
const padding = (source: string, selector: string): [number, number, number, number] => {
  const rules = [...source.matchAll(new RegExp(`(?:^|\\n)\\s*${selector.replace(/\./g, "\\.")}\\s*\\{([^}]*)\\}`, "g"))];
  const withPadding = rules
    .map((r) => /(?:^|[\s;])padding:\s*([^;]+);/.exec(r[1]))
    .filter((m): m is RegExpExecArray => m !== null);
  const last = withPadding[withPadding.length - 1];
  if (!last) throw new Error(`no padding for ${selector}`);
  return sides(last[1]);
};

describe("ThreePanelLayout stacked gutter (≤900px)", () => {
  const stacked = block(css, "@media (max-width: 900px)");
  const left = padding(stacked, ".sui-three-panel__left");
  const right = padding(stacked, ".sui-three-panel__right");
  const center = padding(css, ".sui-three-panel__center");

  it("leaves one 16px gutter on each side of the centre", () => {
    const leftToCentre = left[2] + center[0];
    const centreToRight = center[2] + right[0];
    expect([
      ["left to centre", leftToCentre],
      ["centre to right", centreToRight],
    ]).toEqual([
      ["left to centre", 16],
      ["centre to right", 16],
    ]);
  });

  it("gives the stacked asides the centre's 16px sides", () => {
    expect([left[1], left[3], right[1], right[3]]).toEqual([center[1], center[3], center[1], center[3]]);
    expect(center[1]).toBe(16);
  });

  it("keeps a flush right panel flush when stacked", () => {
    expect(padding(stacked, ".sui-three-panel__right--flush")).toEqual([0, 0, 0, 0]);
    // and the flush rule comes after the stacked right rule, so it wins at equal specificity
    expect(stacked.lastIndexOf(".sui-three-panel__right--flush")).toBeGreaterThan(
      stacked.lastIndexOf(".sui-three-panel__right {"),
    );
  });

  it("leaves the side-by-side padding alone", () => {
    expect(padding(css.slice(0, css.indexOf("@media")), ".sui-three-panel__left")).toEqual([8, 8, 8, 8]);
    expect(center).toEqual([16, 16, 16, 16]);
  });
});
