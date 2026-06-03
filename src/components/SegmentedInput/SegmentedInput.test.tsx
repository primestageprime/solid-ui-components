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
