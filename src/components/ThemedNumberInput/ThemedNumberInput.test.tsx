import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { ThemedNumberInput } from "./ThemedNumberInput";
import { installFakeSizer, type FakeSizer } from "../../test-utils";

// Kobalte's NumberField touches ResizeObserver on some builds; jsdom lacks it.
let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

describe("ThemedNumberInput", () => {
  it("renders a named field with increment/decrement triggers", () => {
    const { container, getByLabelText } = render(() => (
      <ThemedNumberInput name="qty" />
    ));
    expect(container.querySelector(".sui-number-input")).toBeTruthy();
    expect(container.querySelector('input[name="qty"]')).toBeTruthy();
    expect(getByLabelText("Increment")).toBeTruthy();
    expect(getByLabelText("Decrement")).toBeTruthy();
  });

  it("renders a label when provided", () => {
    const { getByText } = render(() => (
      <ThemedNumberInput name="rpm" label="Engine RPM" />
    ));
    expect(getByText("Engine RPM")).toBeTruthy();
  });

  it("reflects the reactive value accessor into the visible input", () => {
    const [value] = createSignal<number | undefined>(42);
    const { container } = render(() => (
      <ThemedNumberInput name="v" value={value} />
    ));
    const input = container.querySelector(
      ".sui-number-input__input",
    ) as HTMLInputElement;
    expect(input.value).toBe("42");
  });

  it("clears the visible input when the value accessor goes undefined", () => {
    const [value, setValue] = createSignal<number | undefined>(42);
    const { container } = render(() => (
      <ThemedNumberInput name="v" value={value} />
    ));
    const input = container.querySelector(
      ".sui-number-input__input",
    ) as HTMLInputElement;
    const hidden = container.querySelector(
      'input[name="v"]',
    ) as HTMLInputElement;
    expect(input.value).toBe("42");

    setValue(undefined);

    // The hidden form input always cleared; the VISIBLE one held stale text
    // until the display string became controlled (dside `sui`#36924).
    expect(input.value).toBe("");
    expect(hidden.value).toBe("");
  });

  it("keeps the value when End or Home is pressed on an unbounded field", () => {
    // Kobalte merges a default `maxValue` of `Number.MAX_SAFE_INTEGER`, so its
    // spin-button sent `End` to 9007199254740991 and `Home` to the negative
    // twin on a field that declares no bounds (dside `sui`#36926). Both keys
    // must only move the caret.
    const [value, setValue] = createSignal<number | undefined>(42);
    const { container } = render(() => (
      <ThemedNumberInput name="v" value={value} onChange={setValue} />
    ));
    const input = container.querySelector(
      ".sui-number-input__input",
    ) as HTMLInputElement;

    fireEvent.keyDown(input, { key: "End" });
    expect(value()).toBe(42);

    fireEvent.keyDown(input, { key: "Home" });
    expect(value()).toBe(42);
  });

  it("jumps to max and min when End or Home is pressed on a bounded field", () => {
    // The suppression is bound to the absence of the prop, so a caller that
    // declares bounds keeps kobalte's documented shortcut.
    const [value, setValue] = createSignal<number | undefined>(42);
    const { container } = render(() => (
      <ThemedNumberInput name="v" value={value} onChange={setValue} min={0} max={100} />
    ));
    const input = container.querySelector(
      ".sui-number-input__input",
    ) as HTMLInputElement;

    fireEvent.keyDown(input, { key: "End" });
    expect(value()).toBe(100);

    fireEvent.keyDown(input, { key: "Home" });
    expect(value()).toBe(0);
  });

  it("renders the error message and hides the description in invalid state", () => {
    const { container, getByText, queryByText } = render(() => (
      <ThemedNumberInput
        name="v"
        errorMessage="Too high"
        description="hint text"
      />
    ));
    expect(getByText("Too high")).toBeTruthy();
    expect(queryByText("hint text")).toBeNull();
    expect(container.querySelector(".sui-number-input__error")).toBeTruthy();
  });

  it("defaults to the md size modifier", () => {
    const { container } = render(() => <ThemedNumberInput name="v" />);
    expect(container.querySelector(".sui-number-input--md")).toBeTruthy();
    expect(container.querySelector(".sui-number-input--sm")).toBeNull();
  });

  it("emits the sm size modifier for the toolbar size", () => {
    // The height itself is CSS (jsdom has no layout) — see the Sizes block in
    // ThemedNumberInput.css for the 29px arithmetic. What is testable here is
    // that the prop reaches the class the stylesheet keys off.
    const { container } = render(() => (
      <ThemedNumberInput name="v" size="sm" />
    ));
    expect(container.querySelector(".sui-number-input--sm")).toBeTruthy();
    expect(container.querySelector(".sui-number-input--md")).toBeNull();
  });

  it("shows the description when there is no error", () => {
    const { getByText } = render(() => (
      <ThemedNumberInput name="v" description="hint text" />
    ));
    expect(getByText("hint text")).toBeTruthy();
  });
});
