import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Legend, type LegendItem } from "./Legend";

const SERIES_ITEMS: LegendItem[] = [
  { color: "#3b82f6", label: "Revenue" },
  { color: "#10b981", label: "Profit" },
  { color: "#f59e0b", label: "Costs" },
];

const styleOf = (el: Element) => (el as HTMLElement).getAttribute("style") ?? "";

describe("Legend", () => {
  it("renders with the expected root class", () => {
    const { container } = render(() => <Legend items={SERIES_ITEMS} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/sui-legend/);
  });

  it("renders one item per entry with label text", () => {
    const { container, getByText } = render(() => <Legend items={SERIES_ITEMS} />);
    const items = container.querySelectorAll(".sui-legend__item");
    expect(items.length).toBe(SERIES_ITEMS.length);
    expect(getByText("Revenue")).toBeTruthy();
    expect(getByText("Profit")).toBeTruthy();
    expect(getByText("Costs")).toBeTruthy();
  });

  it("applies the item color as inline background-color on the swatch", () => {
    const { container } = render(() => <Legend items={SERIES_ITEMS} />);
    const swatches = container.querySelectorAll(".sui-legend__swatch");
    expect(styleOf(swatches[0]!)).toMatch(/background-color:\s*#3b82f6/i);
    expect(styleOf(swatches[2]!)).toMatch(/background-color:\s*#f59e0b/i);
  });

  it("defaults to horizontal orientation", () => {
    const { container } = render(() => <Legend items={SERIES_ITEMS} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/sui-legend--horizontal/);
  });

  it("applies vertical modifier class when orientation=vertical", () => {
    const { container } = render(() => (
      <Legend items={SERIES_ITEMS} orientation="vertical" />
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/sui-legend--vertical/);
  });

  it("forwards numeric swatchSize as a CSS custom property in px", () => {
    const { container } = render(() => <Legend items={SERIES_ITEMS} swatchSize={20} />);
    const root = container.firstElementChild as HTMLElement;
    expect(styleOf(root)).toMatch(/--sui-legend-swatch-size:\s*20px/);
  });

  it("forwards string swatchSize unchanged", () => {
    const { container } = render(() => (
      <Legend items={SERIES_ITEMS} swatchSize="1rem" />
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(styleOf(root)).toMatch(/--sui-legend-swatch-size:\s*1rem/);
  });

  it("appends a caller-supplied class", () => {
    const { container } = render(() => (
      <Legend items={SERIES_ITEMS} class="my-legend" />
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/my-legend/);
  });

  it("renders nothing in the list when items is empty", () => {
    const { container } = render(() => <Legend items={[]} />);
    const items = container.querySelectorAll(".sui-legend__item");
    expect(items.length).toBe(0);
  });
});
