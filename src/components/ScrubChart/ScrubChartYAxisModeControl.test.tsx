// The y-axis mode switch in the origin corner — what it renders, what it
// reports, and the room ScrubChart keeps for it. jsdom runs no layout, so the
// room is pinned as the CONTRACT (plotLeft / plotBottom off ctx) plus the
// stylesheet width the constant mirrors.
import { describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { render } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ScrubChart } from "./ScrubChart";
import { ScrubChartYAxisModeControl } from "./ScrubChartYAxisModeControl";
import {
  CORNER_FOOTPRINT,
  CORNER_INSET,
  Y_AXIS_MODE_COLUMN,
  Y_AXIS_MODE_SWITCH_WIDTH,
  Y_FIT_COLUMN,
  Y_FIT_GUTTER,
} from "./helpers";
import type { ScrubChartContext, ScrubChartYAxisMode } from "./types";
import { dailyCells, type Cell } from "../DateAxis";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const cells: Cell[] = dailyCells(d("2026-05-01"), d("2026-05-10"));

const mount = (
  mode: ScrubChartYAxisMode | undefined,
  extra: { yFitDomain?: boolean; onChange?: (m: ScrubChartYAxisMode) => void } = {},
) => {
  let ctx: ScrubChartContext<Cell> | null = null;
  const { container } = render(() => (
    <ScrubChart
      cells={cells}
      yDomain={[0, 4]}
      formatYLabel={(v) => String(v)}
      yAxisMode={mode}
      onYAxisModeChange={extra.onChange}
      yFitDomain={extra.yFitDomain ? () => [0, 4] : undefined}
      renderChart={(c) => {
        ctx = c;
        return <svg />;
      }}
      renderCell={() => <div />}
    />
  ));
  return { container, ctx: () => ctx! };
};

const segments = (root: HTMLElement) =>
  Array.from(
    root.querySelectorAll<HTMLButtonElement>(
      ".sui-scrub-chart__y-axis-mode [role='radio']",
    ),
  );

describe("ScrubChart yAxisMode — the origin-corner switch", () => {
  it("renders three named segments and marks the current mode", () => {
    const { container } = mount("fixed");
    const segs = segments(container);
    expect(segs.map((s) => s.textContent)).toEqual(["Auto", "Fixed", "Fit"]);
    expect(segs.map((s) => s.getAttribute("aria-checked"))).toEqual([
      "false",
      "true",
      "false",
    ]);
    expect(
      container
        .querySelector(".sui-scrub-chart__y-axis-mode [role='radiogroup']")
        ?.getAttribute("aria-label"),
    ).toBe("Y-axis mode");
  });

  it("reports the picked mode and follows the controlled prop", () => {
    const onChange = vi.fn();
    const [mode, setMode] = createSignal<ScrubChartYAxisMode>("auto");
    const { container } = render(() => (
      <ScrubChart
        cells={cells}
        yDomain={[0, 4]}
        yAxisMode={mode()}
        onYAxisModeChange={(m) => {
          onChange(m);
          setMode(m);
        }}
        renderChart={() => <svg />}
        renderCell={() => <div />}
      />
    ));
    segments(container)[2].click();
    expect(onChange).toHaveBeenCalledWith("autoscale");
    expect(segments(container)[2].getAttribute("aria-checked")).toBe("true");
  });

  it("replaces the y-fit button when both are set, and leaves it alone otherwise", () => {
    const both = mount("auto", { yFitDomain: true });
    expect(both.container.querySelector(".sui-scrub-chart__y-fit-btn")).toBeNull();
    expect(segments(both.container)).toHaveLength(3);
    const fitOnly = mount(undefined, { yFitDomain: true });
    expect(fitOnly.container.querySelector(".sui-scrub-chart__y-fit-btn")).toBeTruthy();
    expect(segments(fitOnly.container)).toHaveLength(0);
    const neither = mount(undefined);
    expect(neither.container.querySelector(".sui-scrub-chart__corner")).toBeNull();
  });

  it("keeps the corner's footprint: the row and the wider column", () => {
    const withSwitch = mount("auto");
    const plain = mount(undefined);
    // Row: the switch takes no row of its own — the x-axis row is the corner
    // footprint, exactly as it is for the y-fit button.
    expect(withSwitch.ctx().height - withSwitch.ctx().plotBottom).toBe(CORNER_FOOTPRINT);
    // Column: narrow labels ("0".."4") ask for less; the default column grows
    // to hold the whole switch plus the gutter.
    expect(plain.ctx().plotLeft).toBeLessThan(Y_AXIS_MODE_COLUMN);
    expect(withSwitch.ctx().plotLeft).toBe(Y_AXIS_MODE_COLUMN);
    expect(Y_AXIS_MODE_COLUMN).toBe(CORNER_INSET + Y_AXIS_MODE_SWITCH_WIDTH + Y_FIT_GUTTER);
    expect(Y_AXIS_MODE_COLUMN).toBeGreaterThan(Y_FIT_COLUMN);
  });

  it("gives each chart its own segments (labels are built per render, not shared)", () => {
    const a = mount("auto");
    const b = mount("fixed");
    expect(segments(a.container)[0].textContent).toBe("Auto");
    expect(segments(b.container)[0].textContent).toBe("Auto");
    expect(segments(a.container)[0]).not.toBe(segments(b.container)[0]);
  });

  it("states the switch width the constant mirrors", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "ScrubChart.css"),
      "utf8",
    );
    const block = css.slice(css.indexOf(".sui-scrub-chart__y-axis-mode {"));
    expect(block.slice(0, block.indexOf("}"))).toContain(
      `width: ${Y_AXIS_MODE_SWITCH_WIDTH}px;`,
    );
  });

  it("mounts on its own and hangs from axisTop", () => {
    const onSelect = vi.fn();
    const { container } = render(() => (
      <ScrubChartYAxisModeControl
        mode={() => "auto"}
        onSelect={onSelect}
        axisTop={() => 100}
      />
    ));
    const corner = container.querySelector<HTMLElement>(".sui-scrub-chart__y-axis-mode")!;
    expect(corner.style.bottom).toBe("auto");
    expect(corner.style.top).toMatch(/px$/);
    segments(container)[1].click();
    expect(onSelect).toHaveBeenCalledWith("fixed");
  });
});
