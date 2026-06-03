import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { SegmentedControl, createSegmentedControl } from "./index";
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

  it("updates selected segment reactively when value changes", () => {
    const [value, setValue] = createSignal("auto");
    const { container } = render(() => <SegmentedControl options={OPTS} value={value()} />);
    const segs = container.querySelectorAll('[role="radio"]');
    expect(segs[0].classList.contains("sui-segmented__seg--selected")).toBe(true);
    expect(segs[0].getAttribute("aria-checked")).toBe("true");

    setValue("off");
    expect(segs[0].classList.contains("sui-segmented__seg--selected")).toBe(false);
    expect(segs[0].getAttribute("aria-checked")).toBe("false");
    expect(segs[2].classList.contains("sui-segmented__seg--selected")).toBe(true);
    expect(segs[2].getAttribute("aria-checked")).toBe("true");
    expect(segs[2].classList.contains("sui-segmented__seg--danger")).toBe(true);
  });

  it("gives the selected segment tabindex 0 and the rest -1", () => {
    const { container } = render(() => <SegmentedControl options={OPTS} value="prod" />);
    const segs = container.querySelectorAll('[role="radio"]');
    expect(segs[0].getAttribute("tabindex")).toBe("-1");
    expect(segs[1].getAttribute("tabindex")).toBe("0"); // Prod selected
    expect(segs[2].getAttribute("tabindex")).toBe("-1");
  });

  it("ArrowRight moves selection to the next segment", () => {
    const onValueChange = vi.fn();
    const { container } = render(() => (
      <SegmentedControl options={OPTS} value="auto" onValueChange={onValueChange} />
    ));
    fireEvent.keyDown(container.querySelector('[role="radiogroup"]')!, { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenCalledWith("prod");
  });

  it("ArrowLeft from the first segment wraps to the last", () => {
    const onValueChange = vi.fn();
    const { container } = render(() => (
      <SegmentedControl options={OPTS} value="auto" onValueChange={onValueChange} />
    ));
    fireEvent.keyDown(container.querySelector('[role="radiogroup"]')!, { key: "ArrowLeft" });
    expect(onValueChange).toHaveBeenCalledWith("off");
  });

  it("Home selects the first, End selects the last", () => {
  // Home/End are value-independent, so firing both against one render is valid.
    const onValueChange = vi.fn();
    const { container } = render(() => (
      <SegmentedControl options={OPTS} value="prod" onValueChange={onValueChange} />
    ));
    const group = container.querySelector('[role="radiogroup"]')!;
    fireEvent.keyDown(group, { key: "Home" });
    expect(onValueChange).toHaveBeenLastCalledWith("auto");
    fireEvent.keyDown(group, { key: "End" });
    expect(onValueChange).toHaveBeenLastCalledWith("off");
  });

  it("does not fire onValueChange when a disabled segment is clicked", () => {
    const onValueChange = vi.fn();
    const opts: SegmentOption[] = [
      { value: "a" },
      { value: "b", disabled: true },
    ];
    const { container } = render(() => (
      <SegmentedControl options={opts} value="a" onValueChange={onValueChange} />
    ));
    fireEvent.click(container.querySelectorAll('[role="radio"]')[1]);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("keyboard nav skips disabled segments", () => {
    const onValueChange = vi.fn();
    const opts: SegmentOption[] = [
      { value: "a" },
      { value: "b", disabled: true },
      { value: "c" },
    ];
    const { container } = render(() => (
      <SegmentedControl options={opts} value="a" onValueChange={onValueChange} />
    ));
    fireEvent.keyDown(container.querySelector('[role="radiogroup"]')!, { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenCalledWith("c"); // skipped "b"
  });

  it("a fully-disabled control ignores clicks and sets aria-disabled", () => {
    const onValueChange = vi.fn();
    const { container } = render(() => (
      <SegmentedControl options={OPTS} value="auto" disabled onValueChange={onValueChange} />
    ));
    expect(container.querySelector('[role="radiogroup"]')!.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(container.querySelectorAll('[role="radio"]')[1]);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("suppresses keyboard nav when the whole control is disabled", () => {
    const onValueChange = vi.fn();
    const { container } = render(() => (
      <SegmentedControl options={OPTS} value="auto" disabled onValueChange={onValueChange} />
    ));
    fireEvent.keyDown(container.querySelector('[role="radiogroup"]')!, { key: "ArrowRight" });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("createSegmentedControl bakes options into a data-only variant", () => {
    const ModeControl = createSegmentedControl({
      options: [
        { value: "auto", label: "Auto", group: "mode" },
        { value: "prod", label: "Prod", group: "override", color: "success" },
        { value: "off", label: "Off", group: "override", color: "danger" },
      ],
    });
    const onValueChange = vi.fn();
    const { container } = render(() => <ModeControl value="off" onValueChange={onValueChange} />);
    const segs = container.querySelectorAll('[role="radio"]');
    expect([...segs].map((s) => s.textContent)).toEqual(["Auto", "Prod", "Off"]);
    expect(container.querySelectorAll(".sui-segmented__divider").length).toBe(1);
    expect(segs[2].classList.contains("sui-segmented__seg--danger")).toBe(true);
    fireEvent.click(segs[0]); // Auto
    expect(onValueChange).toHaveBeenCalledWith("auto");
  });

  it("per-segment color overrides control-level color", () => {
    const opts: SegmentOption[] = [{ value: "a", color: "danger" }, { value: "b" }];
    const { container } = render(() => (
      <SegmentedControl options={opts} value="a" color="success" />
    ));
    const seg = container.querySelectorAll('[role="radio"]')[0];
    expect(seg.classList.contains("sui-segmented__seg--danger")).toBe(true);
    expect(seg.classList.contains("sui-segmented__seg--success")).toBe(false);
  });

  it("renders a divider at a group boundary even when a boundary segment is disabled, and keyboard nav skips it across the group", () => {
    const onValueChange = vi.fn();
    const opts: SegmentOption[] = [
      { value: "auto", group: "mode" },
      { value: "prod", group: "override", disabled: true },
      { value: "off", group: "override" },
    ];
    const { container } = render(() => (
      <SegmentedControl options={opts} value="auto" onValueChange={onValueChange} />
    ));
    expect(container.querySelectorAll(".sui-segmented__divider").length).toBe(1);
    fireEvent.keyDown(container.querySelector('[role="radiogroup"]')!, { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenCalledWith("off"); // skipped disabled "prod"
  });
});
