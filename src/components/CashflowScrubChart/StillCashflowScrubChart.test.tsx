// StillCashflowScrubChart — the final frame at once, on every data change.
//
// Two charts get the same swap: the fitted extent jumps from [0, 100k] to
// [0, 1M] on one render. The default chart eases its axis toward the new
// domain over 240ms, so on the frame of the swap the axis STILL SHOWS the old
// one; the still variant shows the new one on that same frame. The domain is
// read back off the marks (zero line, selected dot, selected rule) so no
// assertion reads page text. The rAF loop itself is yDomainTween.test.ts's.
import { describe, expect, it } from "vitest";
import { createSignal } from "solid-js";
import { render } from "@solidjs/testing-library";
import {
  CashflowScrubChart,
  StillCashflowScrubChart,
  createCashflowScrubChart,
  type CashflowCell,
} from "./CashflowScrubChart";
import { dailyCells } from "../DateAxis";

const d = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

/** Ten days climbing by `step` cents a day, so the extent is known. */
const climbing = (step: number): CashflowCell[] =>
  dailyCells(d("2026-05-01"), d("2026-05-10")).map((cell, i) => ({
    ...cell,
    cashflowCents: step,
    balanceCents: step * (i + 1),
  }));

const resolvedMax = (container: HTMLElement, selectedBalance: number): number => {
  const attr = (selector: string, name: string): number =>
    Number(container.querySelector(selector)!.getAttribute(name));
  const zeroY = attr(".sui-cashflow-scrub-chart__zero-line", "y1");
  const dotY = attr(".sui-cashflow-scrub-chart__selected-dot", "cy");
  const perCent = (dotY - zeroY) / selectedBalance;
  const plotTop = attr(".sui-cashflow-scrub-chart__selected-rule", "y1");
  return (plotTop - zeroY) / perCent;
};

const SMALL = 10_000; // extent [0, 100k]
const LARGE = 100_000; // extent [0, 1M]

const mount = (Chart: typeof CashflowScrubChart) => {
  const [step, setStep] = createSignal(SMALL);
  const { container } = render(() => (
    <Chart
      cells={climbing(step())}
      selected={9}
      yFitDomain={() => [0, step() * 10]}
      yFitMargin={0}
    />
  ));
  return { container, swap: () => setStep(LARGE) };
};

describe("StillCashflowScrubChart", () => {
  it("shows the new domain on the frame the data changes", () => {
    const chart = mount(StillCashflowScrubChart as typeof CashflowScrubChart);
    expect(resolvedMax(chart.container, SMALL * 10)).toBeCloseTo(100_000, 3);
    chart.swap();
    expect(resolvedMax(chart.container, LARGE * 10)).toBeCloseTo(1_000_000, 3);
  });

  it("is what separates it from the default chart, which eases there", () => {
    const chart = mount(CashflowScrubChart);
    chart.swap();
    // The axis still maps through the OLD domain on the swap frame: the dot
    // for a $1M balance lands ten times past the plot top, so the resolved
    // max reads as the old 100k, not the new 1M.
    expect(resolvedMax(chart.container, LARGE * 10)).toBeCloseTo(100_000, 3);
  });

  it("is a curried variant of createCashflowScrubChart", () => {
    const Own = createCashflowScrubChart({ yFitTransition: false });
    const chart = mount(Own as typeof CashflowScrubChart);
    chart.swap();
    expect(resolvedMax(chart.container, LARGE * 10)).toBeCloseTo(1_000_000, 3);
  });
});
