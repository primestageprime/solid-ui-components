import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { CurrencyInput, currencyWidthRem } from "./CurrencyInput";
// Import the stylesheet as raw text so we can assert the tabular-nums rule
// (jsdom does not apply CSS files to layout).
import css from "./CurrencyInput.css?raw";

function rootOf(container: HTMLElement): HTMLElement {
  return container.querySelector(".sui-currency-input") as HTMLElement;
}

describe("CurrencyInput", () => {
  // -- derived width cap ----------------------------------------------

  it("derives the $10B cap from the formatted width: 18 chars → 15.16rem", () => {
    // "$10,000,000,000.00" = 18 chars; 18*0.62 + 4rem chrome = 15.16rem.
    expect(currencyWidthRem()).toBe(15.16);
    expect(currencyWidthRem(10_000_000_000)).toBe(15.16);
  });

  it("caps narrower for a smaller maxValue", () => {
    // "$1,000,000.00" = 13 chars; 13*0.62 + 4 = 12.06rem.
    expect(currencyWidthRem(1_000_000)).toBe(12.06);
    expect(currencyWidthRem(1_000_000)).toBeLessThan(currencyWidthRem());
  });

  it("renders the derived rem cap as an inline max-width on the wrapper", () => {
    const [v] = createSignal<number | undefined>(1234.56);
    const { container } = render(() => (
      <CurrencyInput name="amount" value={v} onChange={() => {}} />
    ));
    const root = rootOf(container);
    expect(root.style.maxWidth).toBe("15.16rem");
  });

  it("honours a smaller maxValue in the inline cap", () => {
    const [v] = createSignal<number | undefined>(500);
    const { container } = render(() => (
      <CurrencyInput name="fee" maxValue={1_000_000} value={v} onChange={() => {}} />
    ));
    expect(rootOf(container).style.maxWidth).toBe("12.06rem");
  });

  // -- styling --------------------------------------------------------

  it("renders the masked digits with tabular figures", () => {
    expect(css).toMatch(/tabular-nums/);
  });

  // -- API passthrough ------------------------------------------------

  it("forwards name to the underlying ThemedNumberInput hidden input", () => {
    const [v] = createSignal<number | undefined>(42);
    const { container } = render(() => (
      <CurrencyInput name="salary" value={v} onChange={() => {}} />
    ));
    // The Kobalte NumberField root carries the sui-number-input class inside
    // the wrapper — confirms the Primitive mounted under the cap.
    expect(container.querySelector(".sui-number-input")).not.toBeNull();
    expect(container.querySelector('[name="salary"]')).not.toBeNull();
  });
});
