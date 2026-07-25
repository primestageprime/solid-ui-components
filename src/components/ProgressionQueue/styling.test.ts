import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// jsdom does not apply imported stylesheets, so a computed-style assertion here
// would pass no matter what the CSS says. Reading the rule is the honest gate.
const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "./ProgressionQueue.css"), "utf8");

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

describe("ProgressionQueue styling contract", () => {
  it("gives a selected row NO background fill — only the accent bar", () => {
    const body = ruleBody(".prog-queue__row--selected");
    // Allow-list: the selected row must declare ONLY box-shadow, never any
    // background-*, background-color, background-image, etc.
    expect(declaredProperties(body)).toEqual(["box-shadow"]);
    expect(body).toContain("inset 2px 0 0 var(--sui-accent)");
  });

  it("keeps the hover fill so hover still owns the background", () => {
    expect(ruleBody(".prog-queue__row--interactive:hover")).toMatch(/background\s*:/);
  });

  it("hardcodes no colors — every color is a --sui-* token", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("detects regressions: allow-list catches background-color reintroduction", () => {
    // Inline CSS that would fail the allow-list gate
    const fakeCSS = `.prog-queue__row--selected { box-shadow: inset 2px 0 0 var(--sui-accent); background-color: red; }`;
    const body = ruleBody(".prog-queue__row--selected", fakeCSS);
    // The bug: reintroducing background-color. The allow-list must catch this.
    expect(declaredProperties(body)).not.toEqual(["box-shadow"]);
  });
});
