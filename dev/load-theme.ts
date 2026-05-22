// dev/load-theme.ts
// Shared theme injection. Two <style> tags:
//   #sui-baseline — shared component CSS, injected once
//   #sui-theme    — active theme tokens + overrides, swapped on change
import baselineCss from "../src/themes/_baseline.css?raw";
import { THEMES, type ThemeId } from "../src/themes/manifest";

const BASELINE_TAG_ID = "sui-baseline";
const THEME_TAG_ID = "sui-theme";

const upsertStyleTag = (id: string, css: string): void => {
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;
};

/** Injects the baseline once. Idempotent — safe to call repeatedly. */
export const loadBaseline = (): void => upsertStyleTag(BASELINE_TAG_ID, baselineCss);

/** Ensures baseline is present, then swaps the active theme. */
export const loadTheme = (id: ThemeId): void => {
  loadBaseline();
  upsertStyleTag(THEME_TAG_ID, THEMES[id].css);
};

export { THEMES };
export type { ThemeId };
