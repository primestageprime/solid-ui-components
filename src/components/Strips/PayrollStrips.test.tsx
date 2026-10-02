import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { installFakeSizer, type FakeSizer } from "../../test-utils";
import { HourlyWageAmountStrip, PayrollTaxStrip } from "./index";
import { derivePayrollTax } from "./payroll";

let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

describe("HourlyWageAmountStrip", () => {
  it("edits a rate and hours and shows the estimated annual and each paycheck", () => {
    const { container } = render(() => (
      <HourlyWageAmountStrip value={{ rateCents: 4_500, hoursPerWeek: 40 }} onChange={() => {}} periodsPerYear={26} />
    ));
    expect(container.querySelectorAll(".sui-number-input__input").length).toBe(2);
    expect(container.textContent).toContain("$93,600.00 a year");
    expect(container.textContent).toContain("$3,600.00 per paycheck (annual ÷ 26)");
  });
});

describe("PayrollTaxStrip", () => {
  it("is read-only: shows rate, base and the tax, and has no inputs", () => {
    const { container } = render(() => <PayrollTaxStrip value={derivePayrollTax([9_360_000], 765, 26)} />);
    expect(container.querySelectorAll("input,button").length).toBe(0);
    expect(container.textContent).toContain("7.65%");
    expect(container.textContent).toContain("$93,600.00");
    expect(container.textContent).toContain("$7,160.40");
    expect(container.textContent).toContain("$275.40");
  });
});
