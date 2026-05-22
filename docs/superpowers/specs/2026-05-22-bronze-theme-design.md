# Bronze Theme + Theme Architecture — Design

**Date:** 2026-05-22
**Status:** Draft (pending review before implementation plan)
**Authors:** Adlai (w/ Claude)

## Context

SUI ships two dark themes today: `default.css` (clean dark slate, rounded, sans-serif) and `hud.css` (sci-fi dark cyan, sharp clip-paths, scanlines). We want a **light, serif, friendly** third theme.

Brainstorming explored four directions (editorial, notebook, sunday-morning, warm-modern) and landed on a hybrid: warm-modern palette + notebook serif body font + a sans utility font for small labels. Internal name: **Bronze**.

The second goal is structural: the existing theme system makes adding a theme expensive. Each theme is ~700 lines of CSS because it bundles tokens (palette, fonts, radii) **and** component visual treatment (`.sui-panel`, `.sui-btn`, etc.) in the same file. The loader (`dev/load-theme.ts`) and switcher (`dev/theme-switcher.tsx`) both hardcode the two theme names. Adding a third theme today means editing 4–5 places. We want a manifest-driven system where **adding a future theme = one CSS file + one manifest entry**.

### Existing setup

- `src/themes/default.css` — tokens + component CSS, dark slate/blue
- `src/themes/hud.css` — tokens + component CSS, sci-fi dark cyan with clip-paths and scanlines
- `dev/load-theme.ts` — `?raw` imports both files, swaps them as a `<style id="sui-theme">` tag
- `dev/theme-switcher.tsx` — boolean toggle, hardcoded
- `package.json` exports — lists each theme path explicitly

## Decisions

### D1. Architecture — extracted baseline + per-theme files + manifest

Split today's monolithic theme files into two layers:

```
src/themes/
  _baseline.css       NEW. All component visual treatment, written purely against tokens.
                      Loaded once on app boot. Never swapped.
  default.css         EDITED. Becomes tokens-only — its component CSS moves to _baseline.
  hud.css             UNTOUCHED. Baseline rules load first; HUD's bespoke clip-path /
                      scanline overrides win via cascade order. Slimming HUD to the new
                      shape is follow-up cleanup.
  bronze.css          NEW. Tokens + a small number of overrides + font @import.
  manifest.ts         NEW. Single source of truth: id → { displayName, mode, css }.
  README.md           NEW. Token contract + "add a theme in 3 steps" recipe.
```

Two `<style>` tags on the page:
- `#sui-baseline` — injected once, contains `_baseline.css`. Never swapped.
- `#sui-theme` — swappable, contains the active theme's CSS (tokens + theme-specific overrides).

The cascade is: baseline rules → theme rules. So a theme overrides only what it needs to.

### D2. Manifest as single source of truth

```ts
// src/themes/manifest.ts
import defaultCss from "./default.css?raw";
import hudCss from "./hud.css?raw";
import bronzeCss from "./bronze.css?raw";

export interface ThemeEntry {
  readonly id: string;
  readonly displayName: string;
  readonly mode: "light" | "dark";
  readonly css: string;
}

export const THEMES = {
  default: { id: "default", displayName: "Default",  mode: "dark",  css: defaultCss },
  hud:     { id: "hud",     displayName: "HUD",      mode: "dark",  css: hudCss },
  bronze:  { id: "bronze",  displayName: "Bronze",   mode: "light", css: bronzeCss },
} as const satisfies Record<string, ThemeEntry>;

export type ThemeId = keyof typeof THEMES;
```

Loader and switcher both read from `THEMES`. To add a theme:
1. Create `src/themes/<id>.css`
2. Import + register in `manifest.ts`
3. (Optional) add export path to `package.json` for direct CSS consumption

### D3. Token contract — additions

Two tokens added to the contract this PR. Existing token names are unchanged.

```css
/* NEW — small-text utility font.
   Defaults to --sui-font-family via CSS var fallback, so dark themes need NOT declare it. */
--sui-font-utility: <font-stack>;
```

In `_baseline.css`, utility-tier components reference it with a fallback:

```css
.sui-btn      { font-family: var(--sui-font-utility, var(--sui-font-family)); }
.sui-tab      { font-family: var(--sui-font-utility, var(--sui-font-family)); }
/* etc. — see D5 for the full list */
```

