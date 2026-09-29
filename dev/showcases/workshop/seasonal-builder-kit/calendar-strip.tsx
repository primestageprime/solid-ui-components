// ============================================
// CalendarStrip — the year's holidays and ranges on one axis. COMPOSED from
// SUI, no CSS of its own:
//
//   Chart (numeric day x, responsive) + XAxis (month ticks)
//   SpanLanes x N    one per lane the model packed (`packLanes`): the fewest
//                    lanes, every segment of one range in ITS lane. SpanLanes
//                    packs by a span's whole extent, so a range that crosses
//                    New Year would claim the entire year; each SEGMENT is
//                    therefore its own span, and the lane is the model's.
//   createSpanEndLabels  the range's name on its bar
//   PinMarkers       a holiday, a pin standing on the axis; `renderPin` draws
//                    the stem and the name, staggered in two rows
//   ReferenceLine    a full-height guide through the SELECTED holiday
//
// Clicking a bar or a pin selects it (the cards below edit the selection).
// The pin's stem and name are raw SVG in `renderPin` (recorded in
// docs/handoffs/seasonal-builder-sui-gaps.md: a labelled pin is not a mark).
// ============================================
import { type Component, For, createMemo } from "solid-js";
import {
  Chart,
  PinMarkers,
  ReferenceLine,
  ShapeGlyph,
  SpanLanes,
  type SpanSegment,
  XAxis,
  createSpanEndLabels,
  fn,
  type Id,
  slotId,
} from "../../../../src";
import {
  type Holiday,
  MONTHS,
  MONTH_STARTS,
  NDAYS,
  type Period,
  type Range,
  dayDate,
  displayName,
  holidaysOf,
  laneCount,
  occurrence,
  packLanes,
  rangesOf,
  segments,
} from "../seasonal-builder-model";

const { flatMap, map } = fn;

const WIDTH = 1000;
const LANE = 24;
const TOP = 6;
/** The band above the axis the pins stand in. */
const PIN_ZONE = 58;
const MARGIN = { top: 4, right: 12, bottom: 24, left: 8 };
const LABEL_ROOM = 96;

/** One drawn piece of a range: a span of its own so the model's lane holds. */
interface Piece {
  readonly id: string;
  readonly rangeId: string;
  readonly name: string;
  readonly selected: boolean;
  readonly segments: readonly SpanSegment[];
}

const piecesOf = (r: Range, selected: boolean): readonly Piece[] =>
  map(
    (s: { a: number; e: number }, i: number): Piece => ({
      id: `${r.id}:${i}`,
      rangeId: r.id,
      name: displayName(r),
      selected,
      // A span's end is exclusive.
      segments: [{ start: s.a, end: s.e + 1, kind: "range" }],
    }),
    segments(r),
  );

const Labels = createSpanEndLabels<Piece>({
  lead: (p) => p.name,
  color: () => "var(--sui-bg-deep)",
});

const paint = (_s: SpanSegment, p: Piece): string =>
  p.selected ? "var(--sui-accent)" : "var(--sui-series-3)";

interface Pin {
  readonly id: Id;
  readonly x: number;
  readonly y: number;
  readonly name: string;
  readonly descriptor: { color: string; shape: "circle"; size: number };
}

export const CalendarStrip: Component<{
  readonly periods: readonly Period[];
  readonly selectedHoliday: string;
  readonly selectedRange: string;
  readonly onSelect: (id: string) => void;
}> = (props) => {
  const ranges = createMemo(() => rangesOf(props.periods));
  const lanes = createMemo(() => packLanes(ranges()));
  const rows = () => laneCount(lanes());
  const plotHeight = () => TOP + rows() * LANE + PIN_ZONE;
  const height = () => plotHeight() + MARGIN.top + MARGIN.bottom;

  const laneData = (lane: number): readonly Piece[] =>
    flatMap(
      (r: Range): readonly Piece[] =>
        lanes().find((l) => l.id === r.id)?.lane === lane
          ? piecesOf(r, r.id === props.selectedRange)
          : [],
      ranges(),
    );

  const pins = createMemo((): readonly Pin[] =>
    map(
      (h: Holiday, i: number): Pin => ({
        id: slotId(h.id),
        x: occurrence(h, 2026).a,
        y: plotHeight() - 22 - (i % 2) * 16,
        name: displayName(h),
        descriptor: {
          color:
            h.id === props.selectedHoliday
              ? "var(--sui-accent)"
              : "var(--sui-series-5)",
          shape: "circle",
          size: 9,
        },
      }),
      holidaysOf(props.periods),
    ),
  );
  const selectedPin = () =>
    pins().find((p) => String(p.id) === props.selectedHoliday);

  return (
    <Chart
      responsive
      width={WIDTH}
      height={height()}
      xDomain={[0, NDAYS]}
      yDomain={[plotHeight(), 0]}
      margin={MARGIN}
    >
      <XAxis
        tickValues={MONTH_STARTS}
        tickFormat={(d) => MONTHS[dayDate(Math.round(d)).getUTCMonth()]}
      />
      <For each={Array.from({ length: rows() }, (_, i) => i)}>
        {(lane) => (
          <g transform={`translate(0, ${TOP + lane * LANE})`}>
            <SpanLanes<Piece>
              data={laneData(lane)}
              paint={paint}
              adornments={[Labels]}
              rowHeight={LANE}
              describe={(p) => p.name}
              onSpanClick={(p) => props.onSelect(p.rangeId)}
            />
          </g>
        )}
      </For>
      {selectedPin() ? (
        <ReferenceLine
          orientation="vertical"
          value={(selectedPin() as Pin).x}
          color="var(--sui-accent)"
          opacity={0.35}
        />
      ) : null}
      <PinMarkers<Pin>
        data={pins()}
        selectedId={slotId(props.selectedHoliday)}
        onClick={(p) => props.onSelect(String(p.id))}
        renderPin={(pin, at) => {
          const right = at.cx < WIDTH - MARGIN.left - MARGIN.right - LABEL_ROOM;
          return (
            <>
              <line
                x1={at.cx}
                x2={at.cx}
                y1={at.cy}
                y2={plotHeight()}
                stroke={pin.descriptor.color}
                stroke-width={at.selected ? 2.5 : 1.5}
              />
              <ShapeGlyph
                descriptor={pin.descriptor}
                cx={at.cx}
                cy={at.cy}
                size={pin.descriptor.size}
              />
              <text
                class="sui-chart__ref-label"
                x={at.cx + (right ? 8 : -8)}
                y={at.cy + 3.5}
                text-anchor={right ? "start" : "end"}
              >
                {pin.name}
              </text>
            </>
          );
        }}
      />
    </Chart>
  );
};
