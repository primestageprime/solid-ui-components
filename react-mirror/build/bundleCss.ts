// bundle.css: the components' own CSS, SUI's shared baseline, then each theme
// scoped to the <html data-theme> that selects it, in the order SUI's app
// loads them (theme last, so it can re-declare any baseline rule). CSS needs
// every @import first, so the themes' remote imports (fonts) are hoisted.
import { scopeSheet, stripImports } from "./theme.ts";

export interface ScopedTheme {
  readonly css: string;
  /** An attribute test on <html>, e.g. `[data-theme="light"]`. */
  readonly condition: string;
}

const isRemote = (param: string): boolean => /^url\(\s*["']?https:/.test(param);

export const composeBundleCss = (parts: {
  readonly components: string;
  readonly baseline: string;
  readonly themes: readonly ScopedTheme[];
}): string => {
  const themes = parts.themes.map((t) => ({ ...t, ...stripImports(t.css) }));
  const remote = [
    ...new Set(themes.flatMap((t) => t.imports.filter(isRemote))),
  ];
  return [
    ...remote.map((param) => `@import ${param};`),
    "/* ---- SUI component CSS ---- */",
    parts.components.trim(),
    "/* ---- SUI baseline (src/themes/_baseline.css) ---- */",
    stripImports(parts.baseline).css,
    ...themes.flatMap((t) => [
      `/* ---- theme, scoped to html${t.condition} ---- */`,
      scopeSheet(t.css, t.condition),
    ]),
    "",
  ].join("\n");
};
