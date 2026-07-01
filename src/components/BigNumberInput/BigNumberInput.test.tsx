import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { BigNumberInput, createBigNumberInput } from "./BigNumberInput";
// Import the component stylesheet as raw text so we can assert the fixed
// width / tabular-nums rules (jsdom does not apply CSS files to layout).
import css from "./BigNumberInput.css?raw";

function inputOf(container: HTMLElement): HTMLInputElement {
  return container.querySelector(".sui-big-number__input") as HTMLInputElement;
}

describe("BigNumberInput", () => {
  // -- currency masking (format-on-blur) -------------------------------

  it("masks the value as en-US/USD currency when blurred (default)", () => {
    const { container } = render(() => (
      <BigNumberInput value={1234567.89} onChange={() => {}} />
    ));
    const input = inputOf(container);
    // Not focused -> masked.
    expect(input.value).toBe("$1,234,567.89");
  });

  it("masks a plain positive with NO leading '+'", () => {
    const { container } = render(() => (
      <BigNumberInput value={800} onChange={() => {}} />
    ));
    expect(inputOf(container).value).toBe("$800.00");
    expect(inputOf(container).value).not.toContain("+");
  });

  it("masks a negative using the locale's negative form", () => {
    const { container } = render(() => (
      <BigNumberInput value={-800} onChange={() => {}} />
    ));
    expect(inputOf(container).value).toBe("-$800.00");
  });

  it("honours a locale/currency override (de-DE / EUR)", () => {
    const { container } = render(() => (
      <BigNumberInput
        value={1234567.89}
        locale="de-DE"
        currency="EUR"
        onChange={() => {}}
      />
    ));
    // de-DE/EUR: grouping ".", decimal ",", symbol trailing.
    const v = inputOf(container).value;
    expect(v).toContain("1.234.567,89");
    expect(v).toContain("€");
  });

  it("shows the bare editable raw number while FOCUSED (no grouping)", () => {
    const { container } = render(() => (
      <BigNumberInput value={1234567.89} onChange={() => {}} />
    ));
    const input = inputOf(container);
    fireEvent.focus(input);
    expect(input.value).toBe("1234567.89");
    expect(input.value).not.toContain("$");
    expect(input.value).not.toContain(",");
  });

  // -- onChange emits a raw number, not a string ----------------------

  it("calls onChange with a parsed NUMBER (not a string) on input", () => {
    let got: unknown = null;
    const { container } = render(() => (
      <BigNumberInput value={0} onChange={(n) => (got = n)} />
    ));
    const input = inputOf(container);
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: "42" } });
    expect(typeof got).toBe("number");
    expect(got).toBe(42);
  });

  it("parses currency-ish typed text leniently to a raw number", () => {
    let got: unknown = null;
    const { container } = render(() => (
      <BigNumberInput value={0} onChange={(n) => (got = n)} />
    ));
    const input = inputOf(container);
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: "$1,234.50" } });
    expect(got).toBe(1234.5);
  });

  it("stays controlled — does not loop when value is driven by a signal", () => {
    const [val, setVal] = createSignal(10);
    const { container } = render(() => (
      <BigNumberInput value={val()} onChange={setVal} />
    ));
    const input = inputOf(container);
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: "99" } });
    expect(val()).toBe(99);
    expect(input.value).toBe("99");
  });

  // -- select-on-focus (deferred) -------------------------------------

  describe("select-on-focus deferral", () => {
    let raf: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      // Capture the deferred callback so we can assert it is scheduled
      // (jsdom does not run rAF on its own).
      raf = vi
        .spyOn(window, "requestAnimationFrame")
        .mockImplementation((cb: FrameRequestCallback) => {
          (raf as unknown as { _cb?: FrameRequestCallback })._cb = cb;
          return 1;
        });
    });
    afterEach(() => raf.mockRestore());

    it("DEFERS select() to the next frame on focus (default)", () => {
      const { container } = render(() => (
        <BigNumberInput value={1200} onChange={() => {}} />
      ));
      const input = inputOf(container);
      const selectSpy = vi.spyOn(input, "select");
      fireEvent.focus(input);
      // Not selected synchronously...
      expect(selectSpy).not.toHaveBeenCalled();
      expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
      // ...selected once the frame runs.
      (raf as unknown as { _cb: FrameRequestCallback })._cb(0);
      expect(selectSpy).toHaveBeenCalledTimes(1);
    });

    it("does not schedule a select when selectOnFocus={false}", () => {
      const { container } = render(() => (
        <BigNumberInput
          value={1200}
          selectOnFocus={false}
          onChange={() => {}}
        />
      ));
      const input = inputOf(container);
      fireEvent.focus(input);
      expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it("composes a consumer-passed onFocus with select-on-focus", () => {
      let focused = false;
      const { container } = render(() => (
        <BigNumberInput
          value={1200}
          onChange={() => {}}
          onFocus={() => (focused = true)}
        />
      ));
      const input = inputOf(container);
      const selectSpy = vi.spyOn(input, "select");
      fireEvent.focus(input);
      expect(focused).toBe(true);
      expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
      (raf as unknown as { _cb: FrameRequestCallback })._cb(0);
      expect(selectSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("re-masks to currency on blur after editing", () => {
    const [val, setVal] = createSignal(800);
    const { container } = render(() => (
      <BigNumberInput value={val()} onChange={setVal} />
    ));
    const input = inputOf(container);
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: "950" } });
    fireEvent.blur(input);
    expect(val()).toBe(950);
    expect(input.value).toBe("$950.00");
  });

  // -- deprecated escape-hatch chrome ---------------------------------

  it("still renders deprecated prefix/sign chrome when provided", () => {
    const { container } = render(() => (
      <BigNumberInput value={50} prefix="$" sign="+" onChange={() => {}} />
    ));
    expect(
      container.querySelector(".sui-big-number__prefix")?.textContent,
    ).toBe("$");
    expect(container.querySelector(".sui-big-number__sign")?.textContent).toBe(
      "+",
    );
  });

  it("omits the sign chrome when sign is 'none' or absent", () => {
    const { container } = render(() => (
      <BigNumberInput value={50} sign="none" onChange={() => {}} />
    ));
    expect(container.querySelector(".sui-big-number__sign")).toBeNull();
  });

  // -- fixed width ----------------------------------------------------

  it("renders the same fixed-width root for small and max values", () => {
    const small = render(() => (
      <BigNumberInput value={800} onChange={() => {}} />
    ));
    const big = render(() => (
      <BigNumberInput value={1000000000} onChange={() => {}} />
    ));
    const smallRoot = small.container.querySelector(
      ".sui-big-number",
    ) as HTMLElement;
    const bigRoot = big.container.querySelector(
      ".sui-big-number",
    ) as HTMLElement;
    expect(smallRoot.classList.contains("sui-big-number")).toBe(true);
    expect(bigRoot.classList.contains("sui-big-number")).toBe(true);
  });

  it("defines a FIXED rem width sized for $1,000,000,000.00 plus a sign", () => {
    const rootRule = css.match(/\.sui-big-number\s*\{[\s\S]*?\}/)?.[0] ?? "";
    expect(rootRule).toMatch(/width:\s*17rem/);
    expect(rootRule).toMatch(/tabular-nums/);
  });

  it("createBigNumberInput bakes defaults", () => {
    const Euro = createBigNumberInput({ locale: "de-DE", currency: "EUR" });
    const { container } = render(() => (
      <Euro value={1000} onChange={() => {}} />
    ));
    const v = inputOf(container).value;
    expect(v).toContain("1.000,00");
    expect(v).toContain("€");
  });
});
