import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { installFakeSizer, typeText, type FakeSizer } from "../../test-utils";
import {
  AmountStrip,
  CadenceStrip,
  HoursAmountStrip,
  LabelStrip,
  MonthlyOrAnnualCadenceStrip,
  PayCadenceStrip,
  SeatsAmountStrip,
  StartWindowStrip,
  WindowStrip,
} from "./index";
import type { AmountValue, CadenceValue, WindowValue } from "./values";

let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

const text = (container: HTMLElement): string => container.textContent ?? "";

describe("LabelStrip", () => {
  it("is one input; typing reports the string", () => {
    const seen: string[] = [];
    const { container } = render(() => (
      <LabelStrip value="Pro licenses" onChange={(v) => seen.push(v)} />
    ));
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("Pro licenses");
    fireEvent.focus(input);
    typeText(input, "Pro seats");
    expect(seen.at(-1)).toContain("Pro seats");
  });
});

describe("AmountStrip", () => {
  it("single per year shows the derived payment", () => {
    const value: AmountValue = { kind: "single", cents: 10_289_110, per: "year" };
    const { container } = render(() => (
      <AmountStrip value={value} onChange={() => {}} periodsPerYear={26} />
    ));
    expect(text(container)).toContain("$3,957.35 per payment (annual ÷ 26)");
  });

  it("single per payment shows no derivation", () => {
    const value: AmountValue = { kind: "single", cents: 1_000_000, per: "payment" };
    const { container } = render(() => <AmountStrip value={value} onChange={() => {}} />);
    expect(text(container)).not.toContain("annual ÷");
  });

  it("range is three money fields and editing min past typical keeps it ordered", () => {
    const value: AmountValue = { kind: "range", min: 800_000, typical: 1_000_000, max: 1_200_000 };
    const seen: AmountValue[] = [];
    const { container } = render(() => (
      <AmountStrip value={value} onChange={(v) => seen.push(v)} />
    ));
    const money = container.querySelectorAll(".sui-currency-input .sui-number-input__input");
    expect(money.length).toBe(3);
    const min = money[0] as HTMLInputElement;
    fireEvent.focus(min);
    typeText(min, "11000");
    fireEvent.blur(min);
    const last = seen.at(-1);
    expect(last?.kind).toBe("range");
    if (last?.kind === "range") {
      expect(last.min).toBeLessThanOrEqual(last.typical);
      expect(last.typical).toBeLessThanOrEqual(last.max);
    }
  });

  it("units counts seats or hours", () => {
    const value: AmountValue = { kind: "units", units: 10, unitPrice: 5_000, perPeriod: 2 };
    const seats = render(() => <SeatsAmountStrip value={value} onChange={() => {}} />);
    expect(text(seats.container)).toContain("Seats");
    expect(text(seats.container)).toContain("per period");
    seats.unmount();
    const hours = render(() => <HoursAmountStrip value={value} onChange={() => {}} />);
    expect(text(hours.container)).toContain("Hours");
    expect(text(hours.container)).not.toContain("per period");
  });
});

describe("CadenceStrip", () => {
  const annual: CadenceValue = { shape: "annual", anchor: { month: 3, day: 15 } };

  it("shows the anchor as a compact value", () => {
    const { container } = render(() => <CadenceStrip value={annual} onChange={() => {}} />);
    expect(text(container)).toContain("Mar 15");
  });

  it("offers all eight shapes by default and a kind narrows them", () => {
    const all = render(() => <CadenceStrip value={annual} onChange={() => {}} />);
    expect(all.container.querySelectorAll(".sui-segmented-input__segment, [role=radio], button").length).toBeGreaterThan(8);
    all.unmount();
    const pay = render(() => (
      <PayCadenceStrip value={{ shape: "semimonthly" }} onChange={() => {}} />
    ));
    expect(text(pay.container)).toContain("Bi-weekly");
    expect(text(pay.container)).toContain("Semi-monthly");
    expect(text(pay.container)).toContain("Monthly");
    expect(text(pay.container)).not.toContain("Quarterly");
    pay.unmount();
    const seat = render(() => (
      <MonthlyOrAnnualCadenceStrip value={{ shape: "monthly", anchor: 1 }} onChange={() => {}} />
    ));
    expect(text(seat.container)).not.toContain("Weekly");
    expect(text(seat.container)).toContain("Day 1");
  });

  it("choosing a shape reports a valid cadence of that shape", () => {
    const seen: CadenceValue[] = [];
    const { getByText } = render(() => (
      <PayCadenceStrip value={{ shape: "semimonthly" }} onChange={(v) => seen.push(v)} />
    ));
    fireEvent.click(getByText("Monthly"));
    expect(seen.at(-1)).toEqual({ shape: "monthly", anchor: 1 });
  });
});

describe("WindowStrip", () => {
  it("an open side reads beginning/end of time", () => {
    const value: WindowValue = { until: "2027-06-30" };
    const { container } = render(() => <WindowStrip value={value} onChange={() => {}} />);
    expect(text(container)).toContain("beginning of time");
    expect(text(container)).toContain("2027-06-30");
    expect(text(container)).toContain("to");
  });

  it("neither side set is the whole line", () => {
    const { container } = render(() => <WindowStrip value={{}} onChange={() => {}} />);
    expect(text(container)).toContain("beginning of time");
    expect(text(container)).toContain("end of time");
  });

  it("a start-only strip offers just the start", () => {
    const { container } = render(() => <StartWindowStrip value={{}} onChange={() => {}} />);
    expect(text(container)).toContain("beginning of time");
    expect(text(container)).not.toContain("end of time");
  });
});
