// Public theme-switching API. Two <style> tags:
//   #sui-baseline — shared component CSS, injected once
//   #sui-theme    — active theme tokens + overrides, swapped on change
// All DOM/localStorage access is guarded so importing (or calling) from a
// non-browser context is a safe no-op — consumers boot themes client-side.
import baselineCss from "./_baseline.css?raw";
import { THEMES, type ThemeId } from "./manifest";

const BASELINE_TAG_ID = "sui-baseline";
const THEME_TAG_ID = "sui-theme";
const STORAGE_KEY = "sui-theme";
const DEFAULT_THEME: ThemeId = "hud";

const hasDom = (): boolean => typeof document !== "undefined";

const upsertStyleTag = (id: string, css: string): void => {
  if (!hasDom()) return;
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;
};

const isThemeId = (v: unknown): v is ThemeId =>
  typeof v === "string" && v in THEMES;

/** Reads the persisted theme from localStorage, or returns the default. */
export const getPersistedTheme = (): ThemeId => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    // No window, private-mode, or sandboxed iframe — fall back.
    return DEFAULT_THEME;
  }
};

/** Persists the active theme id. Best-effort — failures are swallowed. */
export const persistTheme = (id: ThemeId): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Persistence is best-effort.
  }
};

/** Injects the baseline once. Idempotent — safe to call repeatedly. */
export const loadBaseline = (): void =>
  upsertStyleTag(BASELINE_TAG_ID, baselineCss);

/** Ensures baseline is present, then swaps the active theme. */
export const loadTheme = (id: ThemeId): void => {
  loadBaseline();
  upsertStyleTag(THEME_TAG_ID, THEMES[id].css);
};

export { THEMES };
export type { ThemeId };
