import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { type Component, createSignal } from "solid-js";
import { installFakeSizer, typeText, type FakeSizer } from "../../test-utils";
import { CurrencyInput, type CurrencyInputProps } from "./CurrencyInput";
import {
  CurrencyInputByHundreds,
  CurrencyInputByOnes,
  CurrencyInputByScale,
  CurrencyInputByTens,
  CurrencyInputByThousands,
} from "./stepped";

let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

const mount = (
  Field: Component<CurrencyInputProps & { scaleOf?: number }>,
  start: number,
  props: Partial<CurrencyInputProps & { scaleOf?: number }> = {},
) => {
  const [value, setValue] = createSignal<number | undefined>(start);
  const view = render(() => (
    <Field name="amt" value={value} onChange={setValue} {...props} />
  ));
  const input = view.container.querySelector(
    ".sui-number-input__input",
  ) as HTMLInputElement;
  const up = (shiftKey = false) => fireEvent.keyDown(input, { key: "ArrowUp", shiftKey });
  const down = (shiftKey = false) => fireEvent.keyDown(input, { key: "ArrowDown", shiftKey });
  return { value, input, up, down, ...view };
};

describe("fixed-step money variants", () => {
  it.each([
    ["ByOnes", CurrencyInputByOnes, 1],
    ["ByTens", CurrencyInputByTens, 10],
    ["ByHundreds", CurrencyInputByHundreds, 100],
    ["ByThousands", CurrencyInputByThousands, 1_000],
  ] as const)("%s ↑ moves %d, Shift ↑ to the next 10× line", (_n, Field, step) => {
    const { value, up, down } = mount(Field, 50_000);
    up();
    expect(value()).toBe(50_000 + step);
    down();
    expect(value()).toBe(50_000);
    up(true);
    expect(value()).toBe(50_000 + step * 10);
  });

  it("never makes a one-cent edit, even when the caller passes step={0.01}", () => {
    const { value, up } = mount(CurrencyInputByOnes, 450, { step: 0.01 });
    up();
    expect(value()).toBe(451);
  });

  it("snaps a cents amount to the next whole step", () => {
    const a = mount(CurrencyInputByThousands, 12_345.67);
    a.up();
    expect(a.value()).toBe(13_000);
    const b = mount(CurrencyInputByThousands, 12_345.67);
    b.down();
    expect(b.value()).toBe(12_000);
  });
});

describe("CurrencyInputByScale", () => {
  it("steps at the scale of the current value (Peter's anchors)", () => {
    const hundreds = mount(CurrencyInputByScale, 450);
    hundreds.up();
    expect(hundreds.value()).toBe(451);
    const tensOfK = mount(CurrencyInputByScale, 25_000);
    tensOfK.up();
    expect(tensOfK.value()).toBe(26_000);
    tensOfK.up(true);
    expect(tensOfK.value()).toBe(30_000);
  });

  it("is symmetric across a boundary: $9,900 ↑ $10,000 ↓ $9,900", () => {
    const { value, up, down } = mount(CurrencyInputByScale, 9_900);
    up();
    expect(value()).toBe(10_000);
    down();
    expect(value()).toBe(9_900);
  });

  it("▲▼ use the same scale", () => {
    const { value, getByLabelText } = mount(CurrencyInputByScale, 25_000);
    fireEvent.click(getByLabelText("Decrement"));
    expect(value()).toBe(24_000);
  });

  it("scaleOf fixes the step regardless of the value", () => {
    const { value, up } = mount(CurrencyInputByScale, 5, { scaleOf: 40_000 });
    up();
    expect(value()).toBe(1_000);
  });

  it("typing cents still lands exactly", () => {
    const { value, input } = mount(CurrencyInputByScale, 25_000);
    input.focus();
    input.select();
    typeText(input, "12345.67");
    fireEvent.blur(input);
    expect(value()).toBe(12_345.67);
  });

  it("keeps the plain CurrencyInput width", () => {
    const widthOf = (c: HTMLElement) =>
      (c.querySelector(".sui-currency-input") as HTMLElement).style.maxWidth;
    const plain = mount(CurrencyInput, 25_000, { maxValue: 99_999 });
    for (const Field of [CurrencyInputByScale, CurrencyInputByTens, CurrencyInputByThousands]) {
      expect(widthOf(mount(Field, 25_000, { maxValue: 99_999 }).container)).toBe(
        widthOf(plain.container),
      );
    }
  });
});
