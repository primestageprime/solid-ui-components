// ============================================
// ScrubChart — Composite (Depth 2).
// Pairs a (cadence-generic) DateAxis with a user-supplied chart slot via an
// SVG gutter that draws diagonal connectors between each cell's chart-side
// and axis-side bounds. The focused cell occupies `selectedFraction` of the
// chart width; side cells compress around it (fisheye).
//
// B3 — static integer-only scaffold. Drag scrub, fractional `selectedAnim`,
// and axis-scroll coupling land in B4–B8.
// ============================================

import {
  For,
  type JSX,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { DateAxis, type Cell, type DateAxisCellContext } from "../DateAxis";
import { layoutCells, xToCell, type CellLayout } from "./scales";
import "./ScrubChart.css";

/** Context passed to the consumer's `renderChart`. */
export interface ScrubChartContext<C extends Cell> {
  /** Centre x in chart pixels for the cell at `index`. */
  cellToX(index: number): number;
  /** [leftX, rightX] in chart pixels — may extend outside [0, width]. */
  cellBounds(index: number): [number, number];
  /** Selected cell's index. */
  selected: number;
  /** Full cell array, for iteration + payload access. */
  cells: C[];
  /** Indices of cells whose bounds intersect [0, width]. */
  visibleCells: number[];
  width: number;
  height: number;
}

export interface ScrubChartProps<C extends Cell> {
  cells: C[];
  selected: number;
  onScrub: (index: number, cell: C) => void;
  renderChart: (ctx: ScrubChartContext<C>) => JSX.Element;
  renderCell: (cell: C, ctx: DateAxisCellContext) => JSX.Element;

  /** Fraction of chart pixel width the focused cell occupies. Default 2/3. */
  selectedFraction?: number;
  /** Focused cell is this many times wider than each side cell. Default 28. */
  sideCompression?: number;
  /** Chart drawing-area height in px. Default 200. */
  chartHeight?: number;
  /** Gutter height in px. Default 20. */
  gutterHeight?: number;
  /** Width of one axis cell in px. Default 40. */
  cellWidth?: number;
  /** `today` Date forwarded to the inner DateAxis. */
  today?: Date;
}

const DEFAULT_CHART_WIDTH = 880;
const DEFAULT_SELECTED_FRACTION = 2 / 3;
const DEFAULT_SIDE_COMPRESSION = 28;
const DEFAULT_CHART_HEIGHT = 200;
const DEFAULT_GUTTER_HEIGHT = 20;
const DEFAULT_CELL_WIDTH = 40;

export const ScrubChart = <C extends Cell>(
  props: ScrubChartProps<C>,
): JSX.Element => {
  // ── Defaults ─────────────────────────────────────────────────────────
  const selectedFraction = () => props.selectedFraction ?? DEFAULT_SELECTED_FRACTION;
  const sideCompression = () => props.sideCompression ?? DEFAULT_SIDE_COMPRESSION;
  const chartHeight = () => props.chartHeight ?? DEFAULT_CHART_HEIGHT;
  const gutterHeight = () => props.gutterHeight ?? DEFAULT_GUTTER_HEIGHT;
  const cellWidth = () => props.cellWidth ?? DEFAULT_CELL_WIDTH;

  // ── Layout ───────────────────────────────────────────────────────────
  // Chart pixel width is measured via ResizeObserver on the frame.
  const [chartWidth, setChartWidth] = createSignal(DEFAULT_CHART_WIDTH);
  let frameEl: HTMLDivElement | undefined;
  onMount(() => {
    if (!frameEl) return;
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setChartWidth(entry.contentRect.width);
    });
    obs.observe(frameEl);
    onCleanup(() => obs.disconnect());
  });

  // Static integer-only layout for the scaffold; B5 swaps to fractional selectedAnim.
  const layout = createMemo<CellLayout>(() =>
    layoutCells({
      cellCount: props.cells.length,
      chartWidth: chartWidth(),
      selectedFraction: selectedFraction(),
      sideCompression: sideCompression(),
      selectedAnim: props.selected,
    }),
  );

  const ctx = (): ScrubChartContext<C> => {
    const lay = layout();
    return {
      cellToX: (i: number) => (lay.bounds[i][0] + lay.bounds[i][1]) / 2,
      cellBounds: (i: number) => lay.bounds[i],
      selected: props.selected,
      cells: props.cells,
      visibleCells: lay.activeWindow.filter((i) => {
        const [l, r] = lay.bounds[i];
        return r >= 0 && l <= chartWidth();
      }),
      width: chartWidth(),
      height: chartHeight(),
    };
  };

  // ── Pointer handlers — B4 click-only (drag lands in B6) ──────────────
  let pendingIndex: number | null = null;

  const handlePointerDown = (e: PointerEvent) => {
    if (!frameEl) return;
    const rect = frameEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fractional = xToCell(x, layout());
    const idx = Math.round(fractional);
    const clamped = Math.max(0, Math.min(props.cells.length - 1, idx));
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pendingIndex = clamped;
  };

  const handlePointerUp = (e: PointerEvent) => {
    try {
      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    } catch {
      /* pointer wasn't captured; nothing to release */
    }
    if (pendingIndex === null) return;
    const i = pendingIndex;
    pendingIndex = null;
    props.onScrub(i, props.cells[i]);
  };

  return (
    <div class="sui-scrub-chart">
      <div
        class="sui-scrub-chart__frame"
        style={{ height: `${chartHeight()}px` }}
        ref={(el) => (frameEl = el)}
      >
        <Show when={chartWidth() > 0}>{props.renderChart(ctx())}</Show>
        <div
          class="sui-scrub-chart__overlay"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        />
      </div>

      <svg
        class="sui-scrub-chart__gutter"
        viewBox={`0 0 ${chartWidth()} ${gutterHeight()}`}
        preserveAspectRatio="none"
        style={{ height: `${gutterHeight()}px` }}
      >
        <For each={Array.from({ length: props.cells.length }, (_, i) => i)}>
          {(i) => {
            const isSelected = i === props.selected;
            const [chL, chR] = layout().bounds[i];
            const axL = i * cellWidth();
            const axR = (i + 1) * cellWidth();
            const stroke = isSelected
              ? "var(--sui-accent)"
              : "var(--sui-border)";
            const strokeWidth = isSelected ? 1.5 : 1;
            return (
              <>
                <line
                  x1={chL}
                  y1={0}
                  x2={axL}
                  y2={gutterHeight()}
                  stroke={stroke}
                  stroke-width={strokeWidth}
                />
                <line
                  x1={chR}
                  y1={0}
                  x2={axR}
                  y2={gutterHeight()}
                  stroke={stroke}
                  stroke-width={strokeWidth}
                />
              </>
            );
          }}
        </For>
      </svg>

      <DateAxis<C>
        cells={props.cells}
        selected={props.selected}
        today={props.today}
        cellWidth={cellWidth()}
        onCellClick={(idx, cell) => props.onScrub(idx, cell)}
        renderCell={props.renderCell}
      />
    </div>
  );
};
