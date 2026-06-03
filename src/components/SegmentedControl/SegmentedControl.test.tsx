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
});
