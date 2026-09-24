import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import {
  IntervalInput,
  clampEvery,
  unitLabel,
  defaultIntervalUnits,
  type IntervalValue,
} from "./IntervalInput";

describe("clampEvery", () => {
  it("rounds a fractional value", () => {
    expect(clampEvery(2.7, 1)).toBe(3);
  });

  it("floors at min", () => {
    expect(clampEvery(0, 1)).toBe(1);
    expect(clampEvery(-5, 1)).toBe(1);
  });

  it("respects a custom min", () => {
    expect(clampEvery(1, 3)).toBe(3);
    expect(clampEvery(5, 3)).toBe(5);
  });

  it("falls back to min for undefined or NaN", () => {
    expect(clampEvery(undefined, 1)).toBe(1);
    expect(clampEvery(Number.NaN, 2)).toBe(2);
  });
});

describe("unitLabel", () => {
  it("is singular at exactly 1", () => {
    expect(unitLabel("week", 1)).toBe("week");
    expect(unitLabel("day", 1)).toBe("day");
  });

  it("pluralises otherwise, including 0", () => {
    expect(unitLabel("week", 2)).toBe("weeks");
    expect(unitLabel("week", 0)).toBe("weeks");
    expect(unitLabel("month", 3)).toBe("months");
    expect(unitLabel("year", 10)).toBe("years");
  });
});

describe("defaultIntervalUnits", () => {
  it("returns all four units in a fixed order", () => {
    expect(defaultIntervalUnits(1).map((u) => u.value)).toEqual([
      "day",
      "week",
      "month",
      "year",
    ]);
  });

  it("pluralises every label for the given count", () => {
    expect(defaultIntervalUnits(2).map((u) => u.label)).toEqual([
      "days",
      "weeks",
      "months",
      "years",
    ]);
  });

  it("keeps labels singular at 1", () => {
    expect(defaultIntervalUnits(1).map((u) => u.label)).toEqual([
      "day",
      "week",
      "month",
      "year",
    ]);
  });
});

function renderControl(initial: IntervalValue) {
  const [value, setValue] = createSignal<IntervalValue>(initial);
  const onChange = vi.fn((v: IntervalValue) => setValue(v));
  const utils = render(() => (
    <IntervalInput value={value()} onChange={onChange} />
  ));
  return { ...utils, value, onChange };
}

describe("IntervalInput", () => {
  it("renders the current every/unit", () => {
    const { container } = renderControl({ every: 3, unit: "week" });
    const input = container.querySelector(
      ".sui-number-input__input",
    ) as HTMLInputElement;
    expect(input.value).toBe("3");
    expect(container.textContent).toContain("Every");
  });

  it("emits {every, unit} shape on a number change", () => {
    const { container, onChange } = renderControl({ every: 1, unit: "day" });
    const input = container.querySelector(
      ".sui-number-input__input",
    ) as HTMLInputElement;

    fireEvent.input(input, { target: { value: "5" } });

    expect(onChange).toHaveBeenCalled();
    const call = onChange.mock.calls.at(-1)?.[0] as IntervalValue;
    expect(call).toEqual({ every: 5, unit: "day" });
  });

  it("clamps a sub-min number up to min on change", () => {
    const { container, onChange } = renderControl({ every: 4, unit: "day" });
    const input = container.querySelector(
      ".sui-number-input__input",
    ) as HTMLInputElement;

    fireEvent.input(input, { target: { value: "0" } });

    expect(onChange).toHaveBeenCalled();
    const call = onChange.mock.calls.at(-1)?.[0] as IntervalValue;
    expect(call.every).toBe(1);
  });

  it("clamps a sub-custom-min number up to the custom min on change", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <IntervalInput
        value={{ every: 5, unit: "day" }}
        onChange={onChange}
        min={3}
      />
    ));
    const input = container.querySelector(
      ".sui-number-input__input",
    ) as HTMLInputElement;

    fireEvent.input(input, { target: { value: "1" } });

    expect(onChange).toHaveBeenCalled();
    const call = onChange.mock.calls.at(-1)?.[0] as IntervalValue;
    expect(call.every).toBe(3);
  });

  it("renders custom units verbatim without re-pluralising", () => {
    const [value] = createSignal<IntervalValue>({ every: 1, unit: "day" });
    const onChange = vi.fn();
    const { container } = render(() => (
      <IntervalInput
        value={value()}
        onChange={onChange}
        units={[{ value: "day", label: "Custom Day Label" }]}
      />
    ));
    expect(container.textContent).toContain("Custom Day Label");
  });

  it("renders a group label when provided", () => {
    const { container } = render(() => (
      <IntervalInput
        value={{ every: 1, unit: "week" }}
        onChange={vi.fn()}
        label="Cadence"
      />
    ));
    expect(container.textContent).toContain("Cadence");
  });

  it("disables both the number input and the select trigger", () => {
    const { container } = render(() => (
      <IntervalInput
        value={{ every: 1, unit: "week" }}
        onChange={vi.fn()}
        disabled
      />
    ));
    const input = container.querySelector(
      ".sui-number-input__input",
    ) as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
