import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { BalanceReviewChart } from "./BalanceReviewChart";

const day = (d: number) => new Date(Date.UTC(2026, 8, d));
const ACTUAL = [1, 2, 3, 4, 5].map((d) => ({ date: day(d), value: 100_000 + d * 1000 }));
const FORECAST = [3, 4, 5].map((d) => ({ date: day(d), value: 104_000 }));
/** A flat line: a caption beside its last point crosses it, so the caption falls to the gutter. */
const FLAT = [1, 2, 3, 4, 5].map((d) => ({ date: day(d), value: 105_000 }));
const VARIANCE = [
  { date: day(4), value: 1000, kind: "revenue" as const },
  { date: day(5), value: -500, kind: "costs" as const },
];
const fmt = (v: number) => `$${Math.round(v / 1000)}k`;
const SIZE = { width: 880, height: 386 };

describe("BalanceReviewChart", () => {
  it("draws the actual line solid and the forecast dashed from its first day", () => {
    const { container } = render(() => (
      <BalanceReviewChart actual={ACTUAL} forecast={FORECAST} xDomain={[day(1), day(5)]} valueFormat={fmt} size={SIZE} />
    ));
    const lines = container.querySelectorAll(".sui-chart__line");
    expect(lines.length).toBe(2);
    expect(lines[0]!.getAttribute("stroke-dasharray")).toBe("5 4");
    expect(lines[1]!.getAttribute("stroke-dasharray")).toBeNull();
  });

  it("puts the floor at the chart's bottom and draws its rule and caption", () => {
    const { container } = render(() => (
      <BalanceReviewChart actual={ACTUAL} floor={0} xDomain={[day(1), day(5)]} valueFormat={fmt} labels={{ floor: "floor" }} size={SIZE} />
    ));
    expect(container.textContent).toContain("floor");
    const ticks = [...container.querySelectorAll(".sui-chart__axis-label")].map((t) => t.textContent);
    expect(ticks).toContain("$0k");
  });

  it("hosts the strip under the plot only when variance is given, and pushes the x labels below it", () => {
    const without = render(() => (
      <BalanceReviewChart actual={ACTUAL} xDomain={[day(1), day(5)]} valueFormat={fmt} size={SIZE} />
    ));
    expect(without.container.querySelector(".sui-variance-strip")).toBeNull();
    const withStrip = render(() => (
      <BalanceReviewChart actual={ACTUAL} forecast={FORECAST} variance={VARIANCE} xDomain={[day(1), day(5)]} valueFormat={fmt} labels={{ strip: "by day" }} size={SIZE} />
    ));
    expect(withStrip.container.querySelectorAll(".sui-variance-strip__bar").length).toBe(2);
    expect(withStrip.container.textContent).toContain("by day");
  });

  it("captions the marks and the line ends through the label ladder", () => {
    const { container } = render(() => (
      <BalanceReviewChart
        actual={ACTUAL}
        forecast={FORECAST}
        marks={[{ date: day(2), value: 102_000, label: "Sep 2 Regus −$18k" }]}
        endLabels={{ actual: "$105k today", forecast: "$104k forecast" }}
        xDomain={[day(1), day(5)]}
        valueFormat={fmt}
        size={SIZE}
      />
    ));
    expect(container.textContent).toContain("Sep 2 Regus −$18k");
    expect(container.textContent).toContain("$105k today");
    expect(container.textContent).toContain("$104k forecast");
    expect(container.querySelectorAll(".sui-chart__point, circle").length).toBeGreaterThan(0);
  });

  it("spans the two ends with a bracket and captions the gap when asked", () => {
    const { container } = render(() => (
      <BalanceReviewChart
        actual={ACTUAL}
        forecast={FORECAST}
        endLabels={{ actual: "$105k today", forecast: "$104k forecast", gap: "+$1k vs forecast" }}
        xDomain={[day(1), day(5)]}
        valueFormat={fmt}
        size={SIZE}
      />
    ));
    expect(container.querySelector(".sui-chart__gap-bracket")).not.toBeNull();
    expect(container.textContent).toContain("+$1k vs forecast");
    const texts = [...container.querySelectorAll(".sui-chart__label--right")];
    expect(texts.length).toBe(3);
    // Three gutter captions, three distinct rows: none sits on another.
    const ys = new Set(texts.map((t) => t.getAttribute("y")));
    expect(ys.size).toBe(3);
  });

  it("keeps the end captions on their own rows when mark captions fall to the gutter", () => {
    const { container } = render(() => (
      <BalanceReviewChart
        actual={FLAT}
        forecast={FORECAST}
        marks={[{ date: day(5), value: 105_000, label: "Sep 5 Regus −$18k" }]}
        endLabels={{ actual: "$105k today", forecast: "$104k forecast" }}
        xDomain={[day(1), day(5)]}
        valueFormat={fmt}
        size={SIZE}
      />
    ));
    const texts = [...container.querySelectorAll(".sui-chart__label--right")];
    const today = texts.find((t) => t.textContent === "$105k today")!;
    const mark = texts.find((t) => t.textContent?.startsWith("Sep 5"))!;
    // Both reach the gutter; the end caption keeps the row at the line's end.
    expect(mark).toBeDefined();
    expect(today.classList.contains("sui-chart__label--right")).toBe(true);
    const ys = new Set(texts.map((t) => t.getAttribute("y")));
    expect(ys.size).toBe(texts.length);
    expect(Number(mark.getAttribute("y"))).not.toBe(Number(today.getAttribute("y")));
  });

  it("draws no bracket without a gap caption, or when the ends coincide", () => {
    const none = render(() => (
      <BalanceReviewChart actual={ACTUAL} forecast={FORECAST} endLabels={{ actual: "a", forecast: "f" }} xDomain={[day(1), day(5)]} valueFormat={fmt} size={SIZE} />
    ));
    expect(none.container.querySelector(".sui-chart__gap-bracket")).toBeNull();
    const same = render(() => (
      <BalanceReviewChart actual={ACTUAL} forecast={[{ date: day(5), value: 105_000 }]} endLabels={{ gap: "level" }} xDomain={[day(1), day(5)]} valueFormat={fmt} size={SIZE} />
    ));
    expect(same.container.querySelector(".sui-chart__gap-bracket")).toBeNull();
  });

  it("draws the forecast band as one filled range in the forecast line's colour", () => {
    const band = [3, 4, 5].map((d) => ({ date: day(d), min: 101_000, max: 107_000 }));
    const { container } = render(() => (
      <BalanceReviewChart
        actual={ACTUAL}
        forecast={FORECAST}
        forecastBand={band}
        colors={{ forecast: "teal" }}
        xDomain={[day(1), day(5)]}
        valueFormat={fmt}
        size={SIZE}
      />
    ));
    const areas = container.querySelectorAll(".sui-balance-review__forecast-band");
    expect(areas.length).toBe(1);
    expect(areas[0]!.getAttribute("fill")).toBe("teal");
    expect(areas[0]!.getAttribute("d")).toMatch(/Z$/);
  });

  it("draws no band without one, or with an empty one", () => {
    const without = render(() => (
      <BalanceReviewChart actual={ACTUAL} forecast={FORECAST} xDomain={[day(1), day(5)]} valueFormat={fmt} size={SIZE} />
    ));
    expect(without.container.querySelector(".sui-balance-review__forecast-band")).toBeNull();
    const empty = render(() => (
      <BalanceReviewChart actual={ACTUAL} forecast={FORECAST} forecastBand={[]} xDomain={[day(1), day(5)]} valueFormat={fmt} size={SIZE} />
    ));
    expect(empty.container.querySelector(".sui-balance-review__forecast-band")).toBeNull();
  });

  it("fits the band inside the y axis", () => {
    const band = [3, 4, 5].map((d) => ({ date: day(d), min: 104_000, max: 300_000 }));
    const { container } = render(() => (
      <BalanceReviewChart actual={ACTUAL} forecast={FORECAST} forecastBand={band} floor={0} xDomain={[day(1), day(5)]} valueFormat={fmt} size={SIZE} />
    ));
    const ticks = [...container.querySelectorAll(".sui-chart__axis-label")].map((t) => Number((t.textContent ?? "").replace(/[$k]/g, "")));
    expect(Math.max(...ticks.filter((t) => !Number.isNaN(t)))).toBeGreaterThanOrEqual(200);
  });
});
