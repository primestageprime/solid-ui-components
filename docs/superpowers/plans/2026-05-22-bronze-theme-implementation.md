# Bronze Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Bronze (light, serif, friendly) theme for SUI and restructure the theme system so future themes are one CSS file + one manifest entry.

**Architecture:** Extract token-driven component CSS from `default.css` into a shared `_baseline.css` loaded once on app boot. Each theme file becomes tokens + a small set of theme-specific overrides. A `manifest.ts` registry is the single source of truth driving the loader, the dev switcher, and package exports. A new `--sui-font-utility` token (with serif fallback) lets prose-serif themes still render buttons/badges/eyebrows in a sans face.

**Tech Stack:** SolidJS, Vite, Vitest (jsdom), pure CSS custom-properties theming.

**Spec:** `docs/superpowers/specs/2026-05-22-bronze-theme-design.md`

---

## File Structure

| File | Role |
|---|---|
| `src/themes/_baseline.css` | NEW. All component visual treatment, token-driven, with `--sui-font-utility` fallback on small-text surfaces. Loaded once on app boot, never swapped. |
| `src/themes/default.css` | EDITED. Component CSS moves out to `_baseline.css`. File becomes tokens-only. |
| `src/themes/hud.css` | UNTOUCHED. Its bespoke clip-path/scanline overrides continue to win the cascade. |
| `src/themes/bronze.css` | NEW. Tokens + 2 overrides (secondary button, panel glow shadows) + Google Fonts `@import`. |
| `src/themes/manifest.ts` | NEW. `THEMES` registry: `id → { id, displayName, mode, css }`. |
| `src/themes/README.md` | NEW. Token contract + "add a theme in 3 steps" recipe. |
| `src/themes/__tests__/contract.test.ts` | NEW. For each theme in the manifest, parses its CSS and asserts every required `--sui-*` token is declared. |
| `src/themes/__tests__/manifest.test.ts` | NEW. Shape assertions on `THEMES`. |
| `dev/load-theme.ts` | EDITED. Injects `<style id="sui-baseline">` (idempotent) plus a swappable `<style id="sui-theme">`. Reads from manifest. |
| `dev/load-theme.test.ts` | NEW. jsdom assertions that baseline + theme tags upsert correctly. |
| `dev/theme-switcher.tsx` | EDITED. Dropdown sourced from manifest instead of 2-state toggle. |
| `package.json` | EDITED. Add `./themes/bronze.css` to `exports`. |
| `README.md` | EDITED. Mention Bronze in the theme list. |
| `CHANGELOG.md` | EDITED. Note Bronze and the `default.css` direct-URL regression (spec D8). |

---

## Task 1: Token contract test

**Files:**
- Create: `src/themes/__tests__/contract.test.ts`

Lists the required `--sui-*` tokens every theme must declare and verifies each theme's CSS contains them. Currently passes for `default.css` and `hud.css`; will gate Bronze and any future themes.

- [ ] **Step 1: Write the contract test**

```ts
// src/themes/__tests__/contract.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  "--sui-font-family",
  "--sui-font-mono",
  // Chart status colors
  "--status-full",
  "--status-partial",
  "--status-sparse",
  "--status-missing",
];

// Themes to validate. Update as themes are added.
const THEME_FILES: readonly string[] = [
  "default.css",
  "hud.css",
];

const themeDir = resolve(__dirname, "..");

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
```

- [ ] **Step 2: Run test to verify it passes for existing themes**

Run: `npx vitest run src/themes/__tests__/contract.test.ts`
Expected: PASS — `default.css` and `hud.css` already declare all required tokens.

- [ ] **Step 3: Commit**

```bash
git add src/themes/__tests__/contract.test.ts
git commit -m "test(themes): assert required token contract per theme"
```

---

## Task 2: Manifest skeleton + shape test

**Files:**
- Create: `src/themes/manifest.ts`
- Create: `src/themes/__tests__/manifest.test.ts`

A typed registry; tests assert its shape. Bronze is added in Task 5.

- [ ] **Step 1: Write the failing test**

