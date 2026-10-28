import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import type { CashflowCell } from "../CashflowScrubChart";
import { dailyCells } from "../DateAxis";
import { ActualForecastChart, createActualForecastChart } from "./index";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

const cells: CashflowCell[] = dailyCells(d("2026-10-01"), d("2026-10-10")).map(
  (cell, i) => ({
    ...cell,
    cashflowCents: 1_000,
    balanceCents: 10_000 + i * 1_000,
  }),
);
const ANCHOR = 4;

const lines = (container: HTMLElement, modifier: string) =>
  container.querySelectorAll(
    `polyline.sui-cashflow-scrub-chart__line--${modifier}`,
  );

describe("ActualForecastChart", () => {
  it("hides the chart's own line and draws the two halves with their classes", () => {
    const { container } = render(() => (
      <ActualForecastChart
        cells={cells}
        anchorIndex={ANCHOR}
        range={(c) => ({
          minCents: c.balanceCents - 500,
          maxCents: c.balanceCents + 500,
        })}
        openingBalanceCents={14_000}
        floorCents={0}
        chartHeight={200}
      />
    ));
    expect(lines(container, "hidden").length).toBe(1);
    expect(lines(container, "actual").length).toBe(1);
    expect(lines(container, "projected").length).toBe(1);
    expect(lines(container, "range-edge").length).toBe(2);
    expect(lines(container, "opening").length).toBe(1);
    expect(lines(container, "floor").length).toBe(1);
    expect(
      container.querySelectorAll(
        ".sui-cashflow-scrub-chart__band--range",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("stands the anchor rule on the anchor cell with its caption", () => {
    const { container } = render(() => (
      <ActualForecastChart
        cells={cells}
        anchorIndex={ANCHOR}
        chartHeight={200}
      />
    ));
    const rule = container.querySelector(
      ".sui-cashflow-scrub-chart__marker--rule",
    );
    expect(rule).not.toBeNull();
    expect(rule?.textContent).toContain("Today");
  });

  it("draws no cone and no rules when none are stated", () => {
    const { container } = render(() => (
      <ActualForecastChart
        cells={cells}
        anchorIndex={ANCHOR}
        chartHeight={200}
      />
    ));
    expect(lines(container, "range-edge").length).toBe(0);
    expect(lines(container, "opening").length).toBe(0);
    expect(lines(container, "floor").length).toBe(0);
  });

  it("takes the words it is curried with", () => {
    const Curried = createActualForecastChart({ labels: { anchor: "Now" } });
    const { container } = render(() => (
      <Curried cells={cells} anchorIndex={ANCHOR} chartHeight={200} />
    ));
    expect(
      container.querySelector(".sui-cashflow-scrub-chart__marker--rule")
        ?.textContent,
    ).toContain("Now");
  });
});
