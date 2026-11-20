// @vitest-environment node
import { describe, expect, it } from "vitest";
import { scopeSelector, scopeSheet, stripImports } from "./theme.ts";

const LIGHT = '[data-theme="light"]';

describe("scopeSelector", () => {
  it("narrows :root and html without raising their specificity", () => {
    expect(scopeSelector(":root", LIGHT)).toBe(`:root:where(${LIGHT})`);
    expect(scopeSelector("html.x", LIGHT)).toBe(`html:where(${LIGHT}).x`);
  });

  it("puts every other selector under a zero-specificity scope", () => {
    expect(scopeSelector(".sui-btn:hover", LIGHT)).toBe(
      `:where(:root${LIGHT}) .sui-btn:hover`,
    );
    expect(scopeSelector("body", LIGHT)).toBe(`:where(:root${LIGHT}) body`);
    expect(scopeSelector("*::before", LIGHT)).toBe(
      `:where(:root${LIGHT}) *::before`,
    );
  });

  it("scopes a :root that leads a compound or descendant selector", () => {
    expect(scopeSelector(":root .a", LIGHT)).toBe(`:root:where(${LIGHT}) .a`);
  });
});

describe("scopeSheet", () => {
  it("scopes each selector of a list, inside @media too, and leaves keyframes and font faces alone", () => {
    const out = scopeSheet(
      [
        ":root { --a: 1px; }",
        ".x, .y { color: red; }",
        "@media (hover: none) { .z { color: blue; } }",
        "@keyframes spin { from { opacity: 0; } to { opacity: 1; } }",
        "@font-face { font-family: F; src: local(F); }",
      ].join("\n"),
      LIGHT,
    );
    expect(out).toContain(`:root:where(${LIGHT}) { --a: 1px; }`);
    expect(out).toContain(`:where(:root${LIGHT}) .x, :where(:root${LIGHT}) .y`);
    expect(out).toContain(`:where(:root${LIGHT}) .z`);
    expect(out).toContain("from { opacity: 0; }");
    expect(out).toContain("@font-face { font-family: F;");
  });
});

describe("stripImports", () => {
  it("removes the sheet's @imports and returns them", () => {
    expect(
      stripImports(
        '@import "./_baseline.css";\n@import url("https://f/x");\n.a{}',
      ),
    ).toEqual({
      imports: ['"./_baseline.css"', 'url("https://f/x")'],
      css: ".a{}",
    });
  });
});
