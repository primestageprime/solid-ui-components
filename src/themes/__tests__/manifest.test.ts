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
