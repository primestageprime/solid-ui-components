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

  it("renders exactly one divider for AUTO | (PROD | OFF)", () => {
    const { container } = render(() => <SegmentedControl options={OPTS} value="auto" />);
    expect(container.querySelectorAll(".sui-segmented__divider").length).toBe(1);
  });

  it("renders no divider when all options share a group", () => {
    const same: SegmentOption[] = [
      { value: "a", group: "g" },
      { value: "b", group: "g" },
    ];
    const { container } = render(() => <SegmentedControl options={same} value="a" />);
    expect(container.querySelectorAll(".sui-segmented__divider").length).toBe(0);
  });

  it("renders a divider between each distinct adjacent group", () => {
    const three: SegmentOption[] = [
      { value: "a", group: "x" },
      { value: "b", group: "y" },
      { value: "c", group: "z" },
    ];
    const { container } = render(() => <SegmentedControl options={three} value="a" />);
    expect(container.querySelectorAll(".sui-segmented__divider").length).toBe(2);
  });

  it("applies the per-state color class to the selected segment only", () => {
    const { container } = render(() => <SegmentedControl options={OPTS} value="off" />);
    const segs = container.querySelectorAll('[role="radio"]');
    expect(segs[2].classList.contains("sui-segmented__seg--danger")).toBe(true); // Off selected
    expect(segs[0].classList.contains("sui-segmented__seg--primary")).toBe(false); // Auto not selected
  });

  it("falls back to control-level color when a segment has none", () => {
    const opts: SegmentOption[] = [{ value: "a" }, { value: "b" }];
    const { container } = render(() => (
      <SegmentedControl options={opts} value="a" color="success" />
    ));
    expect(container.querySelectorAll('[role="radio"]')[0].classList.contains("sui-segmented__seg--success")).toBe(true);
  });

  it("applies the size modifier class to the container", () => {
    const { container } = render(() => <SegmentedControl options={OPTS} value="auto" size="lg" />);
    expect(container.querySelector(".sui-segmented--lg")).toBeTruthy();
  });

  it("defaults to md size", () => {
    const { container } = render(() => <SegmentedControl options={OPTS} value="auto" />);
    expect(container.querySelector(".sui-segmented--md")).toBeTruthy();
  });
});
