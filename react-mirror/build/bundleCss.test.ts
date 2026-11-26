// @vitest-environment node
import { describe, expect, it } from "vitest";
import { composeBundleCss } from "./bundleCss.ts";

describe("composeBundleCss", () => {
  const css = composeBundleCss({
    components: ".sui-btn { color: red; }",
    baseline: ".sui-card { padding: 1px; }",
    themes: [
      {
        css: '@import "./_baseline.css";\n:root { --a: 1px; }',
        condition: ':not([data-theme="light"])',
      },
      {
        css: '@import "./_baseline.css";\n@import url("https://fonts.googleapis.com/x");\n.sui-btn { color: blue; }',
        condition: '[data-theme="light"]',
      },
    ],
  });

  it("hoists only the remote imports, once, to the top", () => {
    expect(
      css.startsWith('@import url("https://fonts.googleapis.com/x");\n'),
    ).toBe(true);
    expect(css).not.toContain('_baseline.css"');
  });

  it("orders components, baseline, then each scoped theme", () => {
    const at = (s: string) => css.indexOf(s);
    expect(at(".sui-btn { color: red; }")).toBeLessThan(at(".sui-card"));
    expect(at(".sui-card")).toBeLessThan(
      at(':root:where(:not([data-theme="light"])) { --a: 1px; }'),
    );
    expect(at(":root:where(:not")).toBeLessThan(
      at(':where(:root[data-theme="light"]) .sui-btn { color: blue; }'),
    );
  });
});
