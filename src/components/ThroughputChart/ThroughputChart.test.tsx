import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ThroughputChart } from "./ThroughputChart";

const HOUR = 3_600_000;
const NOW = 48 * HOUR;

describe("ThroughputChart — RATE mode (default, backward-compatible)", () => {
  it("renders the rows/min header + area/line when given dataPoints", () => {
    const now = Date.now();
    const dataPoints = Array.from({ length: 10 }, (_, i) => ({
      timestamp: now - (10 - i) * 5 * 60_000,
      rowsPerMinute: 2000 + i * 50,
    }));
    const { container } = render(() => (
      <ThroughputChart dataPoints={dataPoints} windowHours={8} />
    ));
    // The rate header text is unchanged.
    expect(container.textContent).toContain("Extraction Throughput");
    expect(container.textContent).toContain("rows/min");
    // It does NOT render the completion legend.
    expect(container.textContent).not.toContain("Cumulative %");
  });

  it("renders with no dataPoints (empty rate chart) without error", () => {
    const { container } = render(() => <ThroughputChart />);
    expect(container.querySelector(".sui-throughput-chart")).not.toBeNull();
    expect(container.textContent).toContain("Extraction Throughput");
  });
});

describe("ThroughputChart — COMPLETION mode (opt-in via `completions`)", () => {
  it("switches to the bars + cumulative-line view when `completions` is passed", () => {
    const { container } = render(() => (
      <ThroughputChart
        completions={[]}
        now={NOW}
        windowHours={48}
        totalCount={10}
      />
    ));
    expect(
      container.querySelector(".sui-throughput-chart--completion"),
    ).not.toBeNull();
    expect(container.textContent).toContain("Completed / hr");
    expect(container.textContent).toContain("Cumulative %");
    // The rate header is gone in completion mode.
    expect(container.textContent).not.toContain("Extraction Throughput");
  });

  it("renders bars and a cumulative line when there are completions", () => {
    const { container } = render(() => (
      <ThroughputChart
        completions={[{ completedAt: NOW - HOUR }, { completedAt: NOW - 2 * HOUR }]}
        now={NOW}
        windowHours={48}
        totalCount={10}
      />
    ));
    expect(container.querySelectorAll("svg rect").length).toBeGreaterThan(0);
    expect(container.querySelector("svg path")).not.toBeNull();
  });

  it("accepts custom legend labels", () => {
    const { container } = render(() => (
      <ThroughputChart
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

  it("guards against divide-by-zero when totalCount is 0", () => {
    const { container } = render(() => (
      <ThroughputChart completions={[]} now={NOW} windowHours={48} totalCount={0} />
    ));
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
