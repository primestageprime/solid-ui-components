import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  type SlotStackSeries,
  type SlotStackSlot,
  SlotStackChart,
  SlotStackLegend,
  createSlotStackChart,
} from "./index";

const SVG_NS = "http://www.w3.org/2000/svg";
const MONTHS = ["Mar", "Apr"];

const slot = (
  period: number,
  expected: number,
  filled: number,
  unfilled: number,
  overflow: number,
): SlotStackSlot => ({ period, expected, filled, unfilled, overflow });

/* March is the mockup's mixed column; April is expectation only. */
const SERIES: readonly SlotStackSeries[] = [
  { id: "r", label: "Remodels", slots: [slot(0, 40, 40, 0, 15), slot(1, 35, 0, 35, 0)] },
  { id: "c", label: "Cabinets", slots: [slot(0, 30, 18, 12, 0), slot(1, 30, 0, 30, 0)] },
  { id: "d", label: "Deck Builds", slots: [slot(0, 20, 20, 0, 0), slot(1, 0, 0, 0, 0)] },
];

const mount = (series = SERIES, now?: number) =>
  render(() => (
    <SlotStackChart
      series={series}
      periods={[0, 1]}
      periodLabel={(p) => MONTHS[p] ?? ""}
      valueFormat={(v) => `$${v}k`}
      now={now}
    />
  ));

const count = (container: HTMLElement, selector: string): number =>
  container.querySelectorAll(selector).length;

describe("SlotStackChart", () => {
  it("draws each slot's parts: fills, dashed containers and heavy overflow borders", () => {
    const { container } = mount();
    // Three solid fills in March, one hatched overflow.
    expect(count(container, '.sui-slot-stack__fill[data-part="filled"]')).toBe(3);
    expect(count(container, '.sui-slot-stack__fill[data-part="overflow"]')).toBe(1);
    // Cabinets in March, and both April containers, are still dashed.
    expect(count(container, ".sui-slot-stack__dashed")).toBe(3);
    expect(count(container, ".sui-slot-stack__unfilled")).toBe(3);
    // Only Remodels overflows.
    expect(count(container, ".sui-slot-stack__heavy")).toBe(1);
    // A fill's border is solid; the two empty April containers have none.
    expect(count(container, ".sui-slot-stack__solid")).toBe(3);
  });

  it("paints the overflow with the series' own hatch and the fill with its colour", () => {
    const { container } = mount();
    const overflow = container.querySelector('.sui-slot-stack__fill[data-part="overflow"]');
    const pattern = overflow?.getAttribute("fill")?.match(/^url\(#(.+)\)$/)?.[1];
    expect(pattern).toBeDefined();
    expect(container.querySelector(`pattern[id="${pattern}"]`)).not.toBeNull();
    const fills = [...container.querySelectorAll('.sui-slot-stack__fill[data-part="filled"]')];
    expect(fills.map((f) => f.getAttribute("fill"))).toEqual([
      "var(--sui-series-1, currentColor)",
      "var(--sui-series-2, currentColor)",
      "var(--sui-series-3, currentColor)",
    ]);
  });

  it("says each part under the pointer, as SVG titles", () => {
    document.title = "Page";
    const { container } = mount();
    const titles = [...container.querySelectorAll(".sui-slot-stack title")];
    expect(titles.every((t) => t.namespaceURI === SVG_NS)).toBe(true);
    expect(titles.map((t) => t.textContent)).toEqual(
      expect.arrayContaining([
        "Remodels · Mar: $40k filled ($40k expected)",
        "Remodels · Mar: $15k above expected",
        "Cabinets · Mar: $12k not yet filled ($30k expected)",
        "Remodels · Apr: $35k not yet filled ($35k expected)",
      ]),
    );
    expect(document.title).toBe("Page");
  });

  it("is read-only: nothing focusable, no control, no grip", () => {
    const { container } = mount();
    expect(count(container, "[tabindex], [role='button'], [role='slider'], button, input, a")).toBe(0);
    expect(count(container, ".sui-chart__value-handle, .sui-chart__bar--interactive")).toBe(0);
  });

  it("draws the status sub-fills when a slot states them", () => {
    const { container } = mount([
      {
        id: "r",
        label: "Remodels",
        slots: [
          {
            ...slot(0, 40, 40, 0, 10),
            filledByClass: { invoiced: 20, confirmed: 12, planned: 8 },
            overflowByClass: { invoiced: 0, confirmed: 10, planned: 0 },
          },
        ],
      },
    ]);
    const statuses = [...container.querySelectorAll(".sui-slot-stack__fill")].map(
      (f) => `${f.getAttribute("data-part")}:${f.getAttribute("data-status")}`,
    );
    expect(statuses).toEqual([
      "filled:invoiced",
      "filled:confirmed",
      "filled:planned",
      "overflow:confirmed",
    ]);
    expect(container.querySelector(".sui-slot-stack title")?.textContent).toBe(
      "Remodels · Mar: $20k filled, invoiced ($40k expected)",
    );
  });

  it("draws the NOW rule only when asked, the first period included", () => {
    expect(mount().container.textContent).not.toContain("now");
    expect(mount(SERIES, 0).container.textContent).toContain("now");
    expect(mount(SERIES, 7).container.textContent).not.toContain("now");
  });

  it("draws an empty chart for no data", () => {
    const { container } = mount([]);
    expect(count(container, "svg")).toBe(1);
    expect(count(container, ".sui-slot-stack rect")).toBe(0);
  });

  it("createSlotStackChart curries a screen's words", () => {
    const Dollars = createSlotStackChart({
      words: { filled: "arrived", unfilled: "still projected" },
      nowLabel: "today",
    });
    const { container } = render(() => (
      <Dollars
        series={SERIES}
        periods={[0, 1]}
        periodLabel={(p) => MONTHS[p] ?? ""}
        valueFormat={(v) => `$${v}k`}
        now={0.5}
      />
    ));
    const texts = [...container.querySelectorAll(".sui-slot-stack title")].map((t) => t.textContent);
    expect(texts).toContain("Cabinets · Mar: $18k arrived ($30k expected)");
    expect(texts).toContain("Cabinets · Mar: $12k still projected ($30k expected)");
    expect(container.textContent).toContain("today");
  });
});

describe("SlotStackLegend", () => {
  it("names the series, then the three marks, drawn by the chart's own mark", () => {
    const { container } = render(() => <SlotStackLegend series={SERIES} />);
    for (const label of [
      "Remodels",
      "Cabinets",
      "Deck Builds",
      "Solid = filled",
      "Dashed = not yet filled",
      "Striped, heavy border = above expected",
    ])
      expect(container.textContent).toContain(label);
    expect(container.textContent).not.toContain("Translucent");
    expect(count(container, ".sui-slot-stack__dashed")).toBe(1);
    expect(count(container, ".sui-slot-stack__heavy")).toBe(1);
    expect(count(container, "[tabindex], button")).toBe(0);
  });

  it("adds the statuses when asked, in the screen's words", () => {
    const { container } = render(() => (
      <SlotStackLegend series={SERIES} statuses words={{ confirmed: "signed" }} />
    ));
    expect(container.textContent).toContain("Translucent = signed");
    expect(container.textContent).toContain("Lighter = planned");
  });
});
