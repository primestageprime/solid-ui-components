import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { StatusChip } from "./StatusChip";
import { StatusChipDisplay } from "./StatusChipDisplay";
import { statusChipWidthCh } from "./StatusChip";

afterEach(cleanup);

const OPTIONS = ["todo", "doing", "blocked", "done"];

describe("statusChipWidthCh", () => {
  it("is the longest of the status and the options, plus one", () => {
    expect([
      statusChipWidthCh("todo"),
      statusChipWidthCh("todo", OPTIONS),
      statusChipWidthCh("in review", OPTIONS),
    ]).toEqual([5, 8, 10]);
  });
});

describe("StatusChipDisplay", () => {
  it("shows the status", () => {
    const { getByText } = render(() => <StatusChipDisplay status="doing" />);
    expect(getByText("doing")).toBeTruthy();
  });

  it("is inert: no button, no input, no caret, no menu", () => {
    const { container } = render(() => (
      <StatusChipDisplay status="doing" options={OPTIONS} />
    ));
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector(".sui-status-chip__caret")).toBeNull();
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it("is as wide as an editable chip with the same options, so they line up", () => {
    const shown = render(() => <StatusChipDisplay status="done" options={OPTIONS} />);
    const shownWidth = (shown.container.firstElementChild as HTMLElement).style.width;
    cleanup();
    const editable = render(() => (
      <StatusChip status="done" options={OPTIONS} title="task" onChange={() => {}} />
    ));
    const editableWidth = (editable.container.firstElementChild as HTMLElement).style.width;
    expect(shownWidth).toBe("8ch");
    expect(shownWidth).toBe(editableWidth);
  });

  it("highlight fills the pill like StatusChip", () => {
    const { container } = render(() => <StatusChipDisplay status="doing" highlight />);
    const chip = container.firstElementChild as HTMLElement;
    expect(chip.classList.contains("sui-status-chip--highlight")).toBe(true);
    expect(chip.classList.contains("sui-status-chip--display")).toBe(true);
  });
});
