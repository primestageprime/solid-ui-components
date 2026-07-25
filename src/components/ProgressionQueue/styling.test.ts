import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// jsdom does not apply imported stylesheets, so a computed-style assertion here
// would pass no matter what the CSS says. Reading the rule is the honest gate.
const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "./ProgressionQueue.css"), "utf8");

const ruleBody = (selector: string): string => {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`rule not found: ${selector}`);
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("}", open));
};

describe("ProgressionQueue styling contract", () => {
  it("gives a selected row NO background fill — only the accent bar", () => {
    const body = ruleBody(".prog-queue__row--selected");
    expect(body).not.toMatch(/(^|[^-])background\s*:/);
    expect(body).toContain("inset 2px 0 0 var(--sui-accent)");
  });

  it("keeps the hover fill so hover still owns the background", () => {
    expect(ruleBody(".prog-queue__row--interactive:hover")).toMatch(/background\s*:/);
  });

  it("hardcodes no colors — every color is a --sui-* token", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
