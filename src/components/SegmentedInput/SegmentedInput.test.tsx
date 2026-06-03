import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { SegmentedInput, createSegmentedInput } from "./SegmentedInput";

const OPTIONS = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

describe("SegmentedInput", () => {
  it("renders one segment per option", () => {
    const { container } = render(() => (
      <SegmentedInput options={OPTIONS} value="day" onChange={() => {}} />
    ));
    const segs = container.querySelectorAll(".sui-segmented__segment");
    expect(segs.length).toBe(3);
    expect(segs[0].textContent).toBe("Day");
    expect(segs[2].textContent).toBe("Month");
  });

  it("highlights the selected segment", () => {
    const { container } = render(() => (
      <SegmentedInput options={OPTIONS} value="week" onChange={() => {}} />
    ));
    const selected = container.querySelectorAll(
      ".sui-segmented__segment--selected",
    );
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toBe("Week");
    expect(selected[0].getAttribute("aria-checked")).toBe("true");
  });

  it("calls onChange with the clicked option id", () => {
    let got: string | null = null;
    const { container } = render(() => (
      <SegmentedInput
        options={OPTIONS}
        value="day"
        onChange={(id) => (got = id)}
      />
    ));
    const segs = container.querySelectorAll(".sui-segmented__segment");
    fireEvent.click(segs[2]);
    expect(got).toBe("month");
  });

  it("renders segments as focusable buttons in a radiogroup", () => {
    const { container } = render(() => (
      <SegmentedInput options={OPTIONS} value="day" onChange={() => {}} />
    ));
    const root = container.firstElementChild!;
    expect(root.getAttribute("role")).toBe("radiogroup");
    const seg = container.querySelector(".sui-segmented__segment")!;
    expect(seg.tagName).toBe("BUTTON");
  });

  it("createSegmentedInput bakes defaults", () => {
    const Seg = createSegmentedInput({ value: "day" });
    const { container } = render(() => (
      <Seg options={OPTIONS} value="day" onChange={() => {}} />
    ));
    const selected = container.querySelectorAll(
      ".sui-segmented__segment--selected",
    );
    expect(container.querySelectorAll(".sui-segmented__segment").length).toBe(3);
    expect(selected[0].textContent).toBe("Day");
  });
});

describe("SegmentedInput — compact (stepper) mode", () => {
  it("renders a stepper with current label and two chevrons, not the strip", () => {
    const { container } = render(() => (
      <SegmentedInput options={OPTIONS} value="week" onChange={() => {}} compact />
    ));
    // No full-strip segments.
    expect(
      container.querySelectorAll(".sui-segmented__segment").length,
    ).toBe(0);
    const stepper = container.querySelector(".sui-segmented-stepper")!;
    expect(stepper).toBeTruthy();
    const chevrons = container.querySelectorAll(
      ".sui-segmented-stepper__chevron",
    );
    expect(chevrons.length).toBe(2);
    expect(
      container.querySelector(".sui-segmented-stepper__label")!.textContent,
    ).toBe("Week");
  });

  it("› calls onChange with the next option id", () => {
    let got: string | null = null;
    const { container } = render(() => (
      <SegmentedInput
        options={OPTIONS}
        value="day"
        onChange={(id) => (got = id)}
        compact
      />
    ));
    const chevrons = container.querySelectorAll(
      ".sui-segmented-stepper__chevron",
    );
    fireEvent.click(chevrons[1]); // next
    expect(got).toBe("week");
  });

  it("‹ calls onChange with the previous option id", () => {
    let got: string | null = null;
    const { container } = render(() => (
      <SegmentedInput
        options={OPTIONS}
        value="week"
        onChange={(id) => (got = id)}
        compact
      />
    ));
    const chevrons = container.querySelectorAll(
      ".sui-segmented-stepper__chevron",
    );
    fireEvent.click(chevrons[0]); // prev
    expect(got).toBe("day");
  });

  it("clamps at the first option: ‹ is disabled and does not change", () => {
    let called = false;
    const { container } = render(() => (
      <SegmentedInput
        options={OPTIONS}
        value="day"
        onChange={() => (called = true)}
        compact
      />
    ));
    const prev = container.querySelectorAll(
      ".sui-segmented-stepper__chevron",
    )[0] as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    fireEvent.click(prev);
    expect(called).toBe(false);
  });

  it("clamps at the last option: › is disabled and does not change", () => {
    let called = false;
    const { container } = render(() => (
      <SegmentedInput
        options={OPTIONS}
        value="month"
        onChange={() => (called = true)}
        compact
      />
    ));
    const next = container.querySelectorAll(
      ".sui-segmented-stepper__chevron",
    )[1] as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    fireEvent.click(next);
    expect(called).toBe(false);
  });

  it("arrow keys step prev/next when focused", () => {
    const got: string[] = [];
    const { container } = render(() => (
      <SegmentedInput
        options={OPTIONS}
        value="week"
        onChange={(id) => got.push(id)}
        compact
      />
    ));
    const stepper = container.querySelector(".sui-segmented-stepper")!;
    fireEvent.keyDown(stepper, { key: "ArrowRight" });
    fireEvent.keyDown(stepper, { key: "ArrowLeft" });
    expect(got).toEqual(["month", "day"]);
  });
});
