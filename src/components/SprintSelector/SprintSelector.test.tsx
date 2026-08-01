import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { SprintSelector, type SprintSummary } from "./SprintSelector";

const sprint = (label: string, pc = 1): SprintSummary => ({
  label,
  planned_complete: pc,
  planned_incomplete: 1,
  unplanned_complete: 0,
  unplanned_incomplete: 0,
});

describe("SprintSelector", () => {
  it("renders one bar-group per sprint with its label", () => {
    const { container, getByText } = render(() => (
      <SprintSelector sprints={[sprint("W1"), sprint("W2")]} />
    ));
    const groups = container.querySelectorAll(
      ".sui-sprint-selector__bar-group",
    );
    expect(groups.length).toBe(2);
    expect(getByText("W1")).toBeTruthy();
    expect(getByText("W2")).toBeTruthy();
  });

  it("marks the selected index with the selected modifier", () => {
    const { container } = render(() => (
      <SprintSelector sprints={[sprint("W1"), sprint("W2")]} selectedIndex={1} />
    ));
    const groups = container.querySelectorAll(
      ".sui-sprint-selector__bar-group",
    );
    expect(
      groups[0].classList.contains("sui-sprint-selector__bar-group--selected"),
    ).toBe(false);
    expect(
      groups[1].classList.contains("sui-sprint-selector__bar-group--selected"),
    ).toBe(true);
  });

  it("fires onSelect with the clicked index", () => {
    const onSelect = vi.fn();
    const { container } = render(() => (
      <SprintSelector
        sprints={[sprint("W1"), sprint("W2")]}
        onSelect={onSelect}
      />
    ));
    const groups = container.querySelectorAll(
      ".sui-sprint-selector__bar-group",
    );
    fireEvent.click(groups[1]);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("selects via keyboard (Enter) on a focused bar-group", () => {
    const onSelect = vi.fn();
    const { container } = render(() => (
      <SprintSelector sprints={[sprint("W1")]} onSelect={onSelect} />
    ));
    const group = container.querySelector(".sui-sprint-selector__bar-group")!;
    fireEvent.keyDown(group, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("renders svg rects only for non-zero segments", () => {
    const { container } = render(() => (
      <SprintSelector
        sprints={[
          {
            label: "W1",
            planned_complete: 2,
            planned_incomplete: 0,
            unplanned_complete: 0,
            unplanned_incomplete: 0,
          },
        ]}
      />
    ));
    // Only planned_complete > 0 → exactly one rect.
    expect(container.querySelectorAll("rect").length).toBe(1);
  });
});
