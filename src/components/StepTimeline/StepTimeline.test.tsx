import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createStepTimeline } from "./StepTimeline";
import { StepTimeline } from "./variants";

afterEach(cleanup);

const T = (hhmm: string): number => Date.parse(`2026-10-01T${hhmm}:00Z`);
// The canon's timeline(t1).
const SERIES = [
  { t: T("08:00"), value: 0 },
  { t: T("08:14"), value: 1 },
  { t: T("09:40"), value: 2 },
];
const MARKERS = [
  { id: "s1-start", t: T("08:02"), label: "Step 1", kind: "started" },
  { id: "s1-done", t: T("08:14"), label: "Step 1", kind: "completed" },
  { id: "s2-done", t: T("09:40"), label: "Step 2", kind: "completed" },
  { id: "s3-start", t: T("17:35"), label: "Step 3", kind: "started" },
];
const DOMAIN = [T("08:00"), T("18:00")] as const;

const flagButtons = (root: HTMLElement): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>('[role="button"]')].filter((el) =>
    el.closest("svg"),
  );

describe("StepTimeline", () => {
  it("draws one numbered flag per marker and the default title", () => {
    const { container } = render(() => (
      <StepTimeline
        series={SERIES}
        markers={MARKERS}
        domain={DOMAIN}
        total={4}
        onSelect={() => {}}
      />
    ));
    expect(container.textContent).toContain("Timeline");
    const flags = flagButtons(container);
    expect(flags).toHaveLength(4);
    expect(flags.map((f) => f.textContent?.trim())).toEqual(["1", "2", "3", "4"]);
  });

  it("announces each flag with its label and kind", () => {
    const { container } = render(() => (
      <StepTimeline series={SERIES} markers={MARKERS} domain={DOMAIN} onSelect={() => {}} />
    ));
    expect(flagButtons(container)[0].getAttribute("aria-label")).toBe(
      "Mutation 1, Step 1 · started",
    );
  });

  it("labels the x-axis in UTC hours", () => {
    const { container } = render(() => (
      <StepTimeline series={SERIES} markers={MARKERS} domain={DOMAIN} />
    ));
    for (const hour of ["08", "10", "12", "14", "16", "18"]) {
      expect(container.textContent).toContain(hour);
    }
  });

  it("reports a flag click through onSelect with the marker's id", () => {
    const onSelect = vi.fn();
    const { container } = render(() => (
      <StepTimeline
        series={SERIES}
        markers={MARKERS}
        domain={DOMAIN}
        onSelect={onSelect}
      />
    ));
    fireEvent.click(flagButtons(container)[2]);
    expect(onSelect).toHaveBeenCalledWith("s2-done");
  });

  it("collapses to its header when controlled collapsed", () => {
    const Tall = createStepTimeline({ height: 220 });
    const { container } = render(() => (
      <Tall
        title="Step timeline"
        series={SERIES}
        markers={MARKERS}
        domain={DOMAIN}
        collapsed
      />
    ));
    expect(container.textContent).toContain("Step timeline");
    expect(container.querySelector(".sui-chart__svg")).toBeNull();
  });
});
