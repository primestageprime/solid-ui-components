import { describe, it, expect } from "vitest";
import { loadTheme, loadBaseline, getPersistedTheme, persistTheme } from "../loader";
import { THEMES } from "../manifest";

describe("theme loader (public API)", () => {
  it("loadTheme/loadBaseline are no-ops without a DOM (SSR-safe)", () => {
    expect(() => loadBaseline()).not.toThrow();
    expect(() => loadTheme("hud")).not.toThrow();
  });

  it("getPersistedTheme falls back to default without localStorage", () => {
    expect(getPersistedTheme()).toBe("default");
  });

  it("loadTheme falls back to default for an id the manifest no longer has (e.g. a stale persisted/compiled id from a consumer on an older SUI version)", () => {
    expect(() => loadTheme("stax" as unknown as keyof typeof THEMES)).not.toThrow();
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
