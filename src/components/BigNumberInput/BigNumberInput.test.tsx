import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { BigNumberInput, createBigNumberInput } from "./BigNumberInput";

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
