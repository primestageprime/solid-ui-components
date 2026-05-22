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
