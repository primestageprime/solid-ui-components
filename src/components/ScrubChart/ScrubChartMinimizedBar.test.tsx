import { describe, it, expect } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { ScrubChart } from "./ScrubChart";
import { ScrubChartMinimizedBar } from "./ScrubChartMinimizedBar";
import { minimizedSummary } from "./helpers";
import { dailyCells, type Cell } from "../DateAxis";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const cells = (from: string, to: string): Cell[] => dailyCells(d(from), d(to));

/** The bar's restore button. */
const restoreButton = (container: HTMLElement): HTMLElement =>
  container.querySelector<HTMLElement>(".sui-scrub-chart__restore-btn")!;

/** The bar's summary text. */
const summaryText = (container: HTMLElement): string =>
  container.querySelector<HTMLElement>(".sui-scrub-chart__minimized-summary")!
    .textContent ?? "";

describe("ScrubChartMinimizedBar", () => {
  it("renders its children and restores on a click", () => {
    let restores = 0;
    const { container } = render(() => (
      <ScrubChartMinimizedBar onRestore={() => restores++}>
        Sep 22 – Mar 22
      </ScrubChartMinimizedBar>
    ));
    expect(summaryText(container)).toBe("Sep 22 – Mar 22");
    const btn = restoreButton(container);
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.getAttribute("aria-label")).toBe("Restore chart");
    fireEvent.click(btn);
    expect(restores).toBe(1);
  });

  // The restore button reuses the corner button's look, so the glyph a reader
  // clicks to come back matches the one they clicked to leave. It does NOT
  // take `.sui-scrub-chart__corner`: the row places it, not the stylesheet.
  it("takes the corner button's look but not its corner", () => {
    const { container } = render(() => (
      <ScrubChartMinimizedBar onRestore={() => {}}>x</ScrubChartMinimizedBar>
    ));
    expect(
      restoreButton(container).classList.contains(
        "sui-scrub-chart__corner-btn",
      ),
    ).toBe(true);
    expect(container.querySelector(".sui-scrub-chart__corner")).toBeNull();
  });

  // The bar owns no flex rules. It is a curried Row, so it carries Row's own
  // classes and the library's one gap scale.
  it("lays out as a Row and not as hand-rolled flex", () => {
    const { container } = render(() => (
      <ScrubChartMinimizedBar onRestore={() => {}}>x</ScrubChartMinimizedBar>
    ));
    const bar = container.querySelector<HTMLElement>(
      ".sui-scrub-chart__minimized",
    )!;
    expect(bar.classList.contains("row")).toBe(true);
    expect(bar.classList.contains("row--justify-between")).toBe(true);
    expect(bar.classList.contains("row--align-center")).toBe(true);
  });
});

describe("minimizedSummary", () => {
  // The span inside one year needs no year to be unambiguous, and the bar is
  // one line.
  it("states the span without a year when both ends share one", () => {
    expect(minimizedSummary(cells("2026-09-22", "2026-12-31"))).toBe(
      "Sep 22 – Dec 31",
    );
  });

  it("states both years when the span crosses one", () => {
    expect(minimizedSummary(cells("2026-09-22", "2027-03-22"))).toBe(
      "Sep 22 '26 – Mar 22 '27",
    );
  });

  it("states one date for a single cell", () => {
    expect(minimizedSummary(cells("2026-09-22", "2026-09-22"))).toBe("Sep 22");
  });

  it("returns an empty line for no cells", () => {
    expect(minimizedSummary([])).toBe("");
  });
});

describe("ScrubChart minimized content", () => {
  // ScrubChart never sees a value — `renderChart` is a slot — so the span is
  // the whole of what it can derive on its own.
  it("shows the derived span with no slot", () => {
    const { container } = render(() => (
      <ScrubChart
        cells={cells("2026-09-22", "2026-12-31")}
        chartHeight={200}
        topAction={true}
        minimized={true}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    expect(summaryText(container)).toBe("Sep 22 – Dec 31");
  });

  // The slot gets the same span back, so a caller prints its own value beside
  // the one the chart already derived.
  it("hands the slot the cells, the selection and the span", () => {
    const seen: string[] = [];
    const { container } = render(() => (
      <ScrubChart
        cells={cells("2026-09-22", "2026-12-31")}
        chartHeight={200}
        selected={3}
        topAction={true}
        minimized={true}
        renderMinimized={(ctx) => {
          seen.push(`${ctx.cells.length}/${ctx.selected}/${ctx.summary}`);
          return <span>$148,204 · {ctx.summary}</span>;
        }}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    expect(seen).toEqual(["101/3/Sep 22 – Dec 31"]);
    expect(summaryText(container)).toBe("$148,204 · Sep 22 – Dec 31");
  });
});
