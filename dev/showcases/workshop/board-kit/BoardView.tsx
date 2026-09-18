/**
 * Board Kit — ONE GENERIC VIEW, composed from a config.
 *
 * The three boards' benches were the same four regions arranged the same way,
 * differing only in which mix chart the second card drew and how many dials the
 * third card held. So this component builds NOTHING: every region is an existing
 * SUI piece, chosen from the config and handed data.
 *
 *   Cash Flow  — `CashflowScrubChart` + `createHighWaterMark`
 *   Mix        — `StackedTimelineChart` or `LevelsTimeline`, on `config.mix`
 *   Changes    — `MutationToolbar` + the dial row `config.axes` chooses
 *   Rate gauge — `createRateGauge` with `config.sentences`
 *
 * Frame and rows are the Scenario Board's own Layout variants and its two
 * classes, reused rather than copied, so this adds no CSS at all.
 *
 * ── THE ONE PIECE THAT IS NOT COMPOSITION: THE DIAL ROW ────────────────────
 *
 * `PairedMutationSliders.measures` is a strict 2-TUPLE and its `MeasureIndex`
 * is `0 | 1`, because a paired row IS two dials. A board with FOUR axes
 * therefore draws two paired rows, and each row's callback reports an index
 * within ITS OWN pair — so the view has to map that local index back to the
 * global measure before it writes anything. Getting that wrong is precisely the
 * bug the Hourly bench's own comment warns about ("ignoring the measure index
 * would write an hours figure into a rate"), one board further along.
 *
 * `groupsOf` and `globalIndex` are that mapping, and `BoardView.test.tsx` pins
 * it for one, two and four axes — the License Board's shape included, before
 * that board exists to find it the expensive way.
 *
 * ── WHAT THE BOARD STILL SUPPLIES ──────────────────────────────────────────
 *
 * The cash-flow fixture, the mix chart's own options and the Add form's BODY
 * are props rather than config fields. They are the parts that are genuinely a
 * board's own — hand-written committed flows, a y-axis cap, a form with the
 * board's own field names — and folding them into `BoardConfig` would make the
 * config a second copy of the bench rather than a description of it.
 */
import {
  type Component,
  Index,
  type JSX,
  Show,
  createMemo,
} from "solid-js";
import { filter, map } from "../../../../src/fn";

import { CashflowScrubChart } from "../../../../src/components/CashflowScrubChart";
import type { CashflowCell } from "../../../../src/components/CashflowScrubChart";
import {
  createHighWaterMark,
  createLevelsTimeline,
  createMutationSliders,
  createMutationToolbar,
  createPairedMutationSliders,
  createRateGauge,
  createStackedTimelineChart,
} from "../../../../src";
import type {
  Level,
  Mutation,
  StackedAreaSeriesData,
  TimeValue,
  Transfer,
} from "../../../../src";
import type { MutationEntity } from "../../../../src";
import type {
  MeasureIndex,
  PairedMutationEntity,
} from "../../../../src/components/PairedMutationSliders";
import { GhostButton, IconOnlyButton, PrimaryButton } from "../../../../src/components/Button";
import { Icon } from "../../../../src/components/Icon";
import { Modal } from "../../../../src/components/Modal";
import {
  EndWrapRow,
  FillWrapRow,
  GrowCenterColumn,
  GrowFillBox,
  HalfFillColumn,
  MajorPaneBox,
  SpreadRow,
  ViewportColumn,
} from "../../../../src/components/Layout";
import { FillCardSurface } from "../../../../src/components/Surface";
import { SectionTitle, TextTitle } from "../../../../src/components/Text";

import type { BoardConfig, MeasureAxis } from "./config";

// ── The dial row: which component, and the index mapping ─────────────────────

/** One row of dials: the axes it draws, and where each sits globally. */
export interface AxisGroup {
  readonly key: string;
  readonly axes: readonly MeasureAxis[];
  /** Position in `config.axes` of each axis in this group, in order. */
  readonly indices: readonly number[];
}

/**
 * The axes, split into the rows they draw as.
 *
 * Axes carrying a `group` are gathered under it, in FIRST-APPEARANCE order so
 * the reading order of the config is the reading order of the rows. Axes with
 * no group each get a row of their own — which is the one-axis and two-axis
 * cases, where a board states no groups at all and the whole row is one group.
 */
