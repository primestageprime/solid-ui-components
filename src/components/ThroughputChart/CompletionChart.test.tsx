import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { CompletionChart } from "./CompletionChart";

const HOUR = 3_600_000;
const NOW = 48 * HOUR; // a clean window origin so bucket math is exact

describe("CompletionChart", () => {
  it("renders a chart with both legend series", () => {
    const { container } = render(() => (
      <CompletionChart
        completions={[]}
        now={NOW}
        windowHours={48}
        totalCount={10}
      />
    ));
    expect(container.querySelector(".sui-completion-chart")).not.toBeNull();
    expect(container.textContent).toContain("Completed / hr");
    expect(container.textContent).toContain("Cumulative %");
  });

  it("renders bars and a cumulative line when there are completions", () => {
    const { container } = render(() => (
      <CompletionChart
        completions={[{ completedAt: NOW - HOUR }, { completedAt: NOW - 2 * HOUR }]}
        now={NOW}
        windowHours={48}
        totalCount={10}
      />
    ));
    // BarSeries emits a <rect> per non-zero bucket; the cumulative LineSeries
    // emits a <path>. Both must be present once data exists.
    expect(container.querySelectorAll("svg rect").length).toBeGreaterThan(0);
    expect(container.querySelector("svg path")).not.toBeNull();
  });

  it("accepts custom legend labels", () => {
    const { container } = render(() => (
      <CompletionChart
        completions={[]}
        now={NOW}
        windowHours={24}
        totalCount={5}
        barsLabel="Tables / hr"
        cumulativeLabel="Done %"
      />
    ));
    expect(container.textContent).toContain("Tables / hr");
    expect(container.textContent).toContain("Done %");
  });

  it("renders without error when there are no completions and zero total", () => {
    const { container } = render(() => (
      <CompletionChart
        completions={[]}
        now={NOW}
        windowHours={48}
        totalCount={0}
      />
    ));
    // Guard against divide-by-zero in the cumulative-% math.
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
