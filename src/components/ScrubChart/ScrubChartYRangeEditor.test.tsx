// The inline fixed-range editor: the pure draft policy as a table, the editor
// on its own (keys, validation, units), and ScrubChart opening it from the
// y-axis in fixed mode only.
import { describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { fireEvent, render } from "@solidjs/testing-library";
import { draftYRange, fromFieldValue, toFieldValue, yRangeDraftTable } from "./yRange";
import { ScrubChartYRangeEditor } from "./ScrubChartYRangeEditor";
import { ScrubChart } from "./ScrubChart";
import type { ScrubChartYAxisMode } from "./types";
import { dailyCells } from "../DateAxis";

describe("draftYRange (pure)", () => {
  it("prints the policy", () => {
    expect(
      yRangeDraftTable([
        [0, 100, "number"],
        [-2_000, 10_000, "currency-cents"],
        [12.345, 50, "currency-cents"],
        [100, 100, "number"],
        [5, 1, "number"],
        [undefined, 1, "number"],
      ]),
    ).toBe(
      [
        "       min       max  field           result",
        "         0       100  number          {min: 0, max: 100}",
        "     -2000     10000  currency-cents  {min: -200000, max: 1000000}",
        "    12.345        50  currency-cents  {min: 1235, max: 5000}",
        "       100       100  number          Min must be below max",
        "         5         1  number          Min must be below max",
        "         —         1  number          Both ends are needed",
      ].join("\n"),
    );
  });

  it("round-trips cents through dollars", () => {
    expect(toFieldValue(123_456, "currency-cents")).toBe(1234.56);
    expect(fromFieldValue(1234.56, "currency-cents")).toBe(123_456);
    expect(draftYRange(1, 2, "number")).toEqual({ ok: true, range: { min: 1, max: 2 } });
  });
});

const inputs = (root: HTMLElement) =>
  // Kobalte pairs each visible input with a NAMED hidden-for-forms one.
  Array.from(root.querySelectorAll<HTMLInputElement>("input:not([name])"));

describe("ScrubChartYRangeEditor", () => {
  it("seeds Max above Min from the range, Enter applies, Escape cancels and stops", () => {
    const onApply = vi.fn();
    const onCancel = vi.fn();
    const outer = vi.fn();
    const { container } = render(() => (
      <div onKeyDown={outer}>
        <ScrubChartYRangeEditor
          initial={{ min: 10, max: 90 }}
          onApply={onApply}
          onCancel={onCancel}
        />
      </div>
    ));
    const [max, min] = inputs(container);
    expect(max.value).toBe("90");
    expect(min.value).toBe("10");
    fireEvent.keyDown(max, { key: "Enter" });
    expect(onApply).toHaveBeenCalledWith({ min: 10, max: 90 });
    fireEvent.keyDown(min, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(outer.mock.calls.some(([e]) => e.key === "Escape")).toBe(false);
  });

  it("disables Apply and says why when min is not below max", async () => {
    const onApply = vi.fn();
    const { container, findByText } = render(() => (
      <ScrubChartYRangeEditor initial={{ min: 50, max: 50 }} onApply={onApply} onCancel={() => {}} />
    ));
    expect(await findByText("Min must be below max")).toBeTruthy();
    const apply = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Apply",
    )!;
    expect(apply.disabled).toBe(true);
    fireEvent.keyDown(inputs(container)[0], { key: "Enter" });
    expect(onApply).not.toHaveBeenCalled();
  });

  it("shows dollars and emits cents for a currency-cents field", () => {
    const onApply = vi.fn();
    const { container } = render(() => (
      <ScrubChartYRangeEditor
        initial={{ min: -200_000, max: 1_000_000 }}
        field="currency-cents"
        onApply={onApply}
        onCancel={() => {}}
      />
    ));
    expect(inputs(container)[0].value).toMatch(/10,?000/);
    fireEvent.keyDown(inputs(container)[0], { key: "Enter" });
    expect(onApply).toHaveBeenCalledWith({ min: -200_000, max: 1_000_000 });
  });
});

describe("ScrubChart — the y-axis opens the editor in fixed mode", () => {
  const cells = dailyCells(new Date("2026-05-01T00:00:00Z"), new Date("2026-05-10T00:00:00Z"));
  const mount = (withCallback = true) => {
    const onYRangeChange = vi.fn();
    const [mode, setMode] = createSignal<ScrubChartYAxisMode>("fixed");
    const { container } = render(() => (
      <ScrubChart
        cells={cells}
        yDomain={[-20, 80]}
        yAxisMode={mode()}
        onYAxisModeChange={setMode}
        onYRangeChange={withCallback ? onYRangeChange : undefined}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    const hit = () => container.querySelector<HTMLButtonElement>(".sui-scrub-chart__y-axis-hit");
    const editor = () => container.querySelector(".sui-scrub-chart__y-range-editor");
    return { container, hit, editor, setMode, onYRangeChange };
  };

  it("makes the axis a button only in fixed mode with a callback", () => {
    const chart = mount();
    expect(chart.hit()?.getAttribute("aria-label")).toBe("Edit y-axis range");
    chart.setMode("auto");
    expect(chart.hit()).toBeNull();
    expect(mount(false).hit()).toBeNull();
  });

  it("opens seeded from the domain on screen, applies, and closes", () => {
    const chart = mount();
    chart.hit()!.click();
    expect(chart.editor()).toBeTruthy();
    const [max, min] = inputs(chart.editor() as HTMLElement);
    expect([max.value, min.value]).toEqual(["80", "-20"]);
    fireEvent.keyDown(max, { key: "Enter" });
    expect(chart.onYRangeChange).toHaveBeenCalledWith({ min: -20, max: 80 });
    expect(chart.editor()).toBeNull();
  });

  it("closes when the reader leaves fixed mode", () => {
    const chart = mount();
    chart.hit()!.click();
    expect(chart.editor()).toBeTruthy();
    chart.setMode("autoscale");
    expect(chart.editor()).toBeNull();
    chart.setMode("fixed");
    expect(chart.editor()).toBeNull();
  });
});
