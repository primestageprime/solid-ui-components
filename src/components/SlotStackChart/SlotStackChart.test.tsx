import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
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
  it("draws each slot's parts: fills, dashed containers and a borderless overflow", () => {
    const { container } = mount();
    // Three solid fills in March, one hatched overflow.
    expect(count(container, '.sui-slot-stack__fill[data-part="filled"]')).toBe(3);
    expect(count(container, '.sui-slot-stack__fill[data-part="overflow"]')).toBe(1);
    // Cabinets in March, and both April containers, are still dashed.
    expect(count(container, ".sui-slot-stack__dashed")).toBe(3);
    expect(count(container, ".sui-slot-stack__unfilled")).toBe(3);
    // Remodels overflows, and nothing outlines it: the only paths are the
    // three solid fill borders and the three dashed containers.
    expect(count(container, ".sui-slot-stack__solid")).toBe(3);
    expect(count(container, ".sui-slot-stack path")).toBe(6);
  });

  describe("two states: the column's two values at rest, its series under the pointer", () => {
    /* March nets to expected 90 / actual 93; April is expectation only. */
    const TOTALS = [slot(0, 90, 90, 0, 3), slot(1, 65, 0, 65, 0)];
    const mountTwo = (expand?: "hover" | "always" | "never") =>
      render(() => (
        <SlotStackChart
          series={SERIES}
          totals={TOTALS}
          expand={expand}
          periods={[0, 1]}
          periodLabel={(p) => MONTHS[p] ?? ""}
          valueFormat={(v) => `$${v}k`}
        />
      ));
    const slots = (container: HTMLElement): string[] =>
      [...container.querySelectorAll(".sui-slot-stack__slot")].map((s) => s.getAttribute("data-slot") ?? "");
    /* jsdom lays nothing out, so the chart draws at its 640 x 220 fallback:
       the plot runs from x 52 to 628, and each of the two periods is 288px. */
    const overMarch = { clientX: 52 + 144, clientY: 100 };
    const overApril = { clientX: 52 + 432, clientY: 100 };
    const tallest = (container: HTMLElement): number =>
      Math.min(
        ...[...container.querySelectorAll(".sui-slot-stack__fill, .sui-slot-stack__unfilled")].map((r) =>
          Number(r.getAttribute("y")),
        ),
      );

    it("at rest draws ONE slot per column, in the default blue", () => {
      const { container } = mountTwo();
      expect(slots(container)).toEqual(["total", "total"]);
      const fills = [...container.querySelectorAll(".sui-slot-stack__fill")];
      expect(fills.map((f) => f.getAttribute("data-part"))).toEqual(["filled", "overflow"]);
      expect(fills[0].getAttribute("fill")).toBe("var(--sui-accent)");
      const texts = [...container.querySelectorAll(".sui-slot-stack title")].map((t) => t.textContent);
      expect(texts).toEqual([
        "Total · Mar: $90k filled ($90k expected)",
        "Total · Mar: $3k above expected",
        "Total · Apr: $65k not yet filled ($65k expected)",
      ]);
    });

    it("breaks the hovered column, and only it, into its series; leaving restores it", () => {
      const { container } = mountTwo();
      const svg = container.querySelector("svg") as SVGSVGElement;
      fireEvent.pointerMove(svg, overMarch);
      expect(slots(container)).toEqual(["series", "series", "series", "total"]);
      expect(
        [...container.querySelectorAll('.sui-slot-stack__fill[data-part="filled"]')].map((f) => f.getAttribute("fill")),
      ).toEqual([
        "var(--sui-series-1, currentColor)",
        "var(--sui-series-2, currentColor)",
        "var(--sui-series-3, currentColor)",
      ]);
      fireEvent.pointerMove(svg, overApril);
      expect(slots(container)).toEqual(["series", "series", "total"]);
      fireEvent.pointerLeave(svg);
      expect(slots(container)).toEqual(["total", "total"]);
    });

    it("does not hold the column's height: March stands taller as series (105) than as two values (93)", () => {
      const { container } = mountTwo();
      const svg = container.querySelector("svg") as SVGSVGElement;
      const atRest = tallest(container);
      const axisText = (): string[] =>
        [...container.querySelectorAll("svg text")].map((t) => t.textContent ?? "");
      const ticksAtRest = axisText();
      expect(ticksAtRest).toContain("$150k");
      fireEvent.pointerMove(svg, overMarch);
      expect(tallest(container)).toBeLessThan(atRest);
      // The y axis is fitted to the taller state, so its labels do not move.
      expect(axisText()).toEqual(ticksAtRest);
    });

    it("expand 'always' and 'never' ignore the pointer", () => {
      const always = mountTwo("always").container;
      expect(slots(always)).toEqual(["series", "series", "series", "series", "series"]);
      const never = mountTwo("never").container;
      fireEvent.pointerMove(never.querySelector("svg") as SVGSVGElement, overMarch);
      expect(slots(never)).toEqual(["total", "total"]);
    });

    it("hovering adds nothing focusable and no control", () => {
      const { container } = mountTwo();
      fireEvent.pointerMove(container.querySelector("svg") as SVGSVGElement, overMarch);
      expect(count(container, "[tabindex], [role='button'], [role='slider'], button, input, a")).toBe(0);
    });
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
    expect(count(container, ".sui-slot-stack__slot")).toBe(0);
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
      "Striped = above expected",
    ])
      expect(container.textContent).toContain(label);
    expect(container.textContent).not.toContain("Translucent");
    expect(count(container, ".sui-slot-stack__dashed")).toBe(1);
    expect(count(container, '.sui-slot-stack__fill[data-part="overflow"]')).toBe(1);
    expect(container.textContent).not.toContain("heavy");
    expect(count(container, "[tabindex], button")).toBe(0);
  });

  it("adds the statuses when asked, in the screen's words", () => {
    const { container } = render(() => (
      <SlotStackLegend series={SERIES} statuses words={{ confirmed: "signed" }} />
    ));
    expect(container.textContent).toContain("Translucent = signed");
    expect(container.textContent).toContain("Lighter = planned");
  });

  it("draws its marks in the column's paint: the default blue, or the chart's totalPaint", () => {
    const solidOf = (container: HTMLElement) =>
      container.querySelector(".sui-slot-stack__fill")?.getAttribute("fill");
    expect(solidOf(render(() => <SlotStackLegend series={SERIES} />).container)).toBe("var(--sui-accent)");
    const custom = render(() => <SlotStackLegend series={SERIES} totalPaint="ink-total" />).container;
    expect(solidOf(custom)).toBe("ink-total");
    expect(custom.querySelector(".sui-slot-stack__dashed")?.getAttribute("stroke")).toBe("ink-total");
  });
});

describe("createSlotStackChart", () => {
  it("curries the column's paint", () => {
    const Green = createSlotStackChart({ totalPaint: "ink-total" });
    const { container } = render(() => (
      <Green
        series={SERIES}
        totals={[slot(0, 90, 90, 0, 3)]}
        periods={[0]}
        periodLabel={() => "Mar"}
        valueFormat={(v) => `$${v}k`}
      />
    ));
    expect(container.querySelector(".sui-slot-stack__fill")?.getAttribute("fill")).toBe("ink-total");
  });
});
