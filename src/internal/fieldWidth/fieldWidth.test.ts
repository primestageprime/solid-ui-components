import { describe, it, expect } from "vitest";
import {
  AVG_CHAR_REM,
  CURRENCY_DEFAULT_MAX,
  INPUT_DEFAULT_WIDTH_MAX,
  currencyMaxChars,
  fieldWidthForChars,
  numberFieldChars,
  numberFieldTextCh,
  tightNumberWidth,
} from "./fieldWidth";

describe("fieldWidthForChars", () => {
  it("is chars * AVG_CHAR_REM + chrome, rounded up to 2dp", () => {
    // 10 chars, no chrome → 10 * 0.62 = 6.2rem
    expect(fieldWidthForChars(10)).toBe(6.2);
    // 18 chars + 4rem chrome → 18*0.62 + 4 = 15.16rem
    expect(fieldWidthForChars(18, 4)).toBe(15.16);
  });

  it("rounds UP so the widest value never clips", () => {
    // 7 * 0.62 = 4.34 (exact); a fractional case rounds up.
    expect(fieldWidthForChars(7)).toBe(4.34);
    expect(AVG_CHAR_REM).toBeGreaterThan(0.5);
  });
});

describe("currencyMaxChars", () => {
  it("counts the symbol, grouped digits, decimal point and cents for $10B", () => {
    // "$10,000,000,000.00" = 18 characters.
    expect(currencyMaxChars(CURRENCY_DEFAULT_MAX)).toBe(18);
  });

  it("is narrower for smaller ceilings", () => {
    // "$1,000,000.00" = 13 characters.
    expect(currencyMaxChars(1_000_000)).toBe(13);
  });

  it("default ceiling is ten billion", () => {
    expect(CURRENCY_DEFAULT_MAX).toBe(10_000_000_000);
  });
});

describe("numberFieldChars", () => {
  it("sizes an unbounded field for one billion", () => {
    expect(numberFieldChars({ max: INPUT_DEFAULT_WIDTH_MAX })).toBe(13);
  });

  it("counts the longer of max and a negative min", () => {
    expect(numberFieldChars({ max: 100, min: -10_000 })).toBe(7);
  });

  it("adds the fraction digits a fractional step brings", () => {
    expect(numberFieldChars({ max: 100, step: 0.25 })).toBe(6);
    // A format that already shows them adds nothing.
    expect(
      numberFieldChars({
        max: 1e9,
        step: 0.01,
        formatOptions: { style: "currency", currency: "USD" },
      }),
    ).toBe(17);
  });

  it("honours a format that caps the fraction digits", () => {
    expect(
      numberFieldChars({
        max: 999,
        step: 0.5,
        formatOptions: { maximumFractionDigits: 0 },
      }),
    ).toBe(3);
  });
});

describe("tightNumberWidth", () => {
  const usd = { style: "currency", currency: "USD" } as const;

  it("counts a digit and the symbol as 1ch and a separator as 0.4", () => {
    // "$1,000,000,000.00": $ + 10 digits + 2 cents = 13ch, 3 commas + 1 point = 2ch.
    expect(numberFieldTextCh({ max: 1_000_000_000, formatOptions: usd })).toBe(14.6);
    expect(numberFieldTextCh({ max: 9_999 })).toBe(4.4);
  });

  it("is a calc in ch plus the stepper chrome, with half a ch of slack", () => {
    expect(tightNumberWidth({ max: 99 })).toBe("calc(2.5ch + 3.6rem)");
    expect(tightNumberWidth({ max: 1_000_000_000, formatOptions: usd })).toBe(
      "calc(15.1ch + 3.6rem)",
    );
  });

  it("is narrower than the generous rule at the same ceiling", () => {
    // 15.1ch is about 131px at 7.2px a digit; the generous rule reserves 14.54rem.
    expect(15.1 * 8.67 + 3.6 * 16).toBeLessThan(14.54 * 16);
  });
});