export const groupsOf = (axes: readonly MeasureAxis[]): AxisGroup[] => {
  const named = filter((axis: MeasureAxis) => axis.group !== undefined, axes);
  if (named.length === 0) {
    return [{ key: "all", axes: [...axes], indices: axes.map((_, i) => i) }];
  }
  const order: string[] = [];
  const buckets = new Map<string, number[]>();
  for (const [index, axis] of axes.entries()) {
    const key = axis.group ?? `axis-${index}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(index);
  }
  return map((key: string) => {
    const indices = buckets.get(key) ?? [];
    return {
      key,
      axes: map((index: number) => axes[index] as MeasureAxis, indices),
      indices,
    };
  }, order);
};

/**
 * A measure index reported by ONE row, as an index into `config.axes`.
 *
 * The whole of the four-dial board's wiring. A row is handed two axes and calls
 * back with `0` or `1`; which measure that actually is depends on which row it
 * was, and only the group knows.
 */
export const globalIndex = (group: AxisGroup, local: number): number =>
  group.indices[local] ?? local;

/** One entity's measures, narrowed to the two an axis group draws. */
const pairFor = (
  entity: PairedMutationEntity,
  group: AxisGroup,
): PairedMutationEntity => ({
  id: entity.id,
  label: entity.label,
  measures: [
    entity.measures[globalIndex(group, 0) as MeasureIndex],
    entity.measures[globalIndex(group, 1) as MeasureIndex],
  ] as PairedMutationEntity["measures"],
});

/** One entity's single measure, as the single-dial row reads it. */
const dialFor = (
  entity: PairedMutationEntity,
  group: AxisGroup,
): MutationEntity => {
  const measure = entity.measures[globalIndex(group, 0) as MeasureIndex];
  return {
    id: entity.id,
    label: entity.label,
    old: measure?.prior ?? null,
    value: measure?.value ?? null,
    range: measure?.range,
  };
};

// ── The pieces, curried from the config ──────────────────────────────────────

/** The staffing/selling verbs a board puts on its dials. */
export interface BoardLabels {
  readonly remove: string;
  readonly restore: string;
  readonly new: string;
}

/** What the mix chart needs beyond the series, which is the board's own. */
export interface MixOptions {
  /** The y-axis domain. A FIXED one is the point: bands' heights are then
   *  comparable across every edit, and a stack that rescaled itself would make
   *  a dropped row look like an unchanged one. */
  readonly yDomain: [number, number];
  readonly xTickValues?: readonly number[];
  readonly xTickFormat?: (value: number) => string;
  readonly yTickFormat?: (value: number) => string;
  readonly rule?: { value: number; label: string };
  readonly hoverLabel?: (at: number) => string;
  readonly margin?: { top: number; right: number; bottom: number; left: number };
  /** Anything the card's header carries beside the title — a cap input, say. */
  readonly header?: JSX.Element;
}

/** What the levels mix draws instead of a stack. */
export interface LevelsData {
  readonly levels: readonly Level[];
  readonly transfers: readonly Transfer[];
  readonly valueDomain: readonly [number, number];
  readonly formatValue: (value: number) => string;
}

/** The cash-flow card's own fixture and wiring. */
export interface CashflowOptions {
  readonly cells: readonly CashflowCell[];
  readonly fanOf: (index: number, nowIndex: number) => number;
  readonly nowIndex: number;
  readonly lineLabel: string;
}

/** The Add modal, as the board declares it. */
export interface BoardForm {
  readonly open: boolean;
  readonly title: string;
  readonly subtitle: string;
  readonly confirmLabel: string;
  readonly canConfirm: boolean;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
  readonly body: JSX.Element;
}

export interface BoardViewProps {
  readonly config: BoardConfig;
  /** The dials for the change being edited, already narrowed by the board. */
  readonly entities: readonly PairedMutationEntity[];
  /** The summary line under one entity's dials. */
  readonly summary?: (entity: PairedMutationEntity) => string;
  readonly labels: BoardLabels;

  readonly cashflow: CashflowOptions;
  readonly mixSeries?: readonly StackedAreaSeriesData[];
  readonly mixLevels?: LevelsData;
  readonly mix: MixOptions;
  readonly mixTitle: string;
  readonly cashflowTitle: string;
  readonly gaugeTitle: string;

  readonly changes: readonly { id: string; label: string }[];
  readonly selected: string | null;
  readonly emptyNote: string;
  readonly mutations: readonly Mutation[];

  /** The gauge's two needles. */
  readonly baseline: number;
  readonly value: number;

  readonly onSelect: (id: string) => void;
  readonly onMeasure: (id: string, measure: number, value: number) => void;
  readonly onRemove: (id: string) => void;
  readonly onRestore: (id: string) => void;
  readonly onAdd: () => void;
  readonly onReset: () => void;
  readonly onSave: () => void;
  readonly saveDisabled: boolean;
  readonly onDelete: (id: string) => void;
  readonly onPick?: (at: Date) => void;
  readonly onPickTime?: (at: TimeValue) => void;

  readonly form: BoardForm;
}

/**
 * THE BOARD, DRAWN.
 *
 * Every piece is curried INSIDE the component rather than at module level,
 * which is the one place this departs from the benches it replaces: a bench
 * curries once because it is one board, and this draws whichever board it is
 * handed. The curry is memoised on the config, so a board that does not change
 * its axes never re-curries.
 */
export const BoardView: Component<BoardViewProps> = (props) => {
  const groups = createMemo(() => groupsOf(props.config.axes));

  const Toolbar = createMutationToolbar({});

  const Gauge = createMemo(() =>
    createRateGauge({
      baselineLabel: "Baseline",
      formatAgainst: props.config.sentences.against,
      formatDelta: props.config.sentences.delta,
    }),
  );

  const StackChart = createMemo(() =>
    createStackedTimelineChart({
      ...(props.mix.margin === undefined ? {} : { margin: props.mix.margin }),
      ...(props.mix.yTickFormat === undefined
        ? {}
        : { yTickFormat: props.mix.yTickFormat }),
      ...(props.mix.xTickFormat === undefined
        ? {}
        : { xTickFormat: props.mix.xTickFormat }),
    }),
  );

  const Timeline = createMemo(() =>
    createLevelsTimeline({
      formatValue: props.mixLevels?.formatValue ?? String,
    }),
  );

  /** The dial row a group draws: a PAIR when it holds two axes, a single dial
   *  when it holds one. Curried per group, because the axes ARE the curry. */
  const rowsOf = createMemo(() =>
    map((group: AxisGroup) => {
      if (group.axes.length >= 2) {
        const Row = createPairedMutationSliders({
          axes: [group.axes[0] as MeasureAxis, group.axes[1] as MeasureAxis],
          labels: props.labels,
        });
        return { group, Row, paired: true as const };
      }
      const axis = group.axes[0] as MeasureAxis;
      const Row = createMutationSliders({
        format: axis.format,
        snap: axis.snap,
        labels: props.labels,
      });
      return { group, Row, paired: false as const };
    }, groups()),
  );

  /** ONE faint alternative in the fan, above or below the projection. */
  const fanSeries = (id: string, sign: number) => ({
    id,
    class: "scenario-board-demo__fan",
    balanceCents: (cell: CashflowCell, index: number): number =>
      cell.balanceCents +
      sign * props.cashflow.fanOf(index, props.cashflow.nowIndex) * 100,
  });

  /**
   * THE CASH FLOW CEILING IS A HIGH-WATER MARK (Peter, 2026-09-18: an axis
   * that re-fits on every drag jitters). It rises when a change pushes the line
   * above it and never falls, so a drag down moves the LINE and leaves the axis
   * alone; the shrink button resets it to the current peak, eased.
   */
  const ceiling = createHighWaterMark(() => {
    let peak = 0;
    for (const [index, cell] of props.cashflow.cells.entries()) {
      const top =
        cell.balanceCents +
        Math.abs(props.cashflow.fanOf(index, props.cashflow.nowIndex)) * 100;
      if (top > peak) peak = top;
    }
    return peak;
  });

  return (
    <div class="component-section component-section--full scenario-board-frame">
      <ViewportColumn>
        <SectionTitle>{props.config.title}</SectionTitle>

        {/* The top half, halved again: two charts stacked. Each card is a
            FillCardSurface — it takes its half of the band and lays out a
            column that fills it — so the title keeps its own height and the
            GrowFillBox hands the chart everything left. */}
        <HalfFillColumn>
          <HalfFillColumn>
            <FillCardSurface>
              <SpreadRow>
                <TextTitle>{props.cashflowTitle}</TextTitle>
                <IconOnlyButton
                  onClick={ceiling.reset}
                  aria-label="Fit y-axis to current values"
                  title="Fit y-axis to current values"
                >
                  <Icon name="shrink" size="sm" />
                </IconOnlyButton>
              </SpreadRow>
              <GrowFillBox>
                <CashflowScrubChart
                  cells={[...props.cashflow.cells]}
                  yMax={ceiling.ceiling()}
                  scrub={false}
                  chartHeight="fill"
                  showGridlines
                  lineLabel={props.cashflow.lineLabel}
                  balanceSeries={[
                    fanSeries("optimistic", 1),
                    fanSeries("pessimistic", -1),
                  ]}
                />
              </GrowFillBox>
            </FillCardSurface>
          </HalfFillColumn>

          <HalfFillColumn>
            <FillCardSurface>
              <SpreadRow>
                <TextTitle>{props.mixTitle}</TextTitle>
                {props.mix.header}
              </SpreadRow>
              <Show
                when={props.config.mix === "levels" ? props.mixLevels : null}
                fallback={
                  <StackedMix
                    Chart={StackChart()}
                    series={props.mixSeries ?? []}
                    config={props.config}
                    mix={props.mix}
                    mutations={props.mutations}
                    onPick={props.onPick}
                  />
                }
              >
                {(levels) => {
                  const Chart = Timeline();
                  return (
                    <GrowFillBox>
                      <Chart
                        levels={levels().levels}
                        transfers={levels().transfers}
                        mutations={props.mutations}
                        domain={props.config.domain}
                        valueDomain={levels().valueDomain}
                        selectedMutationId={props.selected ?? undefined}
                        onSelectMutation={props.onSelect}
                        onPick={props.onPickTime}
                      />
                    </GrowFillBox>
                  );
                }}
              </Show>
            </FillCardSurface>
          </HalfFillColumn>
        </HalfFillColumn>

        {/* The bottom half: Changes wide-left, the gauge narrow-right. */}
        <HalfFillColumn>
          <FillWrapRow>
            <MajorPaneBox>
              <FillCardSurface>
                {/* NO extra Stack here. `FillCardSurface` already lays its
                    children out as a column that FILLS the card, so a second
                    column inside it would sit at its own content height and
                    leave the dials ending part-way down. */}
                <Toolbar
                  title="Changes"
                  changes={props.changes}
                  selected={props.selected}
                  onSelect={props.onSelect}
                  emptyNote={props.emptyNote}
                  onAdd={props.onAdd}
                  onReset={props.onReset}
                  onSave={props.onSave}
                  saveDisabled={props.saveDisabled}
                  onDelete={props.onDelete}
                />
                {/* `Index`, not `For`: the rows are derived wholesale from the
                    config's axes, so POSITION is their identity. */}
                <Index each={rowsOf()}>
                  {(row) => (
                    <GrowFillBox>
                      <Show
                        when={row().paired}
                        fallback={
                          <SingleRow
                            Row={row().Row as ReturnType<typeof createMutationSliders>}
                            group={row().group}
                            entities={props.entities}
                            axis={row().group.axes[0] as MeasureAxis}
                            onMeasure={props.onMeasure}
                            onRemove={props.onRemove}
                            onRestore={props.onRestore}
                            onAdd={props.onAdd}
                          />
                        }
                      >
                        <PairedRow
                          Row={
                            row().Row as ReturnType<
                              typeof createPairedMutationSliders
                            >
                          }
                          group={row().group}
                          entities={props.entities}
                          summary={props.summary}
                          onMeasure={props.onMeasure}
                          onRemove={props.onRemove}
                          onRestore={props.onRestore}
                          onAdd={props.onAdd}
                        />
                      </Show>
                    </GrowFillBox>
                  )}
                </Index>
              </FillCardSurface>
            </MajorPaneBox>

            <GrowFillBox class="scenario-board-gauge">
              <FillCardSurface>
                <TextTitle>{props.gaugeTitle}</TextTitle>
                <GrowCenterColumn>
                  <BoardGauge
                    Gauge={Gauge()}
                    domain={props.config.rateDomain}
                    baseline={props.baseline}
                    caution={props.config.comfortable}
                    value={props.value}
                  />
                </GrowCenterColumn>
              </FillCardSurface>
            </GrowFillBox>
          </FillWrapRow>
        </HalfFillColumn>
      </ViewportColumn>

      {/* The Add form. Rendered here rather than beside the dials because it
          PORTALS — where it sits in this tree decides nothing about where it
          draws, and the state it edits is the board's. */}
      <Modal
        open={props.form.open}
        onClose={props.form.onClose}
        title={props.form.title}
        subtitle={props.form.subtitle}
        footer={
          <EndWrapRow>
            <GhostButton onClick={props.form.onClose}>Cancel</GhostButton>
            <PrimaryButton
              disabled={!props.form.canConfirm}
              onClick={props.form.onConfirm}
            >
              {props.form.confirmLabel}
            </PrimaryButton>
          </EndWrapRow>
        }
      >
        {props.form.body}
      </Modal>
    </div>
  );
};

/** The stacked mix, lifted out so the `Show` fallback stays one expression. */
const StackedMix: Component<{
  Chart: ReturnType<typeof createStackedTimelineChart>;
  series: readonly StackedAreaSeriesData[];
  config: BoardConfig;
  mix: MixOptions;
  mutations: readonly Mutation[];
  onPick?: (at: Date) => void;
}> = (props) => (
  <props.Chart
    series={props.series}
    xDomain={[
      new Date(props.config.domain[0] as Date),
      new Date(props.config.domain[1] as Date),
    ]}
    yDomain={props.mix.yDomain}
    xTickValues={props.mix.xTickValues}
    rule={props.mix.rule}
    events={props.mutations}
    hoverLabel={props.mix.hoverLabel}
    onPick={props.onPick}
  />
);

/** The gauge, lifted out for the same reason. */
const BoardGauge: Component<{
  Gauge: ReturnType<typeof createRateGauge>;
  domain: readonly [number, number];
  baseline: number;
  caution: number;
  value: number;
}> = (props) => (
  <props.Gauge
    domain={props.domain}
    baseline={props.baseline}
    caution={props.caution}
    value={props.value}
    label="Scenario"
  />
);

/** A PAIRED row, with its local measure index mapped back to the global one. */
const PairedRow: Component<{
  Row: ReturnType<typeof createPairedMutationSliders>;
  group: AxisGroup;
  entities: readonly PairedMutationEntity[];
  summary?: (entity: PairedMutationEntity) => string;
  onMeasure: (id: string, measure: number, value: number) => void;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
  onAdd: () => void;
}> = (props) => (
  <props.Row
    entities={map(
      (entity: PairedMutationEntity) => pairFor(entity, props.group),
      props.entities,
    )}
    summary={props.summary}
    onChange={(id: string, measure: MeasureIndex, value: number) =>
      props.onMeasure(id, globalIndex(props.group, measure), value)
    }
    onRemove={props.onRemove}
    onRestore={props.onRestore}
    onAdd={props.onAdd}
  />
);

/** A SINGLE-dial row — the Scenario Board's shape. */
const SingleRow: Component<{
  Row: ReturnType<typeof createMutationSliders>;
  group: AxisGroup;
  entities: readonly PairedMutationEntity[];
  axis: MeasureAxis;
  onMeasure: (id: string, measure: number, value: number) => void;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
  onAdd: () => void;
}> = (props) => (
  <props.Row
    entities={map(
      (entity: PairedMutationEntity) => dialFor(entity, props.group),
      props.entities,
    )}
    domain={props.axis.domain}
    onChange={(id: string, value: number) =>
      props.onMeasure(id, globalIndex(props.group, 0), value)
    }
    onRemove={props.onRemove}
    onRestore={props.onRestore}
    onAdd={props.onAdd}
  />
);