For default and HUD this is a no-op (the fallback resolves to system-ui). For Bronze, this is how Lora serves prose while Inter serves buttons/badges.

### D4. Bronze palette

```css
:root {
  /* Backgrounds — bone family */
  --sui-bg-deep:      #EFEAE0;
  --sui-bg-primary:   #F6F2EB;
  --sui-bg-secondary: #FCFAF5;
  --sui-bg-tertiary:  #F0E7D6;
  --sui-bg-elevated:  #FFFFFF;

  /* Text */
  --sui-text-primary:   #2B1D14;
  --sui-text-secondary: #8C7861;
  --sui-text-muted:     #B8A78C;

  /* Borders */
  --sui-border:        #E5DCC9;
  --sui-border-bright: #D9CDB4;
  --sui-border-focus:  #C96442;

  /* Accent */
  --sui-accent:     #C96442;
  --sui-accent-rgb: 201, 100, 66;
  --sui-accent-dim: #A85234;

  /* Semantic */
  --sui-danger:  #A8443A;  --sui-danger-rgb:  168, 68, 58;
  --sui-warning: #C58A2C;  --sui-warning-rgb: 197, 138, 44;
  --sui-success: #5C7C5C;  --sui-success-rgb: 92, 124, 92;

  /* Radii — subtle round */
  --sui-radius-sm: 4px;
  --sui-radius-md: 6px;
  --sui-radius-lg: 10px;

  /* Clip sizes — kept identical to default.css */
  --sui-clip-sm:  8px;
  --sui-clip-md: 12px;
  --sui-clip-lg: 16px;
  --sui-clip-xl: 24px;

  /* Spacing scale — unchanged, identical to default.css */
  /* …--sui-space-* values copied verbatim from default.css… */

  /* Typography — the headline of this theme */
  --sui-font-family:  "Lora", Georgia, "Times New Roman", serif;
  --sui-font-utility: "Inter", system-ui, -apple-system, sans-serif;
  --sui-font-mono:    ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  /* Chart status colors — warm-mapped */
  --status-full:    #5C7C5C;
  --status-partial: #C58A2C;
  --status-sparse:  #C96442;
  --status-missing: #A8443A;
}
```

### D5. Components that switch to `--sui-font-utility` in `_baseline.css`

Reference the utility font (with serif fallback) for small-text / control-tier surfaces:

- `.sui-btn`
- `.sui-tab`
- `.sui-section__subtitle`
- `.sui-modal__subtitle`
- `.sui-list-item__secondary`
- Other small-uppercase eyebrow / metadata text encountered during baseline extraction

Keep `--sui-font-family` for prose / heading tier:

- Page headings
- `.sui-panel__title`, `.sui-section__title`, `.sui-modal__title`
- `.sui-list-item` row label
- Body text, lede paragraphs

### D6. Bronze-specific overrides (in `bronze.css`)

Beyond tokens, Bronze needs two overrides because the baseline has rules that assume a dark background:

1. **Secondary button** — `default.css` hardcodes Bootstrap grey `#6c757d` for `.sui-btn--secondary`. Override to a warm muted neutral:
   ```css
   .sui-btn--secondary {
     background: var(--sui-text-secondary);
     border-color: var(--sui-text-secondary);
     color: var(--sui-bg-elevated);
   }
   ```

2. **Panel glow shadows** — `default.css` uses `rgba(0,0,0,0.2/0.25/0.3)`. On bone bg these read heavier than intended. Soften with warm-ink-tinted alphas:
   ```css
   .sui-panel--glow-subtle  { box-shadow: 0 1px 3px  rgba(43, 29, 20, 0.06); }
   .sui-panel--glow-medium  { box-shadow: 0 2px 8px  rgba(43, 29, 20, 0.10); }
   .sui-panel--glow-strong  { box-shadow: 0 4px 16px rgba(43, 29, 20, 0.14); }
   ```

Plus a font load at the top of the file:

```css
@import url("https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap");
```

### D7. Loader and switcher

`dev/load-theme.ts` becomes:

```ts
import { THEMES, type ThemeId } from "../src/themes/manifest";
import baselineCss from "../src/themes/_baseline.css?raw";

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

/** Swaps the active theme. */
export const loadTheme = (id: ThemeId): void => {
  loadBaseline();
  upsertStyleTag(THEME_TAG_ID, THEMES[id].css);
};

export type { ThemeId };
```

