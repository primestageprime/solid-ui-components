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

  // ── ticks ──────────────────────────────────────────────────────────────
  // The notches are decoration over kobalte's track, so every assertion here
  // reads the DOM the consumer's stylesheet sees.
  const ticksOf = (container: HTMLElement): readonly string[] =>
    Array.from(container.querySelectorAll(".sui-slider__tick"), (tick) =>
      tick.getAttribute("data-value") ?? "",
    );

  it("renders no ticks when the prop is absent", () => {
    const { container } = render(() => (
      <Slider label="Buffer" value={6} onChange={() => {}} min={3} max={18} />
    ));
    expect(container.querySelectorAll(".sui-slider__tick")).toHaveLength(0);
  });

  it("renders no ticks for ticks={false}", () => {
    const { container } = render(() => (
      <Slider
        label="Buffer"
        value={6}
        onChange={() => {}}
        min={3}
        max={18}
        ticks={false}
      />
    ));
    expect(container.querySelectorAll(".sui-slider__tick")).toHaveLength(0);
  });

  it("ticks={true} marks every step from min to max inclusive", () => {
    const { container } = render(() => (
      <Slider
        label="Annual raise"
        value={3.5}
        onChange={() => {}}
        min={0}
        max={15}
        step={0.5}
        ticks
      />
    ));
    // 0, 0.5, … 15 — both ends carry a notch, so the count is steps + 1.
    expect(ticksOf(container)).toHaveLength(31);
  });

  it("ticks={true} stops short rather than marking past max", () => {
    const { container } = render(() => (
      <Slider
        label="Churn"
        value={4}
        onChange={() => {}}
        min={0}
        max={15}
        step={4}
        ticks
      />
    ));
    expect(ticksOf(container)).toEqual(["0", "4", "8", "12"]);
  });

  it("an explicit list marks exactly those values and ignores step", () => {
    const { container } = render(() => (
      <Slider
        label="Months to sample"
        value={6}
        onChange={() => {}}
        min={3}
        max={24}
        step={1}
        ticks={[3, 6, 12, 18, 24]}
      />
    ));
    expect(ticksOf(container)).toEqual(["3", "6", "12", "18", "24"]);
  });

  it("drops a tick outside the domain instead of pulling it to the edge", () => {
    const { container } = render(() => (
      <Slider
        label="Buffer"
        value={6}
        onChange={() => {}}
        min={3}
        max={18}
        ticks={[0, 3, 12, 18, 24]}
      />
    ));
    expect(ticksOf(container)).toEqual(["3", "12", "18"]);
  });

  it("marks a passed tick apart from one the thumb has not reached", () => {
    const { container } = render(() => (
      <Slider
        label="Buffer"
        value={10}
        onChange={() => {}}
        min={0}
        max={20}
        ticks={[0, 10, 20]}
      />
    ));
    const passed = container.querySelectorAll(".sui-slider__tick--passed");
    // The tick under the thumb counts as passed: the fill reaches it.
    expect(passed).toHaveLength(2);
  });

  it("hides every tick from the accessibility tree", () => {
    const { container } = render(() => (
      <Slider
        label="Buffer"
        value={6}
        onChange={() => {}}
        min={0}
        max={20}
        step={1}
        ticks
      />
    ));
    const hidden = container.querySelectorAll(
      '.sui-slider__tick[aria-hidden="true"]',
    );
    expect(hidden).toHaveLength(21);
  });

  it("createSlider curries a tick set alongside the formatter", () => {
    const QuarterSlider = createSlider({
      format: (n) => `${n}%`,
      ticks: [0, 25, 50, 75, 100],
    });
    const { container, getByText } = render(() => (
      <QuarterSlider label="Share" value={40} onChange={() => {}} min={0} max={100} />
    ));
    expect(getByText("40%")).toBeTruthy();
    expect(ticksOf(container)).toEqual(["0", "25", "50", "75", "100"]);
  });

  it("createSlider curries the formatter", () => {
    const MonthsSlider = createSlider({ format: (n) => `${n} months` });
    const { getByText } = render(() => (
      <MonthsSlider label="Runway" value={12} onChange={() => {}} min={3} max={18} />
    ));
    expect(getByText("12 months")).toBeTruthy();
  });
});
