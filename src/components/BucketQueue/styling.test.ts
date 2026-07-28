import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// jsdom does not apply imported stylesheets, so a computed-style assertion here
// would pass no matter what the CSS says. Reading the rule is the honest gate.
const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "./BucketQueue.css"), "utf8");

// Extract rule body by selector. Match selector only as a complete rule selector
// (preceded by start-of-file or newline, followed by optional whitespace and { or ,)
// to avoid false matches on compound selectors containing the selector as a substring.
const ruleBody = (selector: string, source: string = css): string => {
  // Escape regex special characters in the selector
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match selector at rule boundary: start-of-file/newline, then selector, then { or ,
  const pattern = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*[{,]`);
  const match = source.match(pattern);
  if (!match) throw new Error(`rule not found: ${selector}`);

  // Find the opening brace, starting from the match position
  const ruleStart = match.index! + match[0].length - 1; // position of { or ,
  const open = source.indexOf("{", ruleStart);
  if (open === -1) throw new Error(`malformed rule: ${selector}`);
  return source.slice(open + 1, source.indexOf("}", open));
};

// Extract declared property names from CSS rule body as an allow-list.
// Splits on semicolons, trims each declaration, and extracts property name
// (the part before the colon).
const declaredProperties = (body: string): string[] =>
  body
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d.length > 0)
    .map((d) => d.slice(0, d.indexOf(":")).trim())
    .sort();

describe("BucketQueue styling contract", () => {
  it("gives a selected row NO background fill — only the accent bar", () => {
    const body = ruleBody(".bucket-queue__row--selected");
    // Allow-list: the selected row must declare ONLY box-shadow, never any
    // background-*, background-color, background-image, etc.
    expect(declaredProperties(body)).toEqual(["box-shadow"]);
    expect(body).toContain("inset 2px 0 0 var(--sui-accent)");
  });

  // The selected row's accent bar is an `inset 2px` box-shadow drawn at the
  // row's left edge. Only the ROW's own padding keeps content clear of it — a
  // consumer's `renderItem` cannot be relied on to pad itself, and when it
  // doesn't, text sits flush against the bar.
  it("pads the row itself, so the selected accent bar never touches content", () => {
    const body = ruleBody(".bucket-queue__row");
    const padding = body.match(/(?:^|;)\s*padding\s*:([^;]+)/);
    expect(padding, "the row must declare its own padding").not.toBeNull();
    // Horizontal padding is the second value of the shorthand and must be a
    // real, non-zero length — wider than the 2px bar it has to clear.
    const inline = padding![1].trim().split(/\s+(?![^(]*\))/)[1] ?? "";
    expect(inline).not.toBe("");
    expect(inline).not.toMatch(/^0(?:[a-z%]*)$/);
    // border-box, or the arrival animation's measured border-box height would
    // land the row `padding` taller than it measured.
    expect(body).toMatch(/box-sizing\s*:\s*border-box/);
  });

  it("gives a CHECKED row no background fill either — the box carries the state", () => {
    // Same reasoning as the selected row, and worse here: checking is a bulk
    // action, so a tint is a whole band of low-contrast rows rather than one.
    expect(() => ruleBody(".bucket-queue__row--checked")).toThrow(/rule not found/);
    // …and the fill lives on the BOX instead, which is what makes the row's
    // bare class legible rather than just unstyled.
    expect(ruleBody(".bucket-queue__checkbox--checked")).toMatch(/background\s*:/);
  });

  // The sizing model measures ONE row and multiplies by the count, so every row
  // must be the same height. `border-top: none` on the first row made it 1px
  // shorter than the rest, and the estimate then under-counted by (rows - 1) px
  // — a bucket that should have fit exactly scrolled a sliver instead.
  it("keeps every row the same height by hiding the first separator, not removing it", () => {
    const body = ruleBody(".bucket-queue__row:first-child");
    expect(body).toMatch(/border-top-color\s*:\s*transparent/);
    // `none` (or a 0 width) would take the border out of layout again.
    expect(body).not.toMatch(/border-top\s*:\s*(none|0)/);
    expect(body).not.toMatch(/border-top-width/);
    // …and the base rule must still be what supplies that 1px.
    expect(ruleBody(".bucket-queue__row")).toMatch(/border-top:\s*1px/);
  });

  it("keeps the hover fill so hover still owns the background", () => {
    expect(ruleBody(".bucket-queue__row--interactive:hover")).toMatch(/background\s*:/);
  });

  it("hardcodes no colors — every color is a --sui-* token", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("detects regressions: allow-list catches background-color reintroduction", () => {
    // Inline CSS that would fail the allow-list gate
    const fakeCSS = `.bucket-queue__row--selected { box-shadow: inset 2px 0 0 var(--sui-accent); background-color: red; }`;
    const body = ruleBody(".bucket-queue__row--selected", fakeCSS);
    // The bug: reintroducing background-color. The allow-list must catch this.
    expect(declaredProperties(body)).not.toEqual(["box-shadow"]);
  });
});
