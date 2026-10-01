import { describe, it, expect } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { typeText } from "../../test-utils";
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

  it("is SIZED for $1B by default: 17 chars → 14.54rem", () => {
    // "$1,000,000,000.00" = 17 chars; 17*0.62 + 4rem chrome = 14.54rem.
    expect(currencyWidthRem()).toBe(14.54);
    // "$10,000,000,000.00" = 18 chars → 15.16rem when a caller states $10B.
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
    expect(root.style.maxWidth).toBe("14.54rem");
  });

  it("honours a smaller maxValue in the inline cap", () => {
    const [v] = createSignal<number | undefined>(500);
    const { container } = render(() => (
      <CurrencyInput
        name="fee"
        maxValue={1_000_000}
        value={v}
        onChange={() => {}}
      />
    ));
    // A stated maxValue uses the tight shared rule: the wrapper hugs a field
    // sized in ch (see fieldWidth.test.ts), not a flat rem cap.
    expect(rootOf(container).style.width).toBe("fit-content");
    const field = container.querySelector(".sui-number-input") as HTMLElement;
    expect(field.className).toContain("sui-number-input--fit");
    // "$1,000,000.00" = $ + 7 digits + 2 cents (10ch) + 3 separators (1.2ch) + 0.5 slack.
    expect(field.style.maxWidth).toBe("calc(11.7ch + 3.6rem)");
  });

  // -- clearing -------------------------------------------------------

  it("clears the masked input when the value accessor goes undefined", () => {
    const [v, setV] = createSignal<number | undefined>(1234.56);
    const { container } = render(() => (
      <CurrencyInput name="amount" value={v} onChange={() => {}} />
    ));
    const input = container.querySelector(
      ".sui-number-input__input",
    ) as HTMLInputElement;
    expect(input.value).not.toBe("");

    setV(undefined);

    expect(input.value).toBe("");
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

  it('always shows a literal "$", whatever the viewer\'s locale', () => {
    // "narrowSymbol" is what pins it; the locale-driven "symbol" display
    // renders USD as "US$" in en-GB / en-CA.
    const fmt = (locale: string) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        currencyDisplay: "narrowSymbol",
      }).format(1);
    for (const locale of ["en-US", "en-GB", "en-CA", "en-AU"]) {
      expect(fmt(locale)).toMatch(/^\$1/);
    }
    const [v] = createSignal<number | undefined>(1234.5);
    const { container } = render(() => (
      <CurrencyInput name="amount" value={v} onChange={() => {}} />
    ));
    const shown = (
      container.querySelector(".sui-number-input__input") as HTMLInputElement
    ).value;
    expect(shown.startsWith("$")).toBe(true);
  });
});

describe("CurrencyInput — first keystroke replaces the shown amount", () => {
  // thorcasting Import Coverage: a new amount shows "$0.00"; the user clicked
  // in, typed "550", and the field read "$0.00550", which rounded to 1 cent
  // and saved -$0.01. Focus must select the whole masked text.
  function inputOf(container: HTMLElement): HTMLInputElement {
    return container.querySelector(".sui-number-input__input") as HTMLInputElement;
  }

  it("selects the whole masked text when focused", () => {
    const [v, setV] = createSignal<number | undefined>(0);
    const { container } = render(() => (
      <CurrencyInput name="amount" value={v} onChange={setV} />
    ));
    const input = inputOf(container);
    expect(input.value).toBe("$0.00");
    input.focus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe("$0.00".length);
  });

  it('commits 550 when "550" is typed into a clicked "$0.00" field', () => {
    const [v, setV] = createSignal<number | undefined>(0);
    const { container } = render(() => (
      <CurrencyInput name="amount" value={v} onChange={setV} />
    ));
    const input = inputOf(container);
    fireEvent.mouseDown(input);
    input.focus();
    input.setSelectionRange(5, 5); // the browser's click caret, at the end
    fireEvent.mouseUp(input);
    typeText(input, "550");
    fireEvent.blur(input);
    expect(v()).toBe(550);
  });
});
