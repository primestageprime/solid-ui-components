import { describe, it, expect } from "vitest";
import {
  isValidSlug,
  slugToTitle,
  slugToPascal,
  renderBenchTemplate,
} from "./workshop-lib.mjs";

describe("isValidSlug", () => {
  it("accepts kebab-case", () => {
    expect(isValidSlug("scrub-chart")).toBe(true);
    expect(isValidSlug("fisheye")).toBe(true);
  });
  it("rejects non-kebab", () => {
    expect(isValidSlug("ScrubChart")).toBe(false);
    expect(isValidSlug("scrub_chart")).toBe(false);
    expect(isValidSlug("scrub chart")).toBe(false);
    expect(isValidSlug("-lead")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});

describe("slugToTitle / slugToPascal", () => {
  it("title-cases", () => {
    expect(slugToTitle("scrub-chart")).toBe("Scrub Chart");
  });
  it("pascal-cases", () => {
    expect(slugToPascal("scrub-chart")).toBe("ScrubChart");
  });
});

describe("renderBenchTemplate", () => {
  it("produces a default-exported bench with meta.label and matching names", () => {
    const out = renderBenchTemplate({ slug: "scrub-chart", label: "Scrub Chart" });
    expect(out).toContain('export const meta = { label: "Scrub Chart" };');
    expect(out).toContain("const ScrubChartBench: Component");
    expect(out).toContain("export default ScrubChartBench;");
    expect(out).toContain('from "../../../src/components/Text"');
    expect(out).toContain("<SectionTitle>Scrub Chart</SectionTitle>");
  });
});
