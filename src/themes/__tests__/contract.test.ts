import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The contract: every theme MUST declare these. Custom properties not in this
// list are theme-specific and not required of every theme.
const REQUIRED_TOKENS: readonly string[] = [
  // Backgrounds
  "--sui-bg-deep",
  "--sui-bg-primary",
  "--sui-bg-secondary",
  "--sui-bg-tertiary",
  "--sui-bg-elevated",
  // Text
  "--sui-text-primary",
  "--sui-text-secondary",
  "--sui-text-muted",
  // Borders
  "--sui-border",
  "--sui-border-bright",
  "--sui-border-focus",
  // Accent + semantic
  "--sui-accent",
  "--sui-accent-rgb",
  "--sui-accent-dim",
  "--sui-danger",
  "--sui-danger-rgb",
  "--sui-warning",
  "--sui-warning-rgb",
  "--sui-success",
  "--sui-success-rgb",
  // Radii
  "--sui-radius-sm",
  "--sui-radius-md",
  "--sui-radius-lg",
  // Clip sizes
  "--sui-clip-sm",
  "--sui-clip-md",
  "--sui-clip-lg",
  "--sui-clip-xl",
  // Spacing
  "--sui-space-0",
  "--sui-space-px",
  "--sui-space-0-5",
  "--sui-space-1",
  "--sui-space-1-5",
  "--sui-space-2",
  "--sui-space-2-5",
  "--sui-space-3",
  "--sui-space-4",
  "--sui-space-5",
  "--sui-space-6",
  // Typography
  // Note: --sui-font-utility is intentionally NOT required. Themes that omit
  // it inherit prose font via CSS var fallback in _baseline.css.
  "--sui-font-family",
  "--sui-font-mono",
  // Chart status colors
  "--status-full",
  "--status-partial",
  "--status-sparse",
  "--status-missing",
  // Chart chrome (in-plot axis/tick/label colour, distinct from --sui-text-muted)
  "--sui-chart-tick-color",
];

// Themes to validate. Update as themes are added (Task 6 adds "bronze.css").
// TODO(manifest): once src/themes/manifest.ts exists, derive this list from THEMES
// instead of maintaining it by hand.
const THEME_FILES: readonly string[] = [
  "default.css",
  "hud.css",
  "bronze.css",
  "bronze-dark.css",
  "colorblind.css",
];

// ESM-safe equivalent of CJS `__dirname`. We resolve via fileURLToPath rather
// than `new URL(..).pathname` because jsdom rewrites `import.meta.url` to an
// http:// URL whose pathname loses the absolute filesystem prefix.
const themeDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const file of THEME_FILES) {
  describe(`token contract: ${file}`, () => {
    const css = readFileSync(resolve(themeDir, file), "utf8");

    for (const token of REQUIRED_TOKENS) {
      it(`declares ${token}`, () => {
        // Match `<token>:` allowing arbitrary whitespace before the colon.
        const re = new RegExp(`${token.replace(/-/g, "\\-")}\\s*:`);
        expect(re.test(css)).toBe(true);
      });
    }
  });
}
