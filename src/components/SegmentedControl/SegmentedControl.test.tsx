import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { SegmentedControl, createSegmentedControl, OverrideToggle } from "./index";
import type { SegmentOption } from "./index";

const OPTS: SegmentOption[] = [
  { value: "auto", label: "Auto", group: "mode", color: "primary" },
  { value: "prod", label: "Prod", group: "override", color: "primary" },
  { value: "off", label: "Off", group: "override", color: "danger" },
];

describe("SegmentedControl", () => {
  it("renders one segment per option with role=radio", () => {
    const { container } = render(() => <SegmentedControl options={OPTS} value="auto" />);
    const segs = container.querySelectorAll('[role="radio"]');
    expect(segs.length).toBe(3);
    expect(container.querySelector('[role="radiogroup"]')).toBeTruthy();
  });

  it("falls back to value when label is omitted", () => {
    const { container } = render(() => (
      <SegmentedControl options={[{ value: "solo" }]} value="solo" />
    ));
    expect(container.querySelector('[role="radio"]')!.textContent).toBe("solo");
  });

  it("marks the selected segment with aria-checked + selected class", () => {
    const { container } = render(() => <SegmentedControl options={OPTS} value="prod" />);
    const prod = container.querySelectorAll('[role="radio"]')[1];
    expect(prod.getAttribute("aria-checked")).toBe("true");
    expect(prod.classList.contains("sui-segmented__seg--selected")).toBe(true);
  });

  it("clicking an unselected segment fires onValueChange with its value", () => {
    const onValueChange = vi.fn();
    const { container } = render(() => (
      <SegmentedControl options={OPTS} value="auto" onValueChange={onValueChange} />
    ));
    fireEvent.click(container.querySelectorAll('[role="radio"]')[2]); // Off
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("off");
  });

  it("clicking the already-selected segment does not fire onValueChange", () => {
    const onValueChange = vi.fn();
    const { container } = render(() => (
      <SegmentedControl options={OPTS} value="auto" onValueChange={onValueChange} />
    ));
    fireEvent.click(container.querySelectorAll('[role="radio"]')[0]); // Auto (already selected)
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
