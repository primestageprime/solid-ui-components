import type { JSX } from "solid-js";
import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  CountInput100,
  CountInput10K,
  CurrencyInput100M,
  CurrencyInput10K,
  CurrencyInput1B,
  CurrencyInput1M,
} from "./sized";

const widthOf = (container: HTMLElement): string =>
  (container.querySelector(".sui-number-input") as HTMLElement).style.maxWidth;

describe("magnitude-sized number inputs", () => {
  it("each variant mounts a field sized to its baked ceiling", () => {
    const sizes = [
      [<CountInput100 name="a" />, "calc(2.5ch + 3.6rem)"],
      [<CountInput10K name="b" />, "calc(4.9ch + 3.6rem)"],
      [<CurrencyInput10K name="c" />, "calc(8.3ch + 3.6rem)"],
      [<CurrencyInput1M name="d" />, "calc(10.3ch + 3.6rem)"],
      [<CurrencyInput100M name="e" />, "calc(12.7ch + 3.6rem)"],
      [<CurrencyInput1B name="f" />, "calc(15.1ch + 3.6rem)"],
    ] as const;
    for (const [element, width] of sizes) {
      const { container, unmount } = render(() => element);
      expect(container.querySelector(".sui-number-input--fit")).toBeTruthy();
      expect(widthOf(container)).toBe(width);
      unmount();
    }
  });

  it("widths grow with the ceiling", () => {
    const ch = (element: () => JSX.Element) => {
      const { container, unmount } = render(element);
      const value = Number.parseFloat(widthOf(container).slice(5));
      unmount();
      return value;
    };
    expect(ch(() => <CurrencyInput10K name="x" />)).toBeLessThan(
      ch(() => <CurrencyInput1M name="x" />),
    );
    expect(ch(() => <CurrencyInput1M name="x" />)).toBeLessThan(
      ch(() => <CurrencyInput1B name="x" />),
    );
  });
});
