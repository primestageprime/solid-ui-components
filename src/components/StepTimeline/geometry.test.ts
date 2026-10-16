import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatHour,
  hourStep,
  hourTicks,
  stepMutations,
  stepSeries,
  stepYDomain,
} from "./geometry";

const T = (hhmm: string): number => Date.parse(`2026-10-01T${hhmm}:00Z`);
const CANON_DOMAIN = [T("08:00"), T("18:00")] as const;

describe("hour ticks", () => {
  it("prints the canon's 08–18 row as a table: every 2h on the hour", () => {
    const rows = hourTicks(CANON_DOMAIN).map((at) => formatHour(at));
    // Printed for a human to read against the canon page's low-fi axis.
    console.table(rows);
    expect(rows).toEqual(["08", "10", "12", "14", "16", "18"]);
  });

  it("picks the smallest step that keeps the row to six ticks", () => {
    expect(hourStep([T("08:00"), T("12:00")])).toBe(1);
    expect(hourStep(CANON_DOMAIN)).toBe(2);
    expect(hourStep([T("00:00"), T("00:00") + 24 * 3_600_000])).toBe(4);
    expect(hourStep([T("00:00"), T("00:00") + 30 * 3_600_000])).toBe(6);
  });

  it("starts at the first whole step inside a ragged domain", () => {
    expect(hourTicks([T("08:20"), T("13:10")]).map(formatHour)).toEqual([
      "09",
      "10",
      "11",
      "12",
      "13",
    ]);
  });
});

describe("y range and labels", () => {
  it("runs to the caller's total, or to the series peak (at least 1)", () => {
    const series = [
      { t: T("08:00"), value: 0 },
      { t: T("09:40"), value: 2 },
    ];
    expect(stepYDomain(series, 4)).toEqual([0, 4]);
    expect(stepYDomain(series, undefined)).toEqual([0, 2]);
    expect(stepYDomain([], undefined)).toEqual([0, 1]);
  });

  it("labels whole counts only", () => {
    expect([0, 1.5, 3].map(formatCount)).toEqual(["0", "", "3"]);
  });
});

describe("adapters", () => {
  it("maps the series to one band and the markers to mutations, the kind joining the label", () => {
    expect(stepSeries([{ t: T("08:14"), value: 1 }])).toEqual([
      { id: "steps", label: "Steps done", points: [{ at: T("08:14"), value: 1 }] },
    ]);
    expect(
      stepMutations([
        { id: "m1", t: T("08:02"), label: "Step 1", kind: "started" },
        { id: "m2", t: T("08:14"), label: "Step 1" },
      ]),
    ).toEqual([
      { id: "m1", at: T("08:02"), label: "Step 1 · started" },
      { id: "m2", at: T("08:14"), label: "Step 1" },
    ]);
  });
});
