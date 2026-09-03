import { describe, it, expect } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { ScrubChart } from "./ScrubChart";
import { ScrubChartExpandControl } from "./ScrubChartExpandControl";
import { CORNER_FOOTPRINT, CORNER_LEVEL_OFFSET } from "./helpers";
import {
  DEFAULT_EXPAND_TRANSITION_MS,
  isHeightSettled,
  stepChartHeight,
} from "./chartHeightTween";
import { dailyCells, type Cell } from "../DateAxis";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const cells10 = (): Cell[] => dailyCells(d("2026-05-01"), d("2026-05-10"));

/** The expand button — the control is ONE button, named for what a click
 *  does. */
const expandButton = (container: HTMLElement): HTMLElement =>
  container.querySelector<HTMLElement>(".sui-scrub-chart__expand-btn")!;

/** The frame's height, in px, as the inline style states it. */
const frameHeight = (container: HTMLElement): string =>
  container.querySelector<HTMLElement>(".sui-scrub-chart__frame")!.style.height;

describe("ScrubChartExpandControl", () => {
  it("renders one button and reports the OTHER state on a click", () => {
    const picked: boolean[] = [];
    const { container } = render(() => (
      <ScrubChartExpandControl
        expanded={() => false}
        onToggle={(next) => picked.push(next)}
      />
    ));
    expect(
      container.querySelectorAll(".sui-scrub-chart__expand-btn"),
    ).toHaveLength(1);
    const btn = expandButton(container);
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.getAttribute("type")).toBe("button");
    fireEvent.click(btn);
    expect(picked).toEqual([true]);
  });

  it("reports the other state from expanded too", () => {
    const picked: boolean[] = [];
    const { container } = render(() => (
      <ScrubChartExpandControl
        expanded={() => true}
        onToggle={(next) => picked.push(next)}
      />
    ));
    fireEvent.click(expandButton(container));
    expect(picked).toEqual([false]);
  });

  // The label names the action; the glyph names the direction the frame
  // moves. A reader who reads the label and a reader who reads the icon reach
  // the same expectation.
  it("names the action a click performs, per state", () => {
    const collapsed = render(() => (
      <ScrubChartExpandControl expanded={() => false} onToggle={() => {}} />
    ));
    expect(expandButton(collapsed.container).getAttribute("aria-label")).toBe(
      "Expand chart",
    );

    const expanded = render(() => (
      <ScrubChartExpandControl expanded={() => true} onToggle={() => {}} />
    ));
    expect(expandButton(expanded.container).getAttribute("aria-label")).toBe(
      "Collapse chart",
    );
  });

  // The look comes from the SHARED corner classes, so the chevron and the
  // y-fit button cannot drift apart. The `__expand` names stay on the markup
  // as the hook a consumer overrides this one button with.
  it("takes the shared corner classes and its own name", () => {
    const { container } = render(() => (
      <ScrubChartExpandControl expanded={() => false} onToggle={() => {}} />
    ));
    const corner = container.querySelector<HTMLElement>(
      ".sui-scrub-chart__corner",
    )!;
    expect(corner.classList.contains("sui-scrub-chart__expand")).toBe(true);
    const btn = expandButton(container);
    expect(btn.classList.contains("sui-scrub-chart__corner-btn")).toBe(true);
  });

  // `axisTop` hangs the button from the x-axis row, and the level offset lifts
  // it until it centres on the tick labels — the same shift the y-fit button
  // takes, so the two sit on ONE line across the frame.
  it("levels the button on the x-axis row it is given", () => {
    const { container } = render(() => (
      <ScrubChartExpandControl
        expanded={() => false}
        onToggle={() => {}}
        axisTop={() => 172}
      />
    ));
    const corner = container.querySelector<HTMLElement>(
      ".sui-scrub-chart__corner",
    )!;
    expect(corner.style.top).toBe(`${172 + CORNER_LEVEL_OFFSET}px`);
    expect(corner.style.bottom).toBe("auto");
  });
});

