// ScrubChart `plotLock` (thorcasting #4395) — two charts holding one lock draw
// their plots at one left and one right edge, whichever has the wider labels or
// gutter; a chart with no lock is unchanged.
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { type Cell, dailyCells } from "../DateAxis";
import { createPlotLock } from "../Chart/plotLock";
import { ScrubChart } from "./ScrubChart";
import type { ScrubChartContext } from "./types";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const cells: Cell[] = dailyCells(d("2026-05-01"), d("2026-05-10"));

const mount = (
  lock: ReturnType<typeof createPlotLock> | undefined,
  yLabel: string,
  rightGutter: number,
) => {
  let ctx: ScrubChartContext<Cell> | null = null;
  render(() => (
    <ScrubChart
      cells={cells}
      yDomain={[0, 4]}
      formatYLabel={() => yLabel}
      rightGutter={rightGutter}
      plotLock={lock}
      xTickCadence="week"
      chartHeight={200}
      renderChart={(c) => {
        ctx = c;
        return <svg />;
      }}
      renderCell={() => <div />}
    />
  ));
  return () => ctx!;
};

describe("ScrubChart plotLock", () => {
  it("two locked charts share plotLeft and plotRight", () => {
    const lock = createPlotLock();
    const narrow = mount(lock, "1", 0);
    const wide = mount(lock, "1,000,000.00", 120);
    expect(narrow().plotLeft).toBe(wide().plotLeft);
    expect(narrow().plotRight).toBe(wide().plotRight);
    // The narrow chart took the wide chart's insets, not the other way round.
    const alone = mount(undefined, "1", 0);
    expect(narrow().plotLeft).toBeGreaterThan(alone().plotLeft);
    expect(narrow().plotRight).toBeLessThan(alone().plotRight);
  });

  it("without a lock the plot is the chart's own", () => {
    const a = mount(undefined, "1", 0);
    const b = mount(undefined, "1,000,000.00", 120);
    expect(b().plotLeft).toBeGreaterThan(a().plotLeft);
  });

  it("publishes its x ticks for the other members", () => {
    const lock = createPlotLock();
    mount(lock, "1", 0);
    expect(lock.ticks()?.length ?? 0).toBeGreaterThan(0);
  });
});
