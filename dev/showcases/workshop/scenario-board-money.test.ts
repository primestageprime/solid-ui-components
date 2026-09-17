import { describe, it, expect } from "vitest";
import {
  MINUS,
  againstBreakeven,
  payrollShift,
  abbreviateDollars,
  dollarsPerYear,
  signedDollarsPerYear,
} from "./scenario-board-money";

describe("abbreviated dollars", () => {
  // Peter's four examples, 2026-09-16, verbatim.
  it("writes Peter's examples exactly", () => {
    expect(abbreviateDollars(8_500)).toBe("$8.5k");
    expect(abbreviateDollars(60_000)).toBe("$60k");
    expect(abbreviateDollars(1_200_000)).toBe("$1.2M");
    expect(abbreviateDollars(999)).toBe("$999");
  });

  // The sign is a REAL minus and it sits before the `$`, never between the
  // symbol and its digits.
  it("signs a negative with U+2212, ahead of the dollar sign", () => {
    expect(abbreviateDollars(-8_500)).toBe(`${MINUS}$8.5k`);
    expect(MINUS).toBe("−");
    expect(MINUS).not.toBe("-");
  });

  it("leaves zero unsigned", () => {
    // A signed zero would name a direction that did not happen.
    expect(abbreviateDollars(0)).toBe("$0");
  });

  it("drops a trailing zero rather than padding it", () => {
    // `$60k`, not `$60.0k` — the tier's precision is a cap, not a width.
    expect(abbreviateDollars(60_000)).not.toContain(".0");
    expect(abbreviateDollars(104_000)).toBe("$104k");
    expect(abbreviateDollars(95_500)).toBe("$95.5k");
  });

  it("keeps the dials' own figures reading as they always have", () => {
    // The pay figures the scenario board draws, before and after the switch to
    // one shared abbreviator: nothing about the dials' readouts may move.
    expect(abbreviateDollars(1_000)).toBe("$1k");
    expect(abbreviateDollars(80_000)).toBe("$80k");
    expect(abbreviateDollars(200_000)).toBe("$200k");
  });
});

describe("dollars as a rate", () => {
  it("spells the unit once", () => {
    expect(dollarsPerYear(60_000)).toBe("$60k/yr");
    expect(dollarsPerYear(-40_000)).toBe(`${MINUS}$40k/yr`);
  });

  // The plus is not decoration: a reading that names a CHANGE says which way,
  // and one that names an AMOUNT must not.
  it("signs a change and leaves an amount alone", () => {
    expect(signedDollarsPerYear(20_000)).toBe("+$20k/yr");
    expect(signedDollarsPerYear(-20_000)).toBe(`${MINUS}$20k/yr`);
    expect(signedDollarsPerYear(0)).toBe("+$0/yr");
    expect(dollarsPerYear(20_000)).toBe("$20k/yr");
  });
});

// `RateGauge` supplies no words around these, so what the callouts SAY is the
// board's own sentence and belongs under test.
describe("the gauge's sentences", () => {
  it("says where a rate stands against break-even", () => {
    expect(againstBreakeven(60_000)).toBe("$60k/yr over breakeven");
    expect(againstBreakeven(-180_000)).toBe("$180k/yr below breakeven");
  });

  it("gives zero its own sentence", () => {
    // "$0/yr over breakeven" is true and unreadable.
    expect(againstBreakeven(0)).toBe("at breakeven");
  });

  // The sign flips on purpose: the gauge hands over a change in the RATE, and
  // a rate that falls is payroll that rises.
  it("reads a rate drop as money going TO payroll", () => {
    expect(payrollShift(-20_000)).toBe("$20k/yr to payroll");
  });

  it("reads a rate rise as money coming OFF payroll", () => {
    expect(payrollShift(20_000)).toBe("$20k/yr off payroll");
  });

  it("never prints a sign, because the words carry the direction", () => {
    expect(payrollShift(-20_000)).not.toContain(MINUS);
    expect(payrollShift(20_000)).not.toContain("+");
    expect(payrollShift(0)).toBe("no change to payroll");
  });

  // The four calibration readings, as the gauge will actually say them.
  it("reads the calibration table in words", () => {
    expect(againstBreakeven(60_000)).toBe("$60k/yr over breakeven");
    expect(againstBreakeven(40_000)).toBe("$40k/yr over breakeven");
    expect(againstBreakeven(20_000)).toBe("$20k/yr over breakeven");
    expect(againstBreakeven(-180_000)).toBe("$180k/yr below breakeven");
    expect(payrollShift(-240_000)).toBe("$240k/yr to payroll");
  });
});
