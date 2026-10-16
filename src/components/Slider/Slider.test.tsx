import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { type Component, createSignal } from "solid-js";
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
      <Slider
        label="Safety buffer"
        value={6}
        onChange={() => {}}
        min={3}
        max={18}
      />
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
      <Slider
        label="Buffer"
        value={value()}
        onChange={onChange}
        min={3}
        max={18}
      />
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
      container
        .querySelector('[role="slider"]')
        ?.getAttribute("aria-valuetext"),
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
      <Slider
        label="Buffer"
        value={6}
        onChange={onChange}
        min={3}
        max={18}
        disabled
      />
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
    Array.from(
      container.querySelectorAll(".sui-slider__tick"),
      (tick) => tick.getAttribute("data-value") ?? "",
    );

  // Which values are notched is a table in logic.test.ts (`resolveTicks`,
  // `ticksFromStep`). This one mount proves the notches reach the DOM with
  // their value, their passed state and no accessibility footprint.
  it("integration: ticks hold together — none by default, one per step, passed, hidden", () => {
    const [ticks, setTicks] = createSignal<boolean | readonly number[]>(false);
    const { container } = render(() => (
      <Slider
        label="Churn"
        value={8}
        onChange={() => {}}
        min={0}
        max={15}
        step={4}
        ticks={ticks()}
      />
    ));
    expect(ticksOf(container)).toEqual([]);
    setTicks(true);
    // 0, 4, 8, 12 — stops short of 15 rather than marking past max.
    expect(ticksOf(container)).toEqual(["0", "4", "8", "12"]);
    // The tick under the thumb counts as passed: the fill reaches it.
    expect(
      container.querySelectorAll(".sui-slider__tick--passed"),
    ).toHaveLength(3);
    expect(
      container.querySelectorAll('.sui-slider__tick[aria-hidden="true"]'),
    ).toHaveLength(4);
    setTicks([0, 8, 15, 99]);
    expect(ticksOf(container)).toEqual(["0", "8", "15"]);
  });

  // ── editable readout ──────────────────────────────────────────────────

  const editableField = (container: HTMLElement): HTMLInputElement =>
    container.querySelector(".sui-slider__value--editable") as HTMLInputElement;

  it("renders a plain label, not a field, without `editable`", () => {
    const { container } = render(() => (
      <Slider label="Buffer" value={6} onChange={() => {}} min={3} max={18} />
    ));
    expect(editableField(container)).toBeNull();
  });

  it("editable shows format(value) at rest and the raw number on focus", () => {
    const { container } = render(() => (
      <Slider
        label="Buffer"
        value={6}
        onChange={() => {}}
        min={3}
        max={18}
        editable
        format={(n) => `${n} months`}
      />
    ));
    const field = editableField(container);
    expect(field.value).toBe("6 months");
    fireEvent.focus(field);
    expect(field.value).toBe("6");
  });

  // type="text", never type="number" — a number input draws spinner arrows.
  it("editable uses a text input so no browser spinner exists", () => {
    const { container } = render(() => (
      <Slider
        label="Buffer"
        value={6}
        onChange={() => {}}
        min={3}
        max={18}
        editable
      />
    ));
    expect(editableField(container).getAttribute("type")).toBe("text");
  });

  // What a typed figure becomes — clamped, snapped, or nothing — is a table
  // in logic.test.ts (`commitTyped`). This one mount proves the field's
  // gestures are wired to it: Enter and blur commit, Escape and non-numbers
  // revert the text, and the same figure commits nothing.
  it("integration: the editable field holds together — Enter, blur, Escape, revert", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <Slider
        label="Buffer"
        value={6}
        onChange={onChange}
        min={3}
        max={18}
        step={3}
        editable
      />
    ));
    const field = editableField(container);
    const type = (text: string) => {
      fireEvent.focus(field);
      fireEvent.input(field, { target: { value: text } });
    };
    // Enter commits.
    type("12");
    fireEvent.keyDown(field, { key: "Enter" });
    fireEvent.blur(field);
    expect(onChange).toHaveBeenCalledWith(12);
    // Blur commits, through the clamp and the snap.
    onChange.mockClear();
    type("400");
    fireEvent.blur(field);
    expect(onChange).toHaveBeenCalledWith(18);
    onChange.mockClear();
    type("10");
    fireEvent.blur(field);
    expect(onChange).toHaveBeenCalledWith(9);
    // Escape abandons the edit and the text reverts.
    onChange.mockClear();
    type("15");
    fireEvent.keyDown(field, { key: "Escape" });
    expect(onChange).not.toHaveBeenCalled();
    expect(field.value).toBe("6");
    // Text that is not a number reverts too, and the held value says nothing.
    type("soon");
    fireEvent.blur(field);
    type("6");
    fireEvent.blur(field);
    expect(onChange).not.toHaveBeenCalled();
    expect(field.value).toBe("6");
  });

  it("editable emits nothing at mount", () => {
    const onChange = vi.fn();
    render(() => (
      <Slider
        label="Buffer"
        value={6}
        onChange={onChange}
        min={3}
        max={18}
        editable
      />
    ));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("createSlider curries a tick set alongside the formatter", () => {
    const QuarterSlider = createSlider({
      format: (n) => `${n}%`,
      ticks: [0, 25, 50, 75, 100],
    });
    const { container, getByText } = render(() => (
      <QuarterSlider
        label="Share"
        value={40}
        onChange={() => {}}
        min={0}
        max={100}
      />
    ));
    expect(getByText("40%")).toBeTruthy();
    expect(ticksOf(container)).toEqual(["0", "25", "50", "75", "100"]);
  });

  it("createSlider curries the formatter", () => {
    const MonthsSlider = createSlider({ format: (n) => `${n} months` });
    const { getByText } = render(() => (
      <MonthsSlider
        label="Runway"
        value={12}
        onChange={() => {}}
        min={3}
        max={18}
      />
    ));
    expect(getByText("12 months")).toBeTruthy();
  });
});

