import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { installFakeSizer, type FakeSizer } from "../../test-utils";
import {
  GrowthStrip,
  SeatsPriceAmountStrip,
  SimpleGrowthStrip,
  UnitsAmountStrip,
} from "./index";
import type { AmountValue, GrowthValue } from "./index";

let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

const text = (c: HTMLElement): string => c.textContent ?? "";

describe("GrowthStrip", () => {
  it("none shows only the kind split, churn and ceiling", () => {
    const { container } = render(() => (
      <GrowthStrip value={{ kind: "none" }} onChange={() => {}} />
    ));
    expect(text(container)).toContain("None");
    expect(text(container)).toContain("+ units");
    expect(text(container)).toContain("% growth");
    expect(text(container)).toContain("Churn %");
    expect(text(container)).toContain("Ceiling");
  });

  it("units shows the per-period field and percent shows its own", () => {
    const units: GrowthValue = { kind: "units", perPeriod: 12 };
    const a = render(() => <GrowthStrip value={units} onChange={() => {}} />);
    expect(a.container.querySelector('[name="growth-units"]')).toBeTruthy();
    expect(a.container.querySelector('[name="growth-percent"]')).toBeNull();
    a.unmount();
    const b = render(() => (
      <GrowthStrip value={{ kind: "percent", pctPerPeriod: 5 }} onChange={() => {}} />
    ));
    expect(b.container.querySelector('[name="growth-percent"]')).toBeTruthy();
  });

  it("the simple variant offers no churn or ceiling", () => {
    const { container } = render(() => (
      <SimpleGrowthStrip value={{ kind: "units", perPeriod: 3 }} onChange={() => {}} />
    ));
    expect(text(container)).not.toContain("Churn");
    expect(text(container)).not.toContain("Ceiling");
  });

  it("choosing a kind keeps churn and ceiling and zeroes the rate", () => {
    const seen: GrowthValue[] = [];
    const { getByText } = render(() => (
      <GrowthStrip
        value={{ kind: "units", perPeriod: 12, churnPct: 3, ceiling: 500 }}
        onChange={(v) => seen.push(v)}
      />
    ));
    fireEvent.click(getByText("% growth"));
    expect(seen.at(-1)).toEqual({ kind: "percent", pctPerPeriod: 0, churnPct: 3, ceiling: 500 });
  });

  it("a ceiling shows the starting-units floor", () => {
    const { container } = render(() => (
      <GrowthStrip
        value={{ kind: "none", ceiling: 300 }}
        startUnits={120}
        onChange={() => {}}
      />
    ));
    expect(text(container)).toContain("At least the 120 you start with.");
  });
});

describe("AmountStrip with growth delegated", () => {
  const value: AmountValue = { kind: "units", units: 10, unitPrice: 5_000, perPeriod: 2 };

  it("SeatsPriceAmountStrip hides the per-period field; the value keeps it", () => {
    const { container } = render(() => (
      <SeatsPriceAmountStrip value={value} onChange={() => {}} />
    ));
    expect(text(container)).toContain("Seats");
    expect(text(container)).not.toContain("per period");
  });

  it("UnitsAmountStrip counts plain units", () => {
    const { container } = render(() => <UnitsAmountStrip value={value} onChange={() => {}} />);
    expect(text(container)).toContain("Units");
    expect(text(container)).toContain("Price per unit");
  });
});
