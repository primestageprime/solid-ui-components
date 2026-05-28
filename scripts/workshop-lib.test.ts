import { describe, it, expect } from "vitest";
import {
  isValidSlug,
  slugToTitle,
  slugToPascal,
  renderBenchTemplate,
  extractBenchLabel,
} from "./workshop-lib.mjs";

describe("isValidSlug", () => {
  it("accepts kebab-case", () => {
    expect(isValidSlug("scrub-chart")).toBe(true);
    expect(isValidSlug("fisheye")).toBe(true);
    expect(isValidSlug("chart-3d")).toBe(true);
  });
  it("rejects non-kebab", () => {
    expect(isValidSlug("ScrubChart")).toBe(false);
    expect(isValidSlug("scrub_chart")).toBe(false);
    expect(isValidSlug("scrub chart")).toBe(false);
    expect(isValidSlug("-lead")).toBe(false);
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("3d-chart")).toBe(false);
    expect(isValidSlug("1password")).toBe(false);
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

describe("extractBenchLabel", () => {
  it("reads meta.label out of bench source", () => {
    const src = renderBenchTemplate({ slug: "e2e-final", label: "E2E Final" });
    expect(extractBenchLabel(src, "e2e-final")).toBe("E2E Final");
  });
  it("unescapes a label containing a quote", () => {
    const src = renderBenchTemplate({ slug: "quotey", label: 'A "Quoted" Bench' });
    expect(extractBenchLabel(src, "quotey")).toBe('A "Quoted" Bench');
  });
  it("falls back to slugToTitle when there is no meta.label", () => {
    expect(extractBenchLabel("export default () => null;", "scrub-chart")).toBe("Scrub Chart");
  });
});
