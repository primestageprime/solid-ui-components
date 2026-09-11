import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { createScrubChartEmphasis } from "./createScrubChartEmphasis";

describe("createScrubChartEmphasis", () => {
  it("starts with no id hovered, and classFor returns the empty string", () => {
    createRoot((dispose) => {
      const emphasis = createScrubChartEmphasis();
      expect(emphasis.hoveredId()).toBeNull();
      expect(emphasis.classFor("block", "a")).toBe("");
      dispose();
    });
  });

  it("setHoveredId drives classFor through the pure core", () => {
    createRoot((dispose) => {
      const emphasis = createScrubChartEmphasis();
      emphasis.setHoveredId("a");
      expect(emphasis.classFor("block", "a")).toBe(" block--highlighted");
      expect(emphasis.classFor("block", "b")).toBe(" block--muted");
      emphasis.setHoveredId(null);
      expect(emphasis.classFor("block", "a")).toBe("");
      dispose();
    });
  });

  it("colorFor is undefined before refreshColors ever runs", () => {
    createRoot((dispose) => {
      const emphasis = createScrubChartEmphasis();
      expect(emphasis.colorFor("a")).toBeUndefined();
      dispose();
    });
  });

  it("refreshColors reads no source into an empty map", () => {
    createRoot((dispose) => {
      const emphasis = createScrubChartEmphasis();
      emphasis.refreshColors([]);
      expect(emphasis.colorFor("a")).toBeUndefined();
      dispose();
    });
  });
});
