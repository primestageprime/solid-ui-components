// Shared theme injection — used by both the showcase ThemeSwitcher and the
// Sandbox. Inserts the requested theme's CSS as a single <style id="sui-theme">
// element so it cascades over the structural component CSS.
import hudCss from "../src/themes/hud.css?raw";
import defaultCss from "../src/themes/default.css?raw";

export type ThemeName = "hud" | "default";

const THEMES: Record<ThemeName, string> = { hud: hudCss, default: defaultCss };

export const STYLE_TAG_ID = "sui-theme";

/** Inject the named theme's CSS, creating the <style> tag if it doesn't exist. */
export const loadTheme = (name: ThemeName): void => {
  let el = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_TAG_ID;
    document.head.appendChild(el);
  }
  el.textContent = THEMES[name];
};