describe("ScrubChart expand control", () => {
  // The master switch. An existing caller passes no `chartHeightExpanded` and
  // gains no chevron and no motion.
  it("renders no chevron without chartHeightExpanded", () => {
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        chartHeight={200}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    expect(container.querySelector(".sui-scrub-chart__expand")).toBeNull();
    expect(frameHeight(container)).toBe("200px");
  });

  it("owns the expanded state when the caller passes none", () => {
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        chartHeight={200}
        chartHeightExpanded={480}
        expandTransition={false}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    // Uncontrolled charts start COLLAPSED.
    expect(frameHeight(container)).toBe("200px");
    fireEvent.click(expandButton(container));
    expect(frameHeight(container)).toBe("480px");
    expect(expandButton(container).getAttribute("aria-label")).toBe(
      "Collapse chart",
    );
    fireEvent.click(expandButton(container));
    expect(frameHeight(container)).toBe("200px");
  });

  it("reports every click, owned or controlled", () => {
    const reported: boolean[] = [];
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        chartHeight={200}
        chartHeightExpanded={480}
        expandTransition={false}
        onExpandedChange={(next) => reported.push(next)}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    fireEvent.click(expandButton(container));
    fireEvent.click(expandButton(container));
    expect(reported).toEqual([true, false]);
  });

  // Controlled: the caller's `expanded` wins, so a click changes nothing until
  // the caller answers it.
  it("holds the caller's height when expanded is controlled", () => {
    const reported: boolean[] = [];
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        chartHeight={200}
        chartHeightExpanded={480}
        expanded={false}
        expandTransition={false}
        onExpandedChange={(next) => reported.push(next)}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    fireEvent.click(expandButton(container));
    expect(reported).toEqual([true]);
    expect(frameHeight(container)).toBe("200px");
  });

  it("takes the caller's expanded height as given", () => {
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        chartHeight={200}
        chartHeightExpanded={480}
        expanded={true}
        expandTransition={false}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    expect(frameHeight(container)).toBe("480px");
  });

  // The two corner controls coexist. thorcasting-ui shows both on one chart,
  // so the y-fit button and the chevron must land on opposite edges.
  it("keeps the y-fit button and the chevron apart", () => {
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        chartHeight={200}
        chartHeightExpanded={480}
        yFitDomain={() => [10, 90]}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    const corners = container.querySelectorAll(".sui-scrub-chart__corner");
    expect(corners).toHaveLength(2);
    expect(
      container.querySelector(".sui-scrub-chart__y-fit-btn"),
    ).not.toBeNull();
    expect(
      container.querySelector(".sui-scrub-chart__expand-btn"),
    ).not.toBeNull();
    // One corner class each, so the stylesheet pins them to opposite edges.
    expect(container.querySelectorAll(".sui-scrub-chart__y-fit")).toHaveLength(
      1,
    );
    expect(container.querySelectorAll(".sui-scrub-chart__expand")).toHaveLength(
      1,
    );
  });

  // The chevron hangs from the x-axis row, so the row grows to the corner
  // footprint even on a chart with no y-fit control.
  it("gives the x-axis row room for the chevron", () => {
    let plotBottom = 0;
    const { container } = render(() => (
      <ScrubChart
        cells={cells10()}
        chartHeight={200}
        chartHeightExpanded={480}
        xTickCadence="none"
        renderChart={(ctx) => {
          plotBottom = ctx.plotBottom;
          return <svg />;
        }}
        renderCell={() => <div />}
      />
    ));
    expect(container.querySelector(".sui-scrub-chart__expand")).not.toBeNull();
    expect(plotBottom).toBe(200 - CORNER_FOOTPRINT);
  });
});

describe("chart-height tween", () => {
  it("covers part of the distance per step and lands on the target", () => {
    const half = stepChartHeight(200, 480, 80, DEFAULT_EXPAND_TRANSITION_MS);
    expect(half).toBeGreaterThan(200);
    expect(half).toBeLessThan(480);
    // A long step arrives, and arrival returns the target EXACTLY.
    expect(stepChartHeight(200, 480, 1000, 10)).toBe(480);
  });

  it("calls a height arrived once it is under half a pixel away", () => {
    expect(isHeightSettled(480, 480)).toBe(true);
    expect(isHeightSettled(479.7, 480)).toBe(true);
    expect(isHeightSettled(478, 480)).toBe(false);
  });

  it("defaults to the y-fit transition time", () => {
    expect(DEFAULT_EXPAND_TRANSITION_MS).toBe(240);
  });
});
