/**
 * RTH receivables — the expectation model, observed headlessly. Each preset
 * prints its series and per-invoice table, so the numbers can be checked
 * without the chart.
 */
import { describe, expect, it } from "vitest";
import { INVOICES, LAST_DATA, PAYMENTS } from "./rth-receivables.fixtures";
import {
  deviationSeries,
  driftOf,
  dotsOf,
  expectationTable,
  expectations,
  isoOf,
  seriesTable,
  signedMoney,
  slotsOf,
  stepsOf,
  xRange,
} from "./rth-receivables.model";

const run = (terms: number) => {
  const exps = expectations(INVOICES, PAYMENTS, terms, LAST_DATA);
  const series = deviationSeries(stepsOf(exps, PAYMENTS, LAST_DATA), LAST_DATA);
  return { exps, series };
};

describe("Net 30", () => {
  const { exps, series } = run(30);

  it("prints the series and the invoices", () => {
    console.log(
      `\nNet 30\n${seriesTable(series)}\n\n${expectationTable(exps)}\n`,
    );
  });

  it("steps down at each expected date and back up at the payment", () => {
    expect(series.map((p) => [isoOf(p.x), p.y])).toEqual([
      ["2026-04-01", 0],
      ["2026-05-28", -27_990],
      ["2026-06-16", 0],
      ["2026-08-23", -21_060],
      ["2026-09-10", -28_260],
      ["2026-09-23", -28_260],
    ]);
  });

  it("drifts by the whole open total, ends at last data, and the axis runs 4 days past it", () => {
    expect(driftOf(series)).toBe(-28_260);
    expect(signedMoney(driftOf(series))).toBe("−$28,260.00");
    expect(isoOf(xRange(LAST_DATA)[1])).toBe("2026-09-27");
  });

  it("marks the open invoices overdue at last data", () => {
    expect(exps.map((e) => [e.id, e.status, e.daysOverdue])).toEqual([
      ["1151", "paid", 0],
      ["1158", "overdue", 31],
      ["1159", "overdue", 31],
      ["1163", "overdue", 13],
    ]);
  });

  it("fills the paid slot, leaves the open ones empty, and dots the late payment", () => {
    expect(slotsOf(exps, LAST_DATA).map((s) => s.state)).toEqual([
      "filled",
      "empty",
      "empty",
      "empty",
    ]);
    expect(dotsOf(exps, PAYMENTS, LAST_DATA).map((d) => d.timing)).toEqual([
      "19d late",
    ]);
  });
});

describe("observed lag (49 days)", () => {
  const { exps, series } = run(49);

  it("prints the series and the invoices", () => {
    console.log(
      `\nObserved lag 49d\n${seriesTable(series)}\n\n${expectationTable(exps)}\n`,
    );
  });

  it("nets 1151 to zero on its own day and leaves 1163 not yet due", () => {
    expect(series.map((p) => [isoOf(p.x), p.y])).toEqual([
      ["2026-04-01", 0],
      ["2026-06-16", 0],
      ["2026-09-11", -21_060],
      ["2026-09-23", -21_060],
    ]);
    expect(exps.map((e) => e.status)).toEqual([
      "paid",
      "overdue",
      "overdue",
      "due",
    ]);
    expect(slotsOf(exps, LAST_DATA).map((s) => s.id)).toEqual([
      "1151",
      "1158",
      "1159",
    ]);
  });
});
