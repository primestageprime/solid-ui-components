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
  createEffect,
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
const TWEEN_MS = 250;

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

  // ── Continuous fractional focus position ─────────────────────────────
  // All layout reads from this — not from `props.selected` directly. It
  // tracks `props.selected` via a tween (B5) or the active gesture (B6).
  const [selectedAnim, setSelectedAnim] = createSignal(props.selected);
  // True while a pointer-driven gesture owns `selectedAnim`. The prop-change
  // tween bails out while gestureActive is set so the two drivers don't fight.
  const [gestureActive, setGestureActive] = createSignal(false);

  // Tween `selectedAnim` toward `target` over TWEEN_MS via ease-out cubic.
  // Cancels any in-flight tween so back-to-back prop changes always animate
  // from the current visible position.
  let rafHandle: number | null = null;
  const tweenTo = (target: number) => {
    if (rafHandle !== null) cancelAnimationFrame(rafHandle);
    const start = selectedAnim();
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / TWEEN_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setSelectedAnim(start + (target - start) * eased);
      if (t < 1) {
        rafHandle = requestAnimationFrame(step);
      } else {
        rafHandle = null;
      }
    };
    rafHandle = requestAnimationFrame(step);
  };
  onCleanup(() => {
    if (rafHandle !== null) cancelAnimationFrame(rafHandle);
  });

  // Tween toward `props.selected` whenever it changes (unless the user is
  // actively gesturing — then the gesture owns `selectedAnim`).
  createEffect(() => {
    const target = props.selected;
    if (gestureActive()) return;
    if (Math.abs(target - selectedAnim()) < 0.001) return;
    tweenTo(target);
  });

  const layout = createMemo<CellLayout>(() =>
    layoutCells({
      cellCount: props.cells.length,
      chartWidth: chartWidth(),
      selectedFraction: selectedFraction(),
      sideCompression: sideCompression(),
      selectedAnim: selectedAnim(),
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

  // ── Pointer handlers — pointer-anchored drag scrub (B6) ──────────────
  // The gesture freezes the layout that was visible at pointerdown so the
  // mapping between pointer x and the focused cell stays stable even as the
  // visible layout morphs. The pointer effectively "anchors" to a virtual
  // cell position; further moves shift `selectedAnim` by the delta between
  // the current pointer cell and the anchor.
  type GestureState = {
    pointerId: number;
    startLayout: CellLayout;
    selectedAtStart: number;
    anchorCell: number;
  };
  let gesture: GestureState | null = null;

  const clampCellIndex = (i: number): number =>
    Math.max(0, Math.min(props.cells.length - 1, i));

  const handlePointerDown = (e: PointerEvent) => {
    if (!frameEl) return;
    const rect = frameEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const startLayout = layout();
    const anchorCell = xToCell(x, startLayout);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    gesture = {
      pointerId: e.pointerId,
      startLayout,
      selectedAtStart: selectedAnim(),
      anchorCell,
    };
    setGestureActive(true);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!gesture || !frameEl) return;
    const rect = frameEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const cellAtNow = xToCell(x, gesture.startLayout);
    const next = gesture.selectedAtStart + (cellAtNow - gesture.anchorCell);
    setSelectedAnim(clampCellIndex(next));
  };

  const endGesture = (e: PointerEvent) => {
    if (!gesture) return;
    try {
      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    } catch {
      /* pointer wasn't captured; nothing to release */
    }
    const committed = clampCellIndex(Math.round(selectedAnim()));
    setSelectedAnim(committed); // snap
    gesture = null;
    setGestureActive(false);
    props.onScrub(committed, props.cells[committed]);
  };

  // ── Continuous axis scroll driven by `selectedAnim` (B7) ─────────────
  // The DateAxis's own scroll-into-view effect handles integer changes; for
  // fractional `selectedAnim` (active gesture / mid-tween) we set scrollLeft
  // imperatively each frame so the axis tracks the chart's morph smoothly.
  let axisScrollEl: HTMLDivElement | undefined;
  // Mirror the axis's scrollLeft into a signal so the gutter diagonals can
  // subtract it from each cell's axis-side x and stay glued to the moving
  // axis cells (B8).
  const [axisScrollLeft, setAxisScrollLeft] = createSignal(0);
  const handleScrollableRef = (el: HTMLDivElement) => {
    axisScrollEl = el;
    el.addEventListener(
      "scroll",
      () => setAxisScrollLeft(el.scrollLeft),
      { passive: true },
    );
  };

  createEffect(() => {
    const anim = selectedAnim();
    const el = axisScrollEl;
    if (!el) return;
    const w = cellWidth();
    const targetLeft = anim * w + w / 2 - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, targetLeft);
  });

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
          onPointerMove={handlePointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
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
            const axL = i * cellWidth() - axisScrollLeft();
            const axR = (i + 1) * cellWidth() - axisScrollLeft();
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
        scrollableRef={handleScrollableRef}
      />
    </div>
  );
};
