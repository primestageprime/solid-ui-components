// Headless observation of the strip rules: pure functions, printed as tables.
import { describe, expect, it } from "vitest";
import {
  CADENCE_SHAPES,
  type CadenceValue,
  MAX_GRID_DAY,
  PERIODS_PER_YEAR,
  anchorText,
  cadenceOfShape,
  isOrderedRange,
  isValidWindow,
  normalizeCadence,
  offeredShapes,
  paymentCents,
  perPaymentCents,
  setAmountRangeField,
  setWindowStart,
  setWindowUntil,
  unitsTotalCents,
} from "./values";

const range = { kind: "range", min: 800_000, typical: 1_000_000, max: 1_200_000 } as const;

describe("amount rules", () => {
  it("divides a year into payments half-even", () => {
    // $102,891.10 / 26 = $3,957.35 exactly; / 24 = 4287.129... cents; / 12.
    expect(perPaymentCents(10_289_110, 26)).toBe(395_735);
    expect(perPaymentCents(10_289_110, 24)).toBe(428_713);
    expect(perPaymentCents(10_289_110, 12)).toBe(857_426);
    // half-even: 5 / 2 = 2.5 -> 2, 7 / 2 = 3.5 -> 4.
    expect(perPaymentCents(5, 2)).toBe(2);
    expect(perPaymentCents(7, 2)).toBe(4);
  });

  it("a single amount per year derives its payment; per payment is as stated", () => {
    expect(paymentCents({ kind: "single", cents: 10_289_110, per: "year" }, 26)).toBe(395_735);
    expect(paymentCents({ kind: "single", cents: 1_000_000, per: "payment" }, 26)).toBe(1_000_000);
  });

  it("units bill units x price", () => {
    expect(unitsTotalCents({ kind: "units", units: 10, unitPrice: 5_000, perPeriod: 2 })).toBe(50_000);
  });

  it("a range stays ordered whichever field moves", () => {
    const rows = [
      ["min above typical", setAmountRangeField(range, "min", 1_100_000)],
      ["min above max", setAmountRangeField(range, "min", 1_500_000)],
      ["max below typical", setAmountRangeField(range, "max", 900_000)],
      ["max below min", setAmountRangeField(range, "max", 500_000)],
      ["typical below min", setAmountRangeField(range, "typical", 100_000)],
      ["typical above max", setAmountRangeField(range, "typical", 2_000_000)],
    ] as const;
    console.table(rows.map(([name, r]) => ({ name, min: r.min, typical: r.typical, max: r.max })));
    for (const [, r] of rows) expect(isOrderedRange(r)).toBe(true);
    expect(setAmountRangeField(range, "min", 1_100_000)).toEqual({
      kind: "range", min: 1_100_000, typical: 1_100_000, max: 1_200_000,
    });
    expect(setAmountRangeField(range, "max", 500_000)).toEqual({
      kind: "range", min: 500_000, typical: 500_000, max: 500_000,
    });
  });

  it("never goes negative", () => {
    expect(setAmountRangeField(range, "min", -5).min).toBe(0);
  });
});

describe("cadence rules", () => {
  it("every shape carries only its own anchor and prints compactly", () => {
    const rows = CADENCE_SHAPES.map((c) => {
      const v = cadenceOfShape(c.shape);
      return { shape: c.shape, anchor: c.anchor, shown: anchorText(v), periods: PERIODS_PER_YEAR[c.shape] };
    });
    console.table(rows);
    expect(anchorText({ shape: "annual", anchor: { month: 3, day: 15 } })).toBe("Mar 15");
    expect(anchorText({ shape: "monthly", anchor: "last" })).toBe("Last day");
    expect(anchorText({ shape: "monthly", anchor: 15 })).toBe("Day 15");
    expect(anchorText({ shape: "weekly", anchor: 1 })).toBe("Mon");
    expect(cadenceOfShape("semimonthly")).toEqual({ shape: "semimonthly" });
  });

  it("the day grid never passes 28 and 'last' is monthly only", () => {
    expect(MAX_GRID_DAY).toBe(28);
    expect(normalizeCadence({ shape: "monthly", anchor: 31 })).toEqual({ shape: "monthly", anchor: 28 });
    expect(normalizeCadence({ shape: "monthly", anchor: "last" })).toEqual({ shape: "monthly", anchor: "last" });
    expect(normalizeCadence({ shape: "annual", anchor: { month: 14, day: 31 } })).toEqual({
      shape: "annual", anchor: { month: 12, day: 28 },
    });
    expect(normalizeCadence({ shape: "weekly", anchor: 9 })).toEqual({ shape: "weekly", anchor: 6 });
  });

  it("changing shape keeps a date anchor between date shapes", () => {
    const quarterly: CadenceValue = { shape: "quarterly", anchor: "2026-08-28" };
    expect(cadenceOfShape("biweekly", quarterly)).toEqual({ shape: "biweekly", anchor: "2026-08-28" });
    expect(cadenceOfShape("monthly", quarterly)).toEqual({ shape: "monthly", anchor: 1 });
  });

  it("a kind narrows the offered shapes; nothing allowed means all eight", () => {
    expect(offeredShapes(["biweekly", "semimonthly", "monthly"]).map((c) => c.shape)).toEqual([
      "monthly", "semimonthly", "biweekly",
    ]);
    expect(offeredShapes(undefined)).toHaveLength(8);
    expect(offeredShapes([])).toHaveLength(8);
  });
});

describe("window rules", () => {
  it("start never passes until, and an empty side is open", () => {
    expect(setWindowStart({ until: "2027-06-30" }, "2027-09-01")).toEqual({
      start: "2027-09-01", until: "2027-09-01",
    });
    expect(setWindowUntil({ start: "2026-10-01" }, "2026-01-01")).toEqual({
      start: "2026-01-01", until: "2026-01-01",
    });
    expect(setWindowStart({ start: "2026-10-01", until: "2027-06-30" }, undefined)).toEqual({
      until: "2027-06-30",
    });
    expect(setWindowUntil({ start: "2026-10-01" }, "")).toEqual({ start: "2026-10-01" });
    expect(isValidWindow(setWindowStart({ until: "2027-01-01" }, "2030-01-01"))).toBe(true);
  });

  it("neither side is the whole line, one side a ray", () => {
    expect(isValidWindow({})).toBe(true);
    expect(isValidWindow({ start: "2026-01-01" })).toBe(true);
    expect(isValidWindow({ start: "2027-01-01", until: "2026-01-01" })).toBe(false);
  });
});
