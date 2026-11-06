import { describe, expect, it } from "vitest";
import { MONEY_SHIFT_MULTIPLIER, moneyStepFor, stepForAmount } from "./moneyStep";

const usd = (cents: number): string =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

describe("stepForAmount", () => {
  it("meets Peter's two anchors", () => {
    // hundreds → $1
    expect(stepForAmount(45_000)).toBe(100);
    // tens of thousands → $1,000
    expect(stepForAmount(2_500_000)).toBe(100_000);
  });

  it("follows the table at every row edge", () => {
    const rows: [number, number][] = [
      [0, 100],
      [99_999, 100], // $999.99
      [100_000, 10_000], // $1,000
      [999_999, 10_000], // $9,999.99
      [1_000_000, 100_000], // $10,000
      [9_999_999, 100_000],
      [10_000_000, 1_000_000], // $100,000
      [100_000_000, 10_000_000], // $1M
      [1_000_000_000, 100_000_000], // $10M
    ];
    for (const [cents, step] of rows) expect(stepForAmount(cents), usd(cents)).toBe(step);
  });

  it("ignores sign and refuses non-finite input to the floor", () => {
    expect(stepForAmount(-2_500_000)).toBe(100_000);
    expect(stepForAmount(Number.NaN)).toBe(100);
    expect(stepForAmount(Number.POSITIVE_INFINITY)).toBe(100);
  });

  // Headless observation: the whole table, printed. Run with
  //   npx vitest run src/components/CurrencyInput/moneyStep.test.ts --reporter=verbose
  it("prints the step table", () => {
    const amounts = [0, 5, 45, 450, 999.99, 1_000, 4_250, 9_999.99, 10_000, 25_000, 99_999, 100_000, 450_000, 1_000_000, 25_000_000];
    const lines = amounts.map((d) => {
      const step = stepForAmount(Math.round(d * 100));
      return `${usd(Math.round(d * 100)).padStart(14)}  step ${usd(step).padStart(10)}  shift ${usd(step * MONEY_SHIFT_MULTIPLIER).padStart(11)}`;
    });
    console.log(`\nmoney step table\n${lines.join("\n")}`);
    expect(lines).toHaveLength(amounts.length);
  });
});

describe("moneyStepFor (dollars, direction)", () => {
  it("is symmetric at every boundary: ↑ then ↓ returns to the start", () => {
    for (const start of [999, 9_900, 99_000, 990_000]) {
      const up = start + moneyStepFor(start, 1);
      const back = up - moneyStepFor(up, -1);
      expect(back, `from ${start}`).toBe(start);
    }
  });

  it("$10,000 ↓ steps $100, not $1,000", () => {
    expect(moneyStepFor(10_000, -1)).toBe(100);
    expect(moneyStepFor(10_000, 1)).toBe(1_000);
  });

  it("negative amounts step at their magnitude, toward zero symmetric", () => {
    expect(moneyStepFor(-25_000, -1)).toBe(1_000);
    expect(moneyStepFor(-10_000, 1)).toBe(100);
  });

  it("zero and non-finite take the $1 floor", () => {
    expect(moneyStepFor(0, 1)).toBe(1);
    expect(moneyStepFor(0, -1)).toBe(1);
    expect(moneyStepFor(Number.NaN, 1)).toBe(1);
  });
});
