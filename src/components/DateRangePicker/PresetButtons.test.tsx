import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { PresetButtons } from "./PresetButtons";
import type { DateRangePreset } from "./types";

const preset = (label: string, days: number): DateRangePreset => ({
  label,
  days,
});

const buttons = (c: HTMLElement) => [
  ...c.querySelectorAll(".sui-drp__preset-btn"),
];

describe("PresetButtons — when it renders at all", () => {
  // The guard is `Show when={props.presets?.length}` — a LENGTH, not a
  // null-check. Both the undefined and the empty-array cases must render
  // nothing, including the WrapRow wrapper: an empty preset row still costs
  // its gap and border in the layout above the calendar.
  it("renders nothing when presets are undefined", () => {
    const { container } = render(() => (
      <PresetButtons presets={undefined} onSelect={() => {}} />
    ));
    expect(container.querySelector(".sui-drp__presets")).toBeNull();
  });

  it("renders nothing — not an empty row — for an empty preset list", () => {
    const { container } = render(() => (
      <PresetButtons presets={[]} onSelect={() => {}} />
    ));
    expect(container.querySelector(".sui-drp__presets")).toBeNull();
    expect(buttons(container)).toHaveLength(0);
  });

  it("renders the row once there is at least one preset", () => {
    const { container } = render(() => (
      <PresetButtons presets={[preset("Today", 0)]} onSelect={() => {}} />
    ));
    expect(container.querySelector(".sui-drp__presets")).not.toBeNull();
  });
});

describe("PresetButtons — chips", () => {
  it("renders one labelled chip per preset, in order", () => {
    const { container } = render(() => (
      <PresetButtons
        presets={[preset("Today", 0), preset("Last 7 days", 7), preset("This month", 30)]}
        onSelect={() => {}}
      />
    ));
    expect(buttons(container).map((b) => b.textContent)).toEqual([
      "Today",
      "Last 7 days",
      "This month",
    ]);
  });

  // type="button" is load-bearing: these chips sit inside a picker that may be
  // mounted in a form, and the default type is "submit".
  it("marks every chip type=button so it cannot submit a surrounding form", () => {
    const { container } = render(() => (
      <PresetButtons
        presets={[preset("Today", 0), preset("Yesterday", 1)]}
        onSelect={() => {}}
      />
    ));
    for (const b of buttons(container)) {
      expect(b.getAttribute("type")).toBe("button");
    }
  });

  it("hands the clicked preset object itself to onSelect", () => {
    const onSelect = vi.fn();
    const presets = [preset("Today", 0), preset("Last 7 days", 7)];
    const { container } = render(() => (
      <PresetButtons presets={presets} onSelect={onSelect} />
    ));
    fireEvent.click(buttons(container)[1]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    // Identity matters: DateRangePicker reads `days` off the object it is
    // handed to build `[now - days, now]`. Passing a copy would still work
    // today, but passing just the label — the tempting simplification, since
    // the label is all this component renders — would not.
    expect(onSelect.mock.calls[0][0]).toBe(presets[1]);
  });
});
