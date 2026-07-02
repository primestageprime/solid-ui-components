import { describe, expect, it } from "vitest";
import { formatCompactNumber, formatGroupedNumber } from "./number";

describe("formatGroupedNumber", () => {
  it("groups thousands en-US style with no fraction digits by default", () => {
    expect(formatGroupedNumber(1_234_567)).toBe("1,234,567");
    expect(formatGroupedNumber(0)).toBe("0");
    expect(formatGroupedNumber(-1_234)).toBe("-1,234");
  });

  it("rounds to the integer when fraction digits default to zero", () => {
    expect(formatGroupedNumber(1234.5)).toBe("1,235");
  });

  it("caps fraction digits without padding trailing zeros", () => {
    expect(formatGroupedNumber(12.34, 1)).toBe("12.3");
    expect(formatGroupedNumber(12, 1)).toBe("12");
  });
});

describe("formatCompactNumber", () => {
  it("renders millions with one fraction digit and an M suffix", () => {
    expect(formatCompactNumber(1_234_567)).toBe("1.2M");
    expect(formatCompactNumber(1_000_000)).toBe("1M");
    expect(formatCompactNumber(1_500_000)).toBe("1.5M");
  });

  it("renders thousands with one fraction digit and a k suffix", () => {
    expect(formatCompactNumber(3_400)).toBe("3.4k");
    expect(formatCompactNumber(1_000)).toBe("1k");
  });

  it("renders sub-thousand values as grouped integers", () => {
    expect(formatCompactNumber(999)).toBe("999");
    expect(formatCompactNumber(0)).toBe("0");
  });

  it("passes the sign through each magnitude tier", () => {
    expect(formatCompactNumber(-1_234_567)).toBe("-1.2M");
    expect(formatCompactNumber(-3_400)).toBe("-3.4k");
    expect(formatCompactNumber(-500)).toBe("-500");
  });

  it("keeps the pre-extraction edge behavior just under a tier boundary", () => {
    // 999,999 rounds up within the k tier rather than promoting to M —
    // preserved verbatim from CashflowScrubChart's fmtAxisDollars.
    expect(formatCompactNumber(999_999)).toBe("1,000k");
  });
});
