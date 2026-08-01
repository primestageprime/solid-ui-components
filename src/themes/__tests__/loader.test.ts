import { describe, it, expect } from "vitest";
import { loadTheme, loadBaseline, getPersistedTheme, persistTheme } from "../loader";
import { THEMES } from "../manifest";

describe("theme loader (public API)", () => {
  it("loadTheme/loadBaseline are no-ops without a DOM (SSR-safe)", () => {
    expect(() => loadBaseline()).not.toThrow();
    expect(() => loadTheme("hud")).not.toThrow();
  });

  it("getPersistedTheme falls back to hud without localStorage", () => {
    expect(getPersistedTheme()).toBe("hud");
  });

  it("persistTheme is a no-op without localStorage", () => {
    expect(() => persistTheme("bronze")).not.toThrow();
  });

  it("every manifest theme is loadable by id", () => {
    for (const id of Object.keys(THEMES)) {
      expect(() => loadTheme(id as keyof typeof THEMES)).not.toThrow();
    }
  });
});