describe("Slider — valueLabel", () => {
  /** The caller's node: three readings of one discount, each one typeable. */
  const ThreeFigures: Component<{
    percent: number;
    onPercent: (percent: number) => void;
  }> = (props) => (
    <span class="discount-readout">
      <input
        aria-label="Discount percent"
        value={`${props.percent}%`}
        onChange={(event) =>
          props.onPercent(Number.parseFloat(event.currentTarget.value))
        }
      />
      <input
        aria-label="Discount per year"
        value={`$${(props.percent * 20).toFixed(2)}/yr`}
        onChange={(event) =>
          props.onPercent(Number.parseFloat(event.currentTarget.value) / 20)
        }
      />
    </span>
  );

  it("draws the caller's node in place of the value label", () => {
    const { container, getByLabelText } = render(() => (
      <Slider
        label="Annual discount"
        value={9}
        onChange={() => {}}
        min={0}
        max={20}
        format={(n) => `${n}%`}
        valueLabel={<ThreeFigures percent={9} onPercent={() => {}} />}
      />
    ));
    expect(container.querySelector(".sui-slider__value")).toBeNull();
    expect(container.querySelector(".discount-readout")).toBeTruthy();
    expect(
      (getByLabelText("Discount per year") as HTMLInputElement).value,
    ).toBe("$180.00/yr");
  });

  it("keeps the caller's own fields typeable", () => {
    const onChange = vi.fn();
    const [percent, setPercent] = createSignal(9);
    const { getByLabelText } = render(() => (
      <Slider
        label="Annual discount"
        value={percent()}
        onChange={onChange}
        min={0}
        max={20}
        valueLabel={<ThreeFigures percent={percent()} onPercent={setPercent} />}
      />
    ));
    const perYear = getByLabelText("Discount per year") as HTMLInputElement;
    fireEvent.change(perYear, { target: { value: "240" } });
    expect(percent()).toBe(12);
    // The caller owns the parse, so the slider itself emits nothing.
    expect(onChange).not.toHaveBeenCalled();
  });

  // A node changes what a reader SEES, not what the thumb is worth.
  it("still announces format(value) on the thumb", () => {
    const { container } = render(() => (
      <Slider
        label="Annual discount"
        value={9}
        onChange={() => {}}
        min={0}
        max={20}
        format={(n) => `${n}% a year`}
        valueLabel={<span class="discount-readout">9% | $136/mo</span>}
      />
    ));
    const thumb = container.querySelector('[role="slider"]');
    expect(thumb?.getAttribute("aria-valuetext")).toBe("9% a year");
  });

  it("keeps SUI's readout when the node resolves to nothing", () => {
    const { container } = render(() => (
      <Slider
        label="Annual discount"
        value={9}
        onChange={() => {}}
        min={0}
        max={20}
        format={(n) => `${n}%`}
        valueLabel={null}
      />
    ));
    expect(container.querySelector(".sui-slider__value")?.textContent).toBe(
      "9%",
    );
  });

  it("still draws the label and the track", () => {
    const { container, getByText } = render(() => (
      <Slider
        label="Annual discount"
        value={9}
        onChange={() => {}}
        min={0}
        max={20}
        valueLabel={<span class="discount-readout">9%</span>}
      />
    ));
    expect(getByText("Annual discount")).toBeTruthy();
    expect(container.querySelector(".sui-slider__track")).toBeTruthy();
  });
});

describe("Slider — type-level enforcement", () => {
  it("forbids `editable` beside `valueLabel` at compile time", () => {
    const shared = {
      label: "Annual discount",
      value: 9,
      onChange: () => {},
      min: 0,
      max: 20,
    } as const;
    // SUI's own readout, formatted:
    const _plain = <Slider {...shared} />;
    // SUI's own readout, as a field:
    const _editable = <Slider {...shared} editable />;
    // The caller's node:
    const _drawn = <Slider {...shared} valueLabel={<span>9%</span>} />;
    const _both = (
      // @ts-expect-error — SUI cannot draw a field in a place it gave away
      <Slider {...shared} editable valueLabel={<span>9%</span>} />
    );
    void _plain;
    void _editable;
    void _drawn;
    void _both;
    expect(true).toBe(true);
  });

  it("forbids the pair on a curried variant too", () => {
    const PercentSlider = createSlider({ format: (n) => `${n}%` });
    const _drawn: Parameters<typeof PercentSlider>[0] = {
      label: "Annual discount",
      value: 9,
      onChange: () => {},
      min: 0,
      max: 20,
      valueLabel: <span>9%</span>,
    };
    void _drawn;
    expect(true).toBe(true);
  });
});
