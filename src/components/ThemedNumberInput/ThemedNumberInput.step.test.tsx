import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { ThemedNumberInput } from "./ThemedNumberInput";
import { installFakeSizer, type FakeSizer } from "../../test-utils";

let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

const mount = (start: number, props: Record<string, unknown> = {}) => {
  const [value, setValue] = createSignal<number | undefined>(start);
  const view = render(() => (
    <ThemedNumberInput name="v" value={value} onChange={setValue} {...props} />
  ));
  const input = view.container.querySelector(
    ".sui-number-input__input",
  ) as HTMLInputElement;
  return { value, input, ...view };
};

describe("ThemedNumberInput arrow step", () => {
  // Kobalte snaps every vary to the grid of the step it moves by, so a Shift
  // move lands on the next multiple of 10× (as PageUp/PageDown always did).
  it("↑/↓ move one step; Shift+↑/↓ move to the next 10× grid line", () => {
    const { value, input } = mount(100, { step: 5 });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(value()).toBe(105);
    fireEvent.keyDown(input, { key: "ArrowUp", shiftKey: true });
    expect(value()).toBe(150);
    fireEvent.keyDown(input, { key: "ArrowUp", shiftKey: true });
    expect(value()).toBe(200);
    fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });
    expect(value()).toBe(150);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(value()).toBe(145);
  });

  it("shift-click on ▲▼ moves ten steps; a plain click one", () => {
    const { value, getByLabelText } = mount(100, { step: 5 });
    fireEvent.click(getByLabelText("Increment"), { shiftKey: true });
    expect(value()).toBe(150);
    fireEvent.click(getByLabelText("Increment"));
    expect(value()).toBe(155);
    fireEvent.click(getByLabelText("Decrement"), { shiftKey: true });
    expect(value()).toBe(150);
  });

  it("Shift+arrow does nothing on a read-only field", () => {
    const { value, input } = mount(100, { step: 5, readOnly: true });
    fireEvent.keyDown(input, { key: "ArrowUp", shiftKey: true });
    expect(value()).toBe(100);
  });

  it("stepFor gets the current value and the direction", () => {
    const calls: [number, number][] = [];
    const stepFor = (v: number, dir: 1 | -1) => {
      calls.push([v, dir]);
      return dir === 1 ? 10 : 1;
    };
    const { value, input, getByLabelText } = mount(50, { stepFor });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(value()).toBe(60);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(value()).toBe(59);
    fireEvent.click(getByLabelText("Increment"));
    expect(value()).toBe(60);
    fireEvent.click(getByLabelText("Decrement"), { shiftKey: true });
    expect(value()).toBe(50);
    expect(calls.some(([v, d]) => v === 60 && d === -1)).toBe(true);
  });

  it("stepFor never changes the field's width (sized from the static step)", () => {
    const widthOf = (c: HTMLElement) =>
      (c.querySelector(".sui-number-input") as HTMLElement).style.maxWidth;
    const a = mount(5, { max: 100_000 });
    const b = mount(50_000, { max: 100_000, stepFor: () => 1_000 });
    expect(widthOf(b.container)).toBe(widthOf(a.container));
  });
});
