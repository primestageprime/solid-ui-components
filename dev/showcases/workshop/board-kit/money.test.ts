/**
 * Board Kit — how the workshop writes a dollar.
 *
 * `abbreviateDollars` is the ONE rounding policy every bench's money words are
 * built on, so it is asserted here, at the shared home, rather than in each
 * board's own wording file. `hourly-board-money.test.ts` and the License
 * Board's tests assert the SENTENCES built on top of it; these are the digits
 * underneath them.
 *
 * ⚠ These expectations moved here byte-identical from the retired Scenario
 * Board's `scenario-board-money.test.ts` (2026-09-19). That file also covered
 * `dollarsPerYear`, `signedDollarsPerYear`, `againstBreakeven` and
 * `payrollShift` — the per-YEAR unit and the payroll/break-even wording, which
 * were the Scenario Board's own and have no surviving consumer, so they retired
 * with the bench rather than being carried over as untested orphans. The kit's
 * `dollarsPerUnit`/`signedDollarsPerUnit` are the surviving generalisation and
 * are exercised by `hourly.config.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { MINUS, abbreviateDollars } from "./model";

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
    // The pay figures the boards draw, before and after the switch to one
    // shared abbreviator: nothing about the dials' readouts may move.
    expect(abbreviateDollars(1_000)).toBe("$1k");
    expect(abbreviateDollars(80_000)).toBe("$80k");
    expect(abbreviateDollars(200_000)).toBe("$200k");
  });
});