```ts
// src/themes/__tests__/manifest.test.ts
import { describe, it, expect } from "vitest";
import { THEMES, type ThemeId } from "../manifest";

describe("THEMES manifest", () => {
  it("contains default and hud", () => {
    expect(THEMES.default).toBeDefined();
    expect(THEMES.hud).toBeDefined();
  });

  it("each entry has id, displayName, mode, css", () => {
    for (const [id, entry] of Object.entries(THEMES)) {
      expect(entry.id).toBe(id);
      expect(typeof entry.displayName).toBe("string");
      expect(entry.displayName.length).toBeGreaterThan(0);
      expect(["light", "dark"]).toContain(entry.mode);
      expect(typeof entry.css).toBe("string");
      expect(entry.css.length).toBeGreaterThan(100); // sanity: real CSS, not empty
    }
  });

  it("id type is the literal union of keys", () => {
    // Type-level assertion: ThemeId must accept literal "default" and "hud".
    const a: ThemeId = "default";
    const b: ThemeId = "hud";
    expect([a, b]).toEqual(["default", "hud"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/themes/__tests__/manifest.test.ts`
Expected: FAIL — module `../manifest` does not exist.

- [ ] **Step 3: Implement manifest**

```ts
// src/themes/manifest.ts
import defaultCss from "./default.css?raw";
import hudCss from "./hud.css?raw";

export interface ThemeEntry {
  readonly id: string;
  readonly displayName: string;
  readonly mode: "light" | "dark";
  readonly css: string;
}

export const THEMES = {
  default: { id: "default", displayName: "Default", mode: "dark", css: defaultCss },
  hud:     { id: "hud",     displayName: "HUD",     mode: "dark", css: hudCss },
} as const satisfies Record<string, ThemeEntry>;

export type ThemeId = keyof typeof THEMES;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/themes/__tests__/manifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/themes/manifest.ts src/themes/__tests__/manifest.test.ts
git commit -m "feat(themes): introduce manifest registry for theme metadata"
```

---

## Task 3: Empty `_baseline.css` placeholder

**Files:**
- Create: `src/themes/_baseline.css`

For the architecture phase the baseline starts empty (just a header comment). It stays empty until Task 7, where component CSS is moved in from `default.css`. While it's empty, default theme keeps working because `default.css` still contains all its component CSS. This lets us land the loader/switcher changes risk-free first.

- [ ] **Step 1: Create the file with a placeholder comment**

```css
/* ============================================
   SUI Baseline — shared component visual treatment
   ============================================
   Loaded once on app boot via dev/load-theme.ts.
   Rules are written purely against --sui-* tokens.
   Theme CSS loads after this file and may override
   any rule by re-declaring the same selector.

   This file is intentionally empty until the
   component CSS extraction from default.css lands.
   See docs/superpowers/plans/2026-05-22-bronze-theme-implementation.md.
   ============================================ */
```

- [ ] **Step 2: Commit**

```bash
git add src/themes/_baseline.css
git commit -m "feat(themes): scaffold _baseline.css (empty placeholder)"
```

---

## Task 4: Loader injects baseline + theme

**Files:**
- Modify: `dev/load-theme.ts`
- Create: `dev/load-theme.test.ts`

Refactor the loader to inject two `<style>` tags (one baseline, one swappable theme) and read from `manifest.ts` instead of a hardcoded record.

- [ ] **Step 1: Write the failing test**

