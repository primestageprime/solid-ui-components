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

  it("keeps the value when the accessor goes undefined and comes back", () => {
    // The clear makes kobalte controlled for exactly as long as the caller
    // holds nothing. Coming back must hand control to kobalte again, or the
    // field would show the cleared text forever.
    const [value, setValue] = createSignal<number | undefined>(42);
    const { container } = render(() => (
      <ThemedNumberInput name="v" value={value} />
    ));
    const input = container.querySelector(
      ".sui-number-input__input",
    ) as HTMLInputElement;

    setValue(undefined);
    expect(input.value).toBe("");

    setValue(7);
    expect(input.value).toBe("7");
  });

  it("does not read the caller's value accessor from kobalte's render path", () => {
    // 0.156.0 answered kobalte's `value` prop by calling `local.value()`
    // directly. Kobalte reads that prop from `createControllableSignal`'s
    // `isControlled` and `value` memos, and its hidden input reads those memos
    // again inside a render effect — so kobalte re-entered the CALLER's
    // accessor while rendering.
    //
    // thorcasting-ui builds each form field inside a lazy JSX getter, so a
    // read of the field's `value` prop re-runs the builder that made the
    // field. The field was therefore rebuilt inside kobalte's own render
    // effect, each rebuild emitted again, and every form holding the component
    // died with `RangeError: Maximum call stack size exceeded` (dside
    // `sui`#36961).
    //
    // The accessor has two honest readers: the `rawValue` prop, and the effect
    // that watches for a clear. Typing is kobalte's own business and must not
    // add more. The count was 1 at 0.155.0 and 5 at 0.156.0.
    let reads = 0;
    const [value, setValue] = createSignal<number | undefined>(11200);
    const { container } = render(() => (
      <ThemedNumberInput
        name="amount"
        value={() => {
          reads += 1;
          return value();
        }}
        onChange={setValue}
      />
    ));
    const input = container.querySelector(
      ".sui-number-input__input",
    ) as HTMLInputElement;

    reads = 0;
    fireEvent.input(input, { target: { value: "22400" } });

    expect(value()).toBe(22400);
    expect(reads).toBeLessThanOrEqual(3);
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
