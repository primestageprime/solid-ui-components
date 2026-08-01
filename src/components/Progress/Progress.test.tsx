import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { StackedProgressBar } from "./StackedProgressBar";
import { AsyncProgress } from "./AsyncProgress";

describe("StackedProgressBar", () => {
  it("renders one segment per non-zero percentage", () => {
    const { container } = render(() => (
      <StackedProgressBar
        segments={[
          { percentage: 40, color: "red" },
          { percentage: 0, color: "blue" },
          { percentage: 30, color: "green" },
        ]}
      />
    ));
    const segs = container.querySelectorAll(".stacked-progress-bar__segment");
    expect(segs.length).toBe(2);
  });

  it("sizes each horizontal segment by its percentage width", () => {
    const { container } = render(() => (
      <StackedProgressBar
        segments={[
          { percentage: 25, color: "red" },
          { percentage: 40, color: "green" },
        ]}
      />
    ));
    const segs = container.querySelectorAll<HTMLElement>(
      ".stacked-progress-bar__segment",
    );
    expect(segs[0].style.width).toBe("25%");
    expect(segs[1].style.width).toBe("40%");
    expect(segs[0].style.background).toBe("red");
    // Cumulative offsets stack the segments (regression: Solid dropped the
    // first of two computed style keys, so `left` never rendered).
    expect(segs[0].style.left).toBe("0%");
    expect(segs[1].style.left).toBe("25%");
  });

  it("applies the vertical modifier and renders a label", () => {
    const { container, getByText } = render(() => (
      <StackedProgressBar
        direction="vertical"
        label={<span>done</span>}
        segments={[{ percentage: 50, color: "red" }]}
      />
    ));
    const bar = container.querySelector(".stacked-progress-bar")!;
    expect(bar.classList.contains("stacked-progress-bar--vertical")).toBe(true);
    expect(getByText("done")).toBeTruthy();
    // Vertical stacks size along `height` rather than `width`.
    const seg = container.querySelector<HTMLElement>(
      ".stacked-progress-bar__segment",
    )!;
    expect(seg.style.height).toBe("50%");
    expect(seg.style.width).toBe("");
  });
});

describe("AsyncProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("renders the label and an indeterminate bar with no stored history", () => {
    const { container, getByText } = render(() => (
      <AsyncProgress processId="test-proc" label="Working" active={true} />
    ));
    expect(getByText("Working")).toBeTruthy();
    // No stored max → percent() is null → the indeterminate modifier carries
    // the fixed shuttle width + animation (see AsyncProgress.css).
    const fill = container.querySelector<HTMLElement>(
      ".async-progress__bar-fill",
    )!;
    expect(
      fill.classList.contains("async-progress__bar-fill--indeterminate"),
    ).toBe(true);
    expect(fill.style.width).toBe("");
  });

  it("renders a determinate fill when history exists in localStorage", () => {
    localStorage.setItem("async-progress-max-known", "100.0");
    const { container } = render(() => (
      <AsyncProgress processId="known" label="Known" active={true} />
    ));
    // elapsed starts at 0 → width 0%, but the overrun-capable fill is present
    // (not the indeterminate 30% placeholder).
    const fill = container.querySelector<HTMLElement>(
      ".async-progress__bar-fill",
    )!;
    expect(fill.style.width).toBe("0%");
    expect(fill.style.animation).toBe("");
  });

  it("updates elapsed timing text as the interval ticks", () => {
    const { container } = render(() => (
      <AsyncProgress processId="tick" label="Tick" active={true} />
    ));
    vi.advanceTimersByTime(2000);
    const timing = container.querySelector(".async-progress__timing")!;
    expect(timing.textContent).toContain("2s");
  });
});
