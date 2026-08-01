import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { ThemedNumberInput } from "./ThemedNumberInput";

// Kobalte's NumberField touches ResizeObserver on some builds; jsdom lacks it.
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

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

  it("shows the description when there is no error", () => {
    const { getByText } = render(() => (
      <ThemedNumberInput name="v" description="hint text" />
    ));
    expect(getByText("hint text")).toBeTruthy();
  });
});