```ts
// dev/load-theme.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { loadBaseline, loadTheme } from "./load-theme";
import { THEMES } from "../src/themes/manifest";

const BASELINE_ID = "sui-baseline";
const THEME_ID = "sui-theme";

const getStyle = (id: string): HTMLStyleElement | null =>
  document.getElementById(id) as HTMLStyleElement | null;

describe("load-theme", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("loadBaseline injects #sui-baseline with non-empty content", () => {
    loadBaseline();
    const el = getStyle(BASELINE_ID);
    expect(el).not.toBeNull();
    expect(el!.tagName).toBe("STYLE");
    expect(el!.textContent && el!.textContent.length).toBeGreaterThan(0);
  });

  it("loadBaseline is idempotent (does not duplicate the tag)", () => {
    loadBaseline();
    loadBaseline();
    loadBaseline();
    const tags = document.querySelectorAll(`#${BASELINE_ID}`);
    expect(tags.length).toBe(1);
  });

  it("loadTheme sets #sui-theme content to the requested theme's CSS", () => {
    loadTheme("default");
    expect(getStyle(THEME_ID)!.textContent).toBe(THEMES.default.css);
    loadTheme("hud");
    expect(getStyle(THEME_ID)!.textContent).toBe(THEMES.hud.css);
  });

  it("loadTheme also ensures baseline is present", () => {
    loadTheme("default");
    expect(getStyle(BASELINE_ID)).not.toBeNull();
  });

  it("loadTheme leaves #sui-baseline untouched when swapping themes", () => {
    loadBaseline();
    const baselineContent = getStyle(BASELINE_ID)!.textContent;
    loadTheme("hud");
    expect(getStyle(BASELINE_ID)!.textContent).toBe(baselineContent);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run dev/load-theme.test.ts`
Expected: FAIL — `loadBaseline` is not exported by current `dev/load-theme.ts`.

- [ ] **Step 3: Rewrite `dev/load-theme.ts`**

```ts
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

// Back-compat alias for any callers still importing ThemeName.
export type ThemeName = ThemeId;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run dev/load-theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite to catch unrelated regressions**

Run: `npx vitest run`
Expected: PASS for everything.

- [ ] **Step 6: Smoke-test the workshop**

Run: `npm run dev`, open the workshop, switch between Default and HUD using the existing switcher. Both should render identically to before this change.

- [ ] **Step 7: Commit**

```bash
git add dev/load-theme.ts dev/load-theme.test.ts
git commit -m "refactor(themes): loader injects baseline + active theme from manifest"
```

---

## Task 5: Theme switcher becomes a manifest-driven dropdown

**Files:**
- Modify: `dev/theme-switcher.tsx`

- [ ] **Step 1: Rewrite `dev/theme-switcher.tsx`**

```tsx
// dev/theme-switcher.tsx
import { Component, createSignal, createEffect, For } from "solid-js";
import { loadTheme, THEMES, type ThemeId } from "./load-theme";

// Pick a sensible initial theme that matches existing default behavior.
const INITIAL: ThemeId = "hud";

export const ThemeSwitcher: Component = () => {
  const [theme, setTheme] = createSignal<ThemeId>(INITIAL);
  createEffect(() => loadTheme(theme()));

  return (
    <div class="theme-switcher">
      <span class="theme-switcher__label">Theme</span>
      <select
        class="theme-switcher__select"
        value={theme()}
        onChange={(e) => setTheme(e.currentTarget.value as ThemeId)}
      >
        <For each={Object.values(THEMES)}>
          {(entry) => <option value={entry.id}>{entry.displayName}</option>}
        </For>
      </select>
    </div>
  );
};
```

- [ ] **Step 2: Verify there is styling for `.theme-switcher__select`**

Run: `grep -n "theme-switcher" dev/main.css`

If a `.theme-switcher__select` rule does not exist, add minimal styling to `dev/main.css`:

```css
.theme-switcher__select {
  background: transparent;
  color: inherit;
  border: 1px solid currentColor;
  border-radius: 4px;
  padding: 2px 6px;
  font: inherit;
  cursor: pointer;
}
```

(If a `.theme-switcher__btn` rule exists, it can be retained as dead style — no need to remove in this task.)

- [ ] **Step 3: Smoke-test the workshop**

Run: `npm run dev`, confirm the switcher is now a dropdown listing "Default" and "HUD" and that selecting each renders the appropriate theme.

- [ ] **Step 4: Commit**

```bash
git add dev/theme-switcher.tsx dev/main.css
git commit -m "feat(themes): theme switcher becomes manifest-driven dropdown"
```

---

## Task 6: Bronze theme file

**Files:**
- Create: `src/themes/bronze.css`
- Modify: `src/themes/manifest.ts`
- Modify: `package.json`

Adds Bronze to the registry. Workshop verification follows in Task 7.

- [ ] **Step 1: Create `src/themes/bronze.css`**

```css
/* ============================================
   Bronze Theme — Light, Serif, Friendly
   ============================================
   Lora for prose, Inter for utility text
   (buttons, badges, eyebrows, metadata). Warm
   bone backgrounds, deep warm ink, rust accent.
   ============================================ */
@import url("https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap");

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  font-family: var(--sui-font-family);
  background-color: var(--sui-bg-primary);
  color: var(--sui-text-primary);
  margin: 0;
  padding: 0;
}

:root {
  /* ---- Backgrounds — bone family ---- */
  --sui-bg-deep:      #EFEAE0;
  --sui-bg-primary:   #F6F2EB;
  --sui-bg-secondary: #FCFAF5;
  --sui-bg-tertiary:  #F0E7D6;
  --sui-bg-elevated:  #FFFFFF;

  /* ---- Text ---- */
  --sui-text-primary:   #2B1D14;
  --sui-text-secondary: #8C7861;
  --sui-text-muted:     #B8A78C;

  /* ---- Borders ---- */
  --sui-border:        #E5DCC9;
  --sui-border-bright: #D9CDB4;
  --sui-border-focus:  #C96442;

  /* ---- Accent ---- */
  --sui-accent:     #C96442;
  --sui-accent-rgb: 201, 100, 66;
  --sui-accent-dim: #A85234;

  /* ---- Semantic ---- */
  --sui-danger:      #A8443A;
  --sui-danger-rgb:  168, 68, 58;
  --sui-warning:     #C58A2C;
  --sui-warning-rgb: 197, 138, 44;
  --sui-success:     #5C7C5C;
  --sui-success-rgb: 92, 124, 92;

  /* ---- Radii — subtle round ---- */
  --sui-radius-sm: 4px;
  --sui-radius-md: 6px;
  --sui-radius-lg: 10px;

  /* ---- Clip sizes ---- */
  --sui-clip-sm:  8px;
  --sui-clip-md: 12px;
  --sui-clip-lg: 16px;
  --sui-clip-xl: 24px;

  /* ---- Spacing scale (identical across themes) ---- */
  --sui-space-0: 0;
  --sui-space-px: 1px;
  --sui-space-0-5: 2px;
  --sui-space-1: 4px;
  --sui-space-1-5: 6px;
  --sui-space-2: 8px;
  --sui-space-2-5: 10px;
  --sui-space-3: 12px;
  --sui-space-4: 16px;
  --sui-space-5: 20px;
  --sui-space-6: 24px;

  /* ---- Typography ---- */
  --sui-font-family:  "Lora", Georgia, "Times New Roman", serif;
  --sui-font-utility: "Inter", system-ui, -apple-system, sans-serif;
  --sui-font-mono:    ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  /* ---- Chart status colors — warm mapping ---- */
  --status-full:    #5C7C5C;
  --status-partial: #C58A2C;
  --status-sparse:  #C96442;
  --status-missing: #A8443A;
}

/* ============================================
   Component overrides — only where pure tokens
   are insufficient (light-bg-aware shadows,
   palette-specific neutral button)
   ============================================ */

/* Secondary button: default.css uses Bootstrap-grey #6c757d,
   which clashes with the warm palette. Use a warm muted neutral. */
.sui-btn--secondary {
  background: var(--sui-text-secondary);
  border-color: var(--sui-text-secondary);
  color: var(--sui-bg-elevated);
}
.sui-btn--secondary:hover:not(:disabled) {
  background: var(--sui-text-primary);
  border-color: var(--sui-text-primary);
  color: var(--sui-bg-elevated);
}

/* Panel glows: default.css uses rgba(0,0,0,0.2..0.3) which is
   too heavy on bone bg. Soften with warm-ink-tinted alphas. */
.sui-panel--glow-subtle  { box-shadow: 0 1px 3px  rgba(43, 29, 20, 0.06); }
.sui-panel--glow-medium  { box-shadow: 0 2px 8px  rgba(43, 29, 20, 0.10); }
.sui-panel--glow-strong  { box-shadow: 0 4px 16px rgba(43, 29, 20, 0.14); }
```

- [ ] **Step 2: Register Bronze in the manifest**

Replace `src/themes/manifest.ts` contents with:

```ts
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
  default: { id: "default", displayName: "Default", mode: "dark",  css: defaultCss },
  hud:     { id: "hud",     displayName: "HUD",     mode: "dark",  css: hudCss },
  bronze:  { id: "bronze",  displayName: "Bronze",  mode: "light", css: bronzeCss },
} as const satisfies Record<string, ThemeEntry>;

export type ThemeId = keyof typeof THEMES;
```

- [ ] **Step 3: Extend `THEME_FILES` in the contract test**

Modify `src/themes/__tests__/contract.test.ts`, replacing the `THEME_FILES` constant:

```ts
const THEME_FILES: readonly string[] = [
  "default.css",
  "hud.css",
  "bronze.css",
];
```

- [ ] **Step 4: Add Bronze to `package.json` exports**

Edit `package.json` `exports` block to add the new path:

```json
"./themes/default.css": "./dist/themes/default.css",
"./themes/hud.css": "./dist/themes/hud.css",
"./themes/bronze.css": "./dist/themes/bronze.css",
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: PASS (contract test now validates all 3 themes; manifest test still asserts default + hud, which continue to exist).

- [ ] **Step 6: Commit**

```bash
git add src/themes/bronze.css src/themes/manifest.ts src/themes/__tests__/contract.test.ts package.json
git commit -m "feat(themes): add Bronze theme (light, Lora serif, Inter utility)"
```

---

## Task 7: Workshop verification for Bronze

This is a manual visual check, not a unit test. Bronze is not yet receiving baseline rules (baseline is still empty) — so at this point Bronze renders with ONLY its own tokens and overrides. Default and HUD still render fully because they each retain their component CSS.

- [ ] **Step 1: Open workshop**

Run: `npm run dev`. Open `http://localhost:6006`.

- [ ] **Step 2: Switch to Bronze in the dropdown**

Confirm:
- Background is warm bone, text is warm dark, body font is Lora.
- Bronze-specific overrides (`.sui-btn--secondary`, `.sui-panel--glow-*`) appear correctly on showcases that use them.
- Other components fall back to browser defaults (no `.sui-panel`, `.sui-section` styling) because baseline is still empty. **This is expected at this stage** and will be resolved by Task 8.

- [ ] **Step 3: Sanity-check Default and HUD still work**

Switch back to Default and HUD; confirm they render identically to pre-PR.

- [ ] **Step 4: No commit required** — this is a verification step.

---

## Task 8: Extract component CSS from `default.css` into `_baseline.css`

The careful refactor. Move all component visual treatment from `default.css` (lines 92 through end — everything after the `:root` token block) into `_baseline.css`, applying the `--sui-font-utility` fallback on small-text components.

**Files:**
- Modify: `src/themes/_baseline.css` (replaces placeholder content)
- Modify: `src/themes/default.css` (becomes tokens-only)

- [ ] **Step 1: Open `src/themes/default.css` and identify the boundary**

The file structure is:
- Lines 1–20: box-sizing reset + body styles
- Lines 22–90: `:root { --sui-*: ... }` token declarations
- Lines 92 to end (~876): component visual treatment (`.sui-page`, `.sui-section`, `.sui-panel`, `.sui-btn`, `.sui-toggle`, `.sui-modal`, `.sui-tabs`, `.sui-btn-group`, `.sui-list`, `.sui-dag`, etc.)

The box-sizing reset and body block at the top are structural too — they belong in baseline.

- [ ] **Step 2: Copy `default.css` content into `_baseline.css`**

Replace the placeholder content of `src/themes/_baseline.css` with:
- The box-sizing reset block (currently lines 9–11 of `default.css`)
- The body block (currently lines 14–20)
- **Everything from line 92 onward** (all the component CSS, comment headers included)

Do NOT copy the `:root { --sui-*: ... }` block — tokens stay in `default.css`.

Add this header at the top of `_baseline.css`:

```css
/* ============================================
   SUI Baseline — shared component visual treatment
   ============================================
   Loaded once on app boot via dev/load-theme.ts.
   Rules are written purely against --sui-* tokens.
   Theme CSS loads after this file and may override
   any rule by re-declaring the same selector.
   ============================================ */
```

- [ ] **Step 3: Apply `--sui-font-utility` fallback to small-text components in `_baseline.css`**

In `_baseline.css`, edit these two existing rules:

```css
/* Before */
.sui-btn {
  background: var(--sui-bg-elevated);
  border: 1px solid var(--sui-border);
  border-radius: var(--sui-radius-md);
  color: var(--sui-text-primary);
  font-family: var(--sui-font-family);   /* ← change this line */
  ...
}

/* After */
.sui-btn {
  background: var(--sui-bg-elevated);
  border: 1px solid var(--sui-border);
  border-radius: var(--sui-radius-md);
  color: var(--sui-text-primary);
  font-family: var(--sui-font-utility, var(--sui-font-family));
  ...
}
```

```css
/* Before */
.sui-tab {
  background: none;
  border: none;
  color: var(--sui-text-secondary);
  font-family: var(--sui-font-family);   /* ← change this line */
  ...
}

/* After */
.sui-tab {
  background: none;
  border: none;
  color: var(--sui-text-secondary);
  font-family: var(--sui-font-utility, var(--sui-font-family));
  ...
}
```

Then add explicit `font-family` declarations to these small-text components that currently inherit from body (find each existing rule and add the line; don't create new rules):

```css
.sui-section__subtitle {
  font-size: 12px;
  color: var(--sui-text-secondary);
  text-transform: none;
  letter-spacing: normal;
  font-family: var(--sui-font-utility, var(--sui-font-family));   /* ← add this */
}

.sui-modal__subtitle {
  font-size: 12px;
  color: var(--sui-text-secondary);
  text-transform: none;
  letter-spacing: normal;
  font-family: var(--sui-font-utility, var(--sui-font-family));   /* ← add this */
}

.sui-list-item__secondary {
  font-size: 12px;
  color: var(--sui-text-secondary);
  font-family: var(--sui-font-utility, var(--sui-font-family));   /* ← add this */
}
```

For default + HUD these new declarations resolve to system-ui (the fallback kicks in). For Bronze they resolve to Inter.

- [ ] **Step 4: Slim `default.css` to tokens-only**

Replace the contents of `src/themes/default.css` with:

```css
/* ============================================
   Default Theme — Clean/Standard Tokens
   ============================================
   Tokens-only. Shared component CSS lives in
   _baseline.css and is loaded by load-theme.ts.
   ============================================ */

:root {
  /* ---- Accent / Primary ---- */
  --sui-accent: #3b82f6;
  --sui-accent-dim: #2563eb;
  --sui-accent-rgb: 59, 130, 246;

  /* ---- Semantic Colors ---- */
  --sui-danger: #ef4444;
  --sui-danger-rgb: 239, 68, 68;
  --sui-warning: #f59e0b;
  --sui-warning-rgb: 245, 158, 11;
  --sui-success: #22c55e;
  --sui-success-rgb: 34, 197, 94;

  /* ---- Backgrounds ---- */
  --sui-bg-deep: #0d0d1a;
  --sui-bg-primary: #1a1a2e;
  --sui-bg-secondary: #16213e;
  --sui-bg-tertiary: #0f3460;
  --sui-bg-elevated: #1e2a3e;

  /* ---- Text ---- */
  --sui-text-primary: #f1f5f9;
  --sui-text-secondary: #94a3b8;
  --sui-text-muted: #64748b;

  /* ---- Borders ---- */
  --sui-border: #334155;
  --sui-border-bright: #475569;
  --sui-border-focus: #3b82f6;

  /* ---- Radii ---- */
  --sui-radius-sm: 4px;
  --sui-radius-md: 8px;
  --sui-radius-lg: 12px;

  /* ---- Clip Sizes ---- */
  --sui-clip-sm: 8px;
  --sui-clip-md: 12px;
  --sui-clip-lg: 16px;
  --sui-clip-xl: 24px;

  /* ---- Spacing Scale ---- */
  --sui-space-0: 0;
  --sui-space-px: 1px;
  --sui-space-0-5: 2px;
  --sui-space-1: 4px;
  --sui-space-1-5: 6px;
  --sui-space-2: 8px;
  --sui-space-2-5: 10px;
  --sui-space-3: 12px;
  --sui-space-4: 16px;
  --sui-space-5: 20px;
  --sui-space-6: 24px;

  /* ---- Typography ---- */
  --sui-font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --sui-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

  /* ---- Status Colors ---- */
  --status-full: #00d4ff;
  --status-partial: #ffcc00;
  --status-sparse: #ff8800;
  --status-missing: #ff0040;
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: PASS — token contract still satisfied for all three themes.

- [ ] **Step 6: Workshop verification — Default theme parity**

Run: `npm run dev`. Open the workshop on Default.

Click through every showcase in the sidebar. Each must look **pixel-identical** to pre-PR Default. Most risk lives here.

If any showcase differs, the most likely cause is a rule that was missed in the extraction. Resolution: locate the missing rule in the current main's `default.css`, copy it into `_baseline.css`.

- [ ] **Step 7: Workshop verification — HUD theme parity**

Switch the dropdown to HUD. Click through every showcase. Must look **pixel-identical** to pre-PR HUD.

If HUD shows visual regressions caused by baseline rules leaking through where HUD previously had no override, the fix is to add the missing override to `hud.css`. (HUD's existing rules win the cascade, but baseline introduces some rules HUD didn't have before — e.g., if HUD didn't override a specific `.sui-modal--corners-clip` rule, it will now inherit the baseline's version.) Most cases should "just work" because HUD already overrides every component it cares about.

- [ ] **Step 8: Workshop verification — Bronze**

Switch to Bronze. Now that baseline is providing component CSS, Bronze should render the full UI in the warm-bronze palette with Lora prose and Inter on buttons/tabs/badges. Verify against the v2 mockup at `.superpowers/brainstorm/*/content/directions-v2.html`.

- [ ] **Step 9: Commit**

```bash
git add src/themes/_baseline.css src/themes/default.css
git commit -m "refactor(themes): extract component CSS into _baseline.css

default.css is now tokens-only; shared component visual treatment moves
to _baseline.css which is loaded once on app boot. Small-text components
(.sui-btn, .sui-tab, subtitles, list metadata) now use
--sui-font-utility with fallback to --sui-font-family, enabling serif
themes like Bronze to render utility text in a sans face while keeping
existing themes unchanged via the fallback."
```

---

## Task 9: Theme README

**Files:**
- Create: `src/themes/README.md`

The "add a theme in 3 steps" recipe + token contract documentation.

- [ ] **Step 1: Create the README**

```markdown
# SUI Themes

A theme is a CSS file that declares the SUI token contract and, optionally,
overrides specific component rules. Themes are registered in `manifest.ts`
and loaded by `dev/load-theme.ts`.

## Architecture

Two `<style>` tags on the page:

- `#sui-baseline` — `_baseline.css`. All component visual treatment, written
  purely against `--sui-*` tokens. Loaded once on app boot. Never swapped.
- `#sui-theme` — the active theme's CSS. Declares tokens; optionally overrides
  baseline rules. Swapped when the user changes theme.

Cascade order: baseline rules → theme rules. A theme overrides only what it
needs to.

## Adding a theme in 3 steps

1. Create `src/themes/<id>.css` that declares the [token contract](#token-contract).
2. Register it in `src/themes/manifest.ts`:
   ```ts
   import myThemeCss from "./my-theme.css?raw";
   export const THEMES = {
     ...
     "my-theme": { id: "my-theme", displayName: "My Theme", mode: "light", css: myThemeCss },
   } as const satisfies Record<string, ThemeEntry>;
   ```
3. (Optional) Add an export entry to `package.json` if you want consumers to
   load the CSS file directly by URL:
   ```json
   "./themes/my-theme.css": "./dist/themes/my-theme.css"
   ```

The dev `ThemeSwitcher` picks the new entry up automatically.

## Token contract

Every theme MUST declare these custom properties at `:root`. The contract
test at `__tests__/contract.test.ts` fails if any are missing.

### Backgrounds
| Token | Purpose |
|---|---|
| `--sui-bg-deep` | Outermost frame |
| `--sui-bg-primary` | Page |
| `--sui-bg-secondary` | Panel |
| `--sui-bg-tertiary` | Warmer accent surface |
| `--sui-bg-elevated` | Highest lift (header strips, modals) |

### Text
| Token | Purpose |
|---|---|
| `--sui-text-primary` | Body text |
| `--sui-text-secondary` | Subdued labels |
| `--sui-text-muted` | Captions, hints |

### Borders
| Token | Purpose |
|---|---|
| `--sui-border` | Default hairline |
| `--sui-border-bright` | Emphasised hairline |
| `--sui-border-focus` | Focus ring (usually the accent) |

### Accent + semantic
Each color comes paired with an `-rgb` triplet for `rgba()` use.
| Token | Purpose |
|---|---|
| `--sui-accent`, `--sui-accent-rgb`, `--sui-accent-dim` | Brand accent |
| `--sui-danger`, `--sui-danger-rgb` | Errors, destructive actions |
| `--sui-warning`, `--sui-warning-rgb` | Caution states |
| `--sui-success`, `--sui-success-rgb` | Confirmations |

### Radii, clip sizes, spacing
| Token | Notes |
|---|---|
| `--sui-radius-sm`, `--sui-radius-md`, `--sui-radius-lg` | Rounded-corner sizes |
| `--sui-clip-sm`..`--sui-clip-xl` | Clip-path sizes (HUD-style themes) |
| `--sui-space-0` through `--sui-space-6` plus `-px`, `-0-5`, `-1-5`, `-2-5` | Spacing scale, identical across themes |

### Typography
| Token | Purpose |
|---|---|
| `--sui-font-family` | Prose / headings |
| `--sui-font-mono` | Code, tabular numerics |

### Optional: `--sui-font-utility`
Small-text font (buttons, tabs, subtitles, list metadata). If a theme does
NOT declare `--sui-font-utility`, baseline rules fall back to
`--sui-font-family` via CSS var fallback — so dark themes that don't
distinguish prose vs utility fonts can simply omit it.

### Chart status colors
| Token | Purpose |
|---|---|
| `--status-full` | "Fully filled" cells |
| `--status-partial` | Partial coverage |
| `--status-sparse` | Low coverage |
| `--status-missing` | No data |

## Theme-specific overrides

Beyond tokens, a theme may need to override specific component rules when
pure-token theming is insufficient. Examples:

- `bronze.css` overrides `.sui-btn--secondary` because `_baseline.css`
  inherits a Bootstrap-grey background from default that clashes with the
  warm palette.
- `bronze.css` softens `.sui-panel--glow-*` shadows because the baseline
  uses `rgba(0,0,0,...)` opacities that read too heavy on bone bg.
- `hud.css` overrides corner treatment everywhere because HUD uses
  `clip-path` instead of `border-radius`.

Keep overrides as small as possible — every override is a surface that may
drift from baseline as components evolve.

## Fonts

Themes that depend on a specific font face may either:

- `@import` the font at the top of the theme CSS (Bronze does this with
  Google Fonts), OR
- Document the font load as a consumer responsibility in this README.

There is no bundled font-self-hosting today.
```

- [ ] **Step 2: Commit**

```bash
git add src/themes/README.md
git commit -m "docs(themes): document token contract and add-a-theme recipe"
```

---

## Task 10: Update top-level README + CHANGELOG

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Find the README's theme section**

Run: `grep -n "theme" README.md`

The known reference is line 4: `curried-variant pattern, dark themes (default + HUD).`

- [ ] **Step 2: Update README line 4 (or nearest equivalent)**

Edit the descriptor to list all themes:

```md
curried-variant pattern, themes (Default + HUD dark, Bronze light).
```

If line 31 of the README references `src/themes/`, also update it:

```md
src/themes/            — _baseline.css + per-theme tokens (default, hud, bronze); registered in manifest.ts
```

- [ ] **Step 3: Add a CHANGELOG entry**

Read the top of `CHANGELOG.md` to see the existing format, then add a new section above the most recent entry:

```md
## [Unreleased]

### Added
- **Bronze theme** — a light, serif (Lora), friendly variant. Lora is used
  for prose; Inter for utility text (buttons, badges, subtitles, list
  metadata). Warm bone background, rust accent.
- **Theme architecture** — extracted shared component CSS into
  `_baseline.css`, loaded once on app boot. Per-theme CSS files now declare
  only tokens plus theme-specific overrides. A new `manifest.ts` registry is
  the single source of truth driving the loader, the dev switcher, and
  package exports.
- New token `--sui-font-utility` for small-text components. Defaults to
  `--sui-font-family` via CSS var fallback, so existing themes need not
  declare it.

### Changed
- `default.css` is now **tokens-only**. Consumers using `loadTheme()`
  (the documented JS API) are unaffected. Consumers loading
  `@primestageprime/solid-ui-components/themes/default.css` directly by URL
  will see component CSS go missing — they must also load
  `@primestageprime/solid-ui-components/themes/_baseline.css` (or move to
  the JS API). See the theme README for details.
- The dev `ThemeSwitcher` is now a dropdown sourced from the manifest
  rather than a 2-state toggle.
```

(Adjust the heading style to match whatever convention `CHANGELOG.md` already uses.)

- [ ] **Step 4: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: announce Bronze theme and document direct-URL migration"
```

---

## Task 11: Final full-suite verification

- [ ] **Step 1: Type-check + build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 2: Full test suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 3: Workshop verification one more time**

Run: `npm run dev`. Cycle through Default → HUD → Bronze in the switcher. All three render correctly; toggling between them produces clean swaps without visual residue.

- [ ] **Step 4: Optional — audit script**

If `npm run audit:styles` exists, run it and confirm no new violations:

Run: `npm run audit:styles`

- [ ] **Step 5: No commit if everything passes.** If issues are found, fix them in a targeted commit before opening the PR.

---

## Self-review notes

- **Spec coverage:** D1 → T3, T4, T8. D2 → T2, T6. D3 → T1, T8 (step 3). D4 → T6. D5 → T8 (step 3). D6 → T6. D7 → T4, T5. D8 → T6 (step 4). D9 → T7, T8 (steps 6–8), T11. Migration concern (Option A) → T10 CHANGELOG entry. Out-of-scope items remain out of scope.
- **Placeholders:** none — every code block is complete.
- **Type consistency:** `ThemeId` / `ThemeEntry` / `THEMES` referenced consistently across `manifest.ts`, `load-theme.ts`, `theme-switcher.tsx`, and the tests. `loadBaseline` and `loadTheme` signatures match between definition (T4) and tests (T4) and usage (T5).
