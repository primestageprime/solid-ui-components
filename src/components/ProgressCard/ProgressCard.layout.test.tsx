import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ProgressCard, type ProgressStep } from "./ProgressCard";

afterEach(cleanup);

// Layout-purity regression guard. Header → ClusterRow, steps row →
// TightClusterRow, each step + connector → no-shrink ActionSlot. The step
// circle/icon keep their intrinsic glyph-centering flex.
const steps: ProgressStep[] = [
  { id: "a", label: "Fetch", status: "completed" },
  { id: "b", label: "Cache", status: "active" },
];

describe("ProgressCard layout purity", () => {
  it("composes header + steps rows and no-shrink step slots from Layout", () => {
    const { container } = render(() => (
      <ProgressCard title="Sync" subtitle="v2" steps={steps} />
    ));
    const header = container.querySelector(".jtf-progress-card__header")!;
    expect(header.classList.contains("row")).toBe(true);

    const stepsRow = container.querySelector(".jtf-progress-card__steps")!;
    expect(stepsRow.classList.contains("row")).toBe(true);
    expect(stepsRow.classList.contains("row--gap-xs")).toBe(true);

    const step = container.querySelector(".jtf-progress-card__step")!;
    expect(step.classList.contains("box")).toBe(true);
    expect(step.classList.contains("box--no-shrink")).toBe(true);

    const connector = container.querySelector(".jtf-progress-card__connector")!;
    expect(connector.classList.contains("box--no-shrink")).toBe(true);

    // The intrinsic step circle (centers its own glyph) is preserved.
    expect(step.querySelector(".jtf-progress-card__step-circle")).toBeTruthy();
  });

  it("still renders the title + one connector for two steps", () => {
    const { container, getByText } = render(() => (
      <ProgressCard title="Sync" steps={steps} />
    ));
    expect(getByText("Sync")).toBeTruthy();
    expect(
      container.querySelectorAll(".jtf-progress-card__connector").length,
    ).toBe(1);
  });
});
