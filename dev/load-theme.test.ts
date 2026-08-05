import { describe, it, expect, beforeEach } from "vitest";
import {
  getPersistedTheme,
  loadBaseline,
  loadTheme,
  persistTheme,
} from "./load-theme";
import { THEMES } from "../src/themes/manifest";

const BASELINE_ID = "sui-baseline";
const THEME_ID = "sui-theme";
const STORAGE_KEY = "sui-theme";

const getStyle = (id: string): HTMLStyleElement | null =>
  document.getElementById(id) as HTMLStyleElement | null;

describe("load-theme", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    window.localStorage.clear();
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

  describe("persistence", () => {
    it("getPersistedTheme returns the default when nothing is stored", () => {
      expect(getPersistedTheme()).toBe("default");
    });

    it("persistTheme writes the theme id to localStorage", () => {
      persistTheme("bronze");
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe("bronze");
    });

    it("getPersistedTheme round-trips through persistTheme", () => {
      persistTheme("bronze");
      expect(getPersistedTheme()).toBe("bronze");
      persistTheme("default");
      expect(getPersistedTheme()).toBe("default");
    });

    it("getPersistedTheme falls back to the default for invalid stored values", () => {
      window.localStorage.setItem(STORAGE_KEY, "not-a-theme");
      expect(getPersistedTheme()).toBe("default");
    });
  });
});
