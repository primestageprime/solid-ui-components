import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { BigNumberInput, createBigNumberInput } from "./BigNumberInput";
// Import the component stylesheet as raw text so we can assert the fixed
// width / tabular-nums rules (jsdom does not apply CSS files to layout).
import css from "./BigNumberInput.css?raw";

describe("BigNumberInput", () => {
  it("renders the value in the input", () => {
    const { container } = render(() => (
      <BigNumberInput value={1200} onChange={() => {}} />
    ));
    const input = container.querySelector(
      ".sui-big-number__input",
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe("1200");
  });

  it("renders an optional prefix and sign", () => {
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

  it("omits the sign when sign is 'none' or absent", () => {
    const { container } = render(() => (
      <BigNumberInput value={50} sign="none" onChange={() => {}} />
    ));
    expect(container.querySelector(".sui-big-number__sign")).toBeNull();
  });

  it("calls onChange with the parsed number on input", () => {
    let got: number | null = null;
    const { container } = render(() => (
      <BigNumberInput value={0} onChange={(n) => (got = n)} />
    ));
    const input = container.querySelector(
      ".sui-big-number__input",
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "42" } });
    expect(got).toBe(42);
  });

  it("stays controlled — does not loop when value is driven by a signal", () => {
    const [val, setVal] = createSignal(10);
    const { container } = render(() => (
      <BigNumberInput value={val()} onChange={setVal} />
    ));
    const input = container.querySelector(
      ".sui-big-number__input",
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "99" } });
    expect(val()).toBe(99);
    expect(input.value).toBe("99");
  });

  it("selects the entire contents on focus by default", () => {
    const { container } = render(() => (
      <BigNumberInput value={1200} onChange={() => {}} />
    ));
    const input = container.querySelector(
      ".sui-big-number__input",
    ) as HTMLInputElement;
    fireEvent.focus(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
    expect(input.value.length).toBeGreaterThan(0);
  });

  it("does not select on focus when selectOnFocus={false}", () => {
    const { container } = render(() => (
      <BigNumberInput value={1200} selectOnFocus={false} onChange={() => {}} />
    ));
    const input = container.querySelector(
      ".sui-big-number__input",
    ) as HTMLInputElement;
    // Place a collapsed caret, then focus; it must stay collapsed.
    input.setSelectionRange(2, 2);
    fireEvent.focus(input);
    expect(input.selectionStart).toBe(input.selectionEnd);
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
    const input = container.querySelector(
      ".sui-big-number__input",
    ) as HTMLInputElement;
    fireEvent.focus(input);
    expect(focused).toBe(true);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it("renders the same fixed-width root for small and max values", () => {
    const small = render(() => (
      <BigNumberInput value={800} prefix="$" onChange={() => {}} />
    ));
    const big = render(() => (
      <BigNumberInput value={1000000000} prefix="$" onChange={() => {}} />
    ));
    const smallRoot = small.container.querySelector(
      ".sui-big-number",
    ) as HTMLElement;
    const bigRoot = big.container.querySelector(
      ".sui-big-number",
    ) as HTMLElement;
    // Both share the single fixed-width class — no per-value sizing.
    expect(smallRoot.classList.contains("sui-big-number")).toBe(true);
    expect(bigRoot.classList.contains("sui-big-number")).toBe(true);
  });

  it("defines a FIXED rem width sized for $1,000,000,000.00 plus a sign", () => {
    // The root has a hardcoded rem width (jsdom can't compute layout, so we
    // assert the CSS rule directly). 17rem was measured for the max string.
    const rootRule = css.match(/\.sui-big-number\s*\{[\s\S]*?\}/)?.[0] ?? "";
    expect(rootRule).toMatch(/width:\s*17rem/);
    expect(rootRule).toMatch(/tabular-nums/);
  });

  it("createBigNumberInput bakes defaults", () => {
    const Money = createBigNumberInput({ prefix: "$" });
    const { container } = render(() => (
      <Money value={5} onChange={() => {}} />
    ));
    expect(
      container.querySelector(".sui-big-number__prefix")?.textContent,
    ).toBe("$");
  });
});
