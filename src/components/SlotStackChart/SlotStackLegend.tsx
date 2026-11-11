// ============================================
// SlotStackLegend — Composite (Depth 2). What each mark of a SlotStackChart
// means, as `Legend` items.
// Tags: shows:legend, shows:mark, does:view, data:list, role:inline
// Composes Legend (Depth 1) and, per swatch, a tiny Chart drawing the real
// SlotStackMarks in a neutral ink. Owns no CSS.
//
// The series come first, each in the colour its slots are drawn in; the
// marks follow in neutral, drawn by the chart's own mark so the legend can
// never drift from the picture. `slotStackLegendItems` hands the same items
// to a screen that keeps its own `Legend` (a collapsible one, say).
// ============================================
import { type Component, type JSX, createUniqueId } from "solid-js";
import { map } from "../../fn";
import { Chart } from "../Chart";
import { seriesPaint } from "../Chart/StackedAreaSeries";
import { Legend, type LegendItem } from "../Legend";
import { SlotStackMarks } from "./SlotStackMarks";
import {
  type SlotStackSlot,
  type SlotStackWords,
  SLOT_STACK_WORDS,
} from "./slotStackGeometry";

export interface SlotStackLegendProps {
  /** The chart's series, in the order it draws them: one swatch each. */
  readonly series: readonly { readonly label: string }[];
  /** The chart's words, so the legend says what the hover text says. */
  readonly words?: Partial<SlotStackWords>;
  /**
   * Also explain the status sub-fills (translucent, lighter). Leave it out
   * for a chart whose slots state no `filledByClass` / `overflowByClass`.
   */
  readonly statuses?: boolean;
}

const NEUTRAL = "var(--sui-text-secondary)";
const SWATCH = { width: 22, height: 14 } as const;
const NO_MARGIN = { top: 1, right: 1, bottom: 1, left: 1 };
const SILENT = (): string => "";

const sample = (
  filled: number,
  unfilled: number,
  overflow: number,
  filledByClass?: SlotStackSlot["filledByClass"],
): SlotStackSlot => ({
  period: 0,
  expected: filled + unfilled,
  filled,
  unfilled,
  overflow,
  filledByClass,
});

/** The marks, each as the one slot that shows it. */
const SAMPLES = {
  filled: sample(0.9, 0, 0),
  unfilled: sample(0.4, 0.5, 0),
  overflow: sample(0.4, 0, 0.5),
  confirmed: sample(0.9, 0, 0, { invoiced: 0, confirmed: 0.9, planned: 0 }),
  planned: sample(0.9, 0, 0, { invoiced: 0, confirmed: 0, planned: 0.9 }),
} as const;

/** One slot drawn by the chart's own mark, in neutral ink. Decorative. */
const MarkSwatch: Component<{ readonly slot: SlotStackSlot }> = (props) => (
  <Chart
    width={SWATCH.width}
    height={SWATCH.height}
    xDomain={[-0.5, 0.5]}
    yDomain={[0, 1]}
    margin={NO_MARGIN}
  >
    <SlotStackMarks
      series={[{ id: "mark", label: "", slots: [props.slot] }]}
      paintId={`slot-stack-legend-${createUniqueId()}`}
      periods={[0]}
      totalLabel=""
      band={0.7}
      gap={0}
      paintOfSeries={() => NEUTRAL}
      title={SILENT}
    />
  </Chart>
);

const markItem = (
  look: string,
  meaning: string,
  slot: SlotStackSlot,
): LegendItem => ({
  label: `${look} = ${meaning}`,
  swatch: (<MarkSwatch slot={slot} />) as JSX.Element,
});

/**
 * The legend's items: the series in their colours, then solid, dashed and
 * striped, then (asked for) the statuses. Call it inside a component: the
 * swatches are live elements.
 */
export const slotStackLegendItems = (
  props: SlotStackLegendProps,
): LegendItem[] => {
  const words: SlotStackWords = { ...SLOT_STACK_WORDS, ...props.words };
  return [
    ...map(
      (one: { readonly label: string }, i: number): LegendItem => ({
        label: one.label,
        color: seriesPaint(i),
      }),
      props.series,
    ),
    markItem("Solid", words.filled, SAMPLES.filled),
    markItem("Dashed", words.unfilled, SAMPLES.unfilled),
    markItem("Striped", words.overflow, SAMPLES.overflow),
    ...(props.statuses === true
      ? [
          markItem("Translucent", words.confirmed, SAMPLES.confirmed),
          markItem("Lighter", words.planned, SAMPLES.planned),
        ]
      : []),
  ];
};

export const SlotStackLegend: Component<SlotStackLegendProps> = (props) => (
  <Legend items={slotStackLegendItems(props)} />
);
