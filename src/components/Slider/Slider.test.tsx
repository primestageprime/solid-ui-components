import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Slider, createSlider } from "./Slider";
import { installFakeSizer, type FakeSizer } from "../../test-utils";

// Kobalte's Slider measures its track through ResizeObserver; jsdom lacks it.
let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

describe("Slider", () => {
  it("renders a labelled slider carrying the current value", () => {
    const { container, getByText } = render(() => (
      <Slider label="Safety buffer" value={6} onChange={() => {}} min={3} max={18} />
    ));
    const thumb = container.querySelector('[role="slider"]');
    expect(thumb).toBeTruthy();
    expect(thumb?.getAttribute("aria-valuenow")).toBe("6");
    expect(thumb?.getAttribute("aria-valuemin")).toBe("3");
    expect(thumb?.getAttribute("aria-valuemax")).toBe("18");
    expect(getByText("Safety buffer")).toBeTruthy();
  });

  // The reason this component exists rather than reusing ThemedNumberInput,
  // which fires one onChange(undefined) at mount. A dial that persists on
  // every change would write that mount value over the stored one.
  it("does NOT emit onChange at mount", () => {
    const onChange = vi.fn();
    render(() => (
      <Slider label="Buffer" value={6} onChange={onChange} min={3} max={18} />
    ));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not emit onChange when the value prop changes", () => {
    const onChange = vi.fn();
    const [value, setValue] = createSignal(6);
    render(() => (
      <Slider label="Buffer" value={value()} onChange={onChange} min={3} max={18} />
    ));
    setValue(9);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("emits the raw number, unwrapped from kobalte's array, on an arrow key", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <Slider label="Buffer" value={6} onChange={onChange} min={3} max={18} />
    ));
    const thumb = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(thumb, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("moves by step, and Home and End go to the domain ends", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <Slider
        label="Draw"
        value={50}
        onChange={onChange}
        min={0}
        max={100}
        step={10}
      />
    ));
    const thumb = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(thumb, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(60);
    // Home and End act on the FOCUSED thumb, so they are no-ops until the
    // thumb has taken focus. Arrow keys carry the index and need no focus.
    fireEvent.focus(thumb);
    fireEvent.keyDown(thumb, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(thumb, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith(100);
  });

  it("prints format(value) on the label line and in aria-valuetext", () => {
    const { container, getByText } = render(() => (
      <Slider
        label="Runway"
        value={6}
        onChange={() => {}}
        min={3}
        max={18}
        format={(n) => `${n} months`}
      />
    ));
    expect(getByText("6 months")).toBeTruthy();
    expect(
      container.querySelector('[role="slider"]')?.getAttribute("aria-valuetext"),
    ).toBe("6 months");
  });

  it("leaves the value in the consumer's units — it formats nothing itself", () => {
    // 600_000 integer cents rendered as dollars: the widget never sees a dollar.
    const onChange = vi.fn();
    const { getByText, container } = render(() => (
      <Slider
        label="Monthly draw"
        value={600_000}
        onChange={onChange}
        min={0}
        max={1_000_000}
        step={10_000}
        format={(c) => `$${c / 100}/mo`}
      />
    ));
    expect(getByText("$6000/mo")).toBeTruthy();
    const thumb = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(thumb, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(610_000);
  });

  it("marks the root disabled and stops the keyboard when disabled", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <Slider label="Buffer" value={6} onChange={onChange} min={3} max={18} disabled />
    ));
    expect(container.querySelector(".sui-slider[data-disabled]")).toBeTruthy();
    const thumb = container.querySelector('[role="slider"]') as HTMLElement;
    fireEvent.keyDown(thumb, { key: "ArrowRight" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("createSlider curries the formatter", () => {
    const MonthsSlider = createSlider({ format: (n) => `${n} months` });
    const { getByText } = render(() => (
      <MonthsSlider label="Runway" value={12} onChange={() => {}} min={3} max={18} />
    ));
    expect(getByText("12 months")).toBeTruthy();
  });
});
