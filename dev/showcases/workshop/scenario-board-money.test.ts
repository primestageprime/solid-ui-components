import { describe, it, expect } from "vitest";
import {
  MINUS,
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