`dev/theme-switcher.tsx` becomes a dropdown sourced from `Object.values(THEMES)`. The current default theme on first load remains `"hud"` to preserve existing behavior.

### D8. package.json exports

Add Bronze alongside the existing entries:

```json
"./themes/default.css": "./dist/themes/default.css",
"./themes/hud.css":     "./dist/themes/hud.css",
"./themes/bronze.css":  "./dist/themes/bronze.css"
```

`_baseline.css` is **not** exported directly — consumers who use the `<style>` injection path get it automatically via `loadTheme`. Consumers who reference theme CSS by URL (`<link rel="stylesheet" href="@primestageprime/solid-ui-components/themes/default.css">`) will continue to get the full standalone treatment from `default.css` and `hud.css`. After this PR, `default.css` is tokens-only and would not work standalone via that URL path — see "Migration concerns" below.

### D9. Verification

Workshop has a ThemeSwitcher already. Manual checks before merging:

1. **Default theme parity** — open the workshop on `default`, eyeball every showcase. Must look pixel-identical to current main. Most risk is in this step: baseline extraction from `default.css` must produce the same output.
2. **HUD theme parity** — open on `hud`, eyeball every showcase. Should look pixel-identical to current main (HUD's overrides win the cascade).
3. **Bronze rendering** — open on `bronze`. Should match the v2 mockup approved during brainstorming.
4. **Type-check + tests** — `npm run build`, `npm test`.

## Migration concerns

Consumers who load `default.css` via the `package.json` exports URL path will see a regression after this PR: `default.css` will only define tokens, not component visuals. Two options:

- **A** Accept the regression. Document it in CHANGELOG. Consumers using SUI through the JS API (the dominant path) are unaffected because `loadTheme` handles baseline injection. Consumers using the direct CSS URL must switch to importing `_baseline.css` first, then their theme.
- **B** Have `default.css` `@import "./_baseline.css"` at the top, so the URL-loaded CSS file is self-contained again. Costs: double-injection when used via `loadTheme` (baseline once via JS, baseline again via `@import`). Solvable by deduping in `loadTheme` (skip the JS injection when the active theme's CSS includes the `@import`).

**Decision:** Option **A**. Direct-URL CSS loading is not documented as a primary path, and the cleaner architecture is worth the tradeoff. If it becomes a problem, switching to B is a one-line change later.

## Out of scope

- **Dark variant of Bronze** — the dark palette was prototyped in brainstorming and works visually; shipping a `bronze-dark.css` is straightforward follow-up but not blocking.
- **Migrating HUD to the slim format** — HUD stays as its current self-contained file. Slimming it to tokens + bespoke overrides is mechanical follow-up cleanup with its own visual verification cycle.
- **Self-hosting fonts** — Bronze pulls Lora and Inter from Google Fonts via `@import`. Bundling the woff2 files into `dist/themes/fonts/` is a packaging improvement, not a theme-system question.
- **`prefers-color-scheme` auto-switching** — orthogonal to "add a theme." Could be a tiny utility later.
- **`--sui-mode` descriptor token** — considered, dropped as scope creep. Manifest's `mode` field is the source of truth for "is this light or dark."

## File plan summary

| File | Change | Notes |
|---|---|---|
| `src/themes/_baseline.css` | NEW | extracted from `default.css` component CSS; utility-font fallback applied per D5 |
| `src/themes/default.css` | EDITED | strip component CSS; tokens only |
| `src/themes/hud.css` | UNTOUCHED | works via cascade order over baseline |
| `src/themes/bronze.css` | NEW | tokens + 2 overrides + `@import` |
| `src/themes/manifest.ts` | NEW | typed registry |
| `src/themes/README.md` | NEW | token contract + "add a theme in 3 steps" |
| `dev/load-theme.ts` | EDITED | injects baseline + theme; reads from manifest |
| `dev/theme-switcher.tsx` | EDITED | dropdown from manifest |
| `package.json` | EDITED | add `./themes/bronze.css` to `exports` |
| `CHANGELOG.md` | EDITED | note the direct-URL `default.css` change (D8) |
