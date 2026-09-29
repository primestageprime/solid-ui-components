// ============================================
// SpanLanes — Composite (Depth 2). Chart slot; composes SegmentBar (SvgMarks).
//
// SPANS over time, each drawn as one bar of consecutive SEGMENTS — a job and
// its phases, a ticket and its states — and PACKED into the fewest rows: a
// span shares a row with any span it does not overlap. The x is the chart's
// own scale, so a time-domain `Chart` gives dates for free and `XAxis`,
// `ReferenceLine` and `ChartTooltip` compose beside it unchanged.
//
// It paints nothing domain-shaped itself. `paint(segment, datum)` turns each
// segment into any SVG paint (a token, or `url(#hatch)` from a sibling
// `HatchPattern`), and everything drawn ON a bar — labels, a flag, a pin — is
// an ADORNMENT: a component the consumer passes in, handed `{ datum, box,
// hovered, row }` and drawing inside that box. Stock adornments over the
// SvgMarks live in `spanAdornments.tsx`; any component with that props shape
// plugs in the same way.
//
// Interaction is reported, never performed: hover, click (Enter/Space too)
// and pointer-down come back as callbacks with the datum, so a consumer can
// highlight, open or drag. Each span's group carries `data-span-id` so a
// consumer can find it (for a glide, for a test) without reaching inside.
//
// Geometry is `spanLanes.ts` (pure, tested); this file only draws it.
// ============================================
import {
  type Component,
  For,
  Index,
  type JSX,
  createMemo,
  mergeProps,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { map } from "../../fn";
import { SegmentBar } from "../SvgMarks/SegmentBar";
import type { SvgBox } from "../SvgMarks/geometry";
import { useChart } from "./context";
import {
  type SpanDatum,
  type SpanSegment,
  layoutSpans,
  packSpans,
} from "./spanLanes";

/** What every adornment is handed: the span, the box its bar occupies, and its state. */
export interface SpanDisplayProps<T extends SpanDatum> {
  readonly datum: T;
  readonly box: SvgBox;
  readonly hovered: boolean;
  readonly row: number;
}

export interface SpanLanesProps<T extends SpanDatum> {
  readonly data: readonly T[];
  /** Any SVG paint for a segment: a colour, a `var(--sui-*)` token, or `url(#id)`. */
  readonly paint: (segment: SpanSegment, datum: T) => string;
  /** Components drawn on each bar, in order (later ones on top). */
  readonly adornments?: readonly Component<SpanDisplayProps<T>>[];
  /** The span drawn with the hover outline. */
  readonly hoveredId?: T["id"] | null;
  /** Accessible name for a span. Default: its id. */
  readonly describe?: (datum: T) => string;
  readonly onSpanHover?: (datum: T | null, e: PointerEvent) => void;
  readonly onSpanClick?: (datum: T, e: MouseEvent | KeyboardEvent) => void;
  readonly onSpanPointerDown?: (datum: T, e: PointerEvent) => void;
  /** Row height in px. Default 34. */
  readonly rowHeight?: number;
  /** The bar's share of its row's height, 0–1. Default 0.76. */
  readonly barHeight?: number;
}

export type SpanLanesOverrides = Pick<
  SpanLanesProps<SpanDatum>,
  "rowHeight" | "barHeight"
>;
export type SpanLanesDataProps<T extends SpanDatum> = Omit<
  SpanLanesProps<T>,
  keyof SpanLanesOverrides
>;

export function SpanLanes<T extends SpanDatum>(
  raw: SpanLanesProps<T>,
): JSX.Element {
  const ctx = useChart();
  const props = mergeProps({ rowHeight: 34, barHeight: 0.76 }, raw);
  const laid = createMemo(() =>
    layoutSpans(packSpans(props.data), (v) => ctx.xScale()(v), {
      rowHeight: props.rowHeight,
      barHeight: props.barHeight,
    }),
  );
  return (
    <g class="sui-chart__span-lanes">
      <Index each={laid()}>
        {(s) => {
          const hovered = () =>
            props.hoveredId != null && props.hoveredId === s().datum.id;
          return (
            // biome-ignore lint/a11y/useSemanticElements: a native <button> is not valid inside SVG; role="button" on the <g> is the accessible affordance for an SVG hit target
            <g
              class="sui-chart__span"
              data-span-id={String(s().datum.id)}
              role="button"
              tabIndex={0}
              aria-label={
                props.describe
                  ? props.describe(s().datum)
                  : String(s().datum.id)
              }
              onPointerEnter={(e) => props.onSpanHover?.(s().datum, e)}
              onPointerLeave={(e) => props.onSpanHover?.(null, e)}
              onPointerDown={(e) => props.onSpanPointerDown?.(s().datum, e)}
              onClick={(e) => props.onSpanClick?.(s().datum, e)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  props.onSpanClick?.(s().datum, e);
                }
              }}
            >
              <SegmentBar
                box={s().box}
                hovered={hovered()}
                segments={map(
                  (g) => ({
                    from: g.from,
                    to: g.to,
                    fill: props.paint(g.segment, s().datum),
                  }),
                  s().segments,
                )}
              />
              <For each={props.adornments ?? []}>
                {(adornment) => (
                  <Dynamic
                    component={adornment}
                    datum={s().datum}
                    box={s().box}
                    hovered={hovered()}
                    row={s().row}
                  />
                )}
              </For>
            </g>
          );
        }}
      </Index>
    </g>
  );
}

export function createSpanLanes<T extends SpanDatum>(
  defaults: Partial<SpanLanesOverrides>,
): (props: SpanLanesDataProps<T>) => JSX.Element {
  return (props) => <SpanLanes<T> {...mergeProps(defaults, props)} />;
}
