import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { BalanceReviewChart } from "./BalanceReviewChart";

const day = (d: number) => new Date(Date.UTC(2026, 8, d));
const ACTUAL = [1, 2, 3, 4, 5].map((d) => ({ date: day(d), value: 100_000 + d * 1000 }));
const FORECAST = [3, 4, 5].map((d) => ({ date: day(d), value: 104_000 }));
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
});
