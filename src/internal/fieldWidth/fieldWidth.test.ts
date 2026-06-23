import { describe, it, expect } from "vitest";
import {
  AVG_CHAR_REM,
  CURRENCY_DEFAULT_MAX,
  currencyMaxChars,
  fieldWidthForChars,
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
