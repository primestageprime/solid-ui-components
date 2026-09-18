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
 * ── WHICH DIAL ROW, AND WHY THERE ARE THREE ───────────────────────────────
 *
 * The row is chosen by how many axes the config declares:
 *
 *   1 axis    `MutationSliders`          the Scenario Board's shape
 *   2 axes    `PairedMutationSliders`    the Hourly Board's shape
 *   3+ axes   `GroupedMutationSliders`   N measures under captioned groups
 *
 * The third arrived on 2026-09-18 (#161) and is the reason this file has no
 * index arithmetic in it. Before it existed, four axes had to be drawn as TWO
 * paired rows — `PairedMutationSliders.measures` is a strict 2-tuple and its
 * `MeasureIndex` is `0 | 1` — so each row reported an index inside its own
 * pair and the view had to map that back to the global measure. Getting that
 * wrong writes a value into the wrong measure, which is the bug the Hourly
 * bench's own comment warns about ("ignoring the measure index would write an
 * hours figure into a rate"), one board further along.
 *
 * `GroupedMutationSliders` takes all N measures and the groups directly and
 * reports a GLOBAL index, so that mapping is not needed and is not written.
 * `groupsOf` survives because the 1- and 2-axis rows still need to know a
 * config declares one row, and `BoardView.test.ts` pins it — including that a
 * four-axis board is ONE grouped row rather than two paired ones.
 *
 * ── WHAT THE BOARD STILL SUPPLIES ──────────────────────────────────────────
 *
 * The cash-flow fixture, the mix chart's own options and the Add form's BODY
 * are props rather than config fields. They are the parts that are genuinely a
 * board's own — hand-written committed flows, a y-axis cap, a form with the
 * board's own field names — and folding them into `BoardConfig` would make the
 * config a second copy of the bench rather than a description of it.
 */
import { type Component, Index, type JSX, createMemo } from "solid-js";
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
// A RELATIVE import into `src/components/`, on purpose: `GroupedMutationSliders`
// is still on the workshop bench and deliberately absent from the package
// barrel, and its own barrel says so. The path is the honest signal.
import { createGroupedMutationSliders } from "../../../../src/components/GroupedMutationSliders";
import type {
  GroupedMeasureAxis,
  GroupedMeasureIndex,
  GroupedMutationEntity,
} from "../../../../src/components/GroupedMutationSliders";
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
  /**
   * Anything the card's header carries beside the title — a cap input, say.
   *
   * A FUNCTION, not an element. `props.mix` is a getter over the board's own
   * object literal, so every read of it REBUILDS whatever JSX that literal
   * holds; an element here would be a fresh control on every reactive read, and
   * a control that measures or focuses itself on mount then never settles. A
   * function is read once and called once.
   */
  readonly header?: () => JSX.Element;
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
  /**
   * The form's fields. A FUNCTION for the same reason as `MixOptions.header`,
   * plus one of its own: `Modal` creates its children lazily inside a `Show`,
   * which is what makes an `onMount` in the form fire on every OPEN — exactly
   * when the first field wants the caret. An element built up front would have
   * run that `onMount` once, at page load, with no modal on screen.
   */
  readonly body: () => JSX.Element;
}

export interface BoardViewProps {
  readonly config: BoardConfig;
  /** The dials for the change being edited, already narrowed by the board. */
  readonly entities: readonly PairedMutationEntity[];
  /**
   * The consumer's one-line reading of a whole entity, printed under its dials.
   *
   * Typed against the WIDE entity — measures as a readonly list rather than a
   * 2-tuple — because a summary is the one prop both slider components share
   * and the two disagree about arity. Typing it as the paired 2-tuple and
   * casting on the grouped path would hand a six-measure board an entity that
   * CLAIMS to have two, which is the same class of mistake the index remapping
   * existed to prevent, moved one layer up. A function accepting the wide shape
   * is assignable to the narrow one, so the paired path needs no cast either.
   */
  readonly summary?: (entity: GroupedMutationEntity) => string;
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
 * -- EVERY CURRY HAPPENS ONCE, AT SETUP, AND THAT IS NOT AN OPTIMISATION ----
 *
 * A curried SUI component is a NEW component function. Building one inside a
 * memo that re-runs -- and a prop read inside a memo re-runs whenever anything
 * that prop's expression touches changes -- hands Solid a different component
 * on every change, which UNMOUNTS and REMOUNTS the whole subtree. For a row of
 * sliders that measures itself in `onMount`, the remount delivers a
 * measurement, which re-renders, which re-curries: the page locks up with no
 * error in the console, which is exactly how this was found.
 *
 * So the curries below read `props` ONCE, at setup, outside any tracking scope.
 * That is sound rather than a shortcut: everything they read -- the axes, the
 * sentences, the tick formatters, the plot inset -- is a property of the BOARD
 * and is a module constant on all three benches. What varies at render time
 * (the y-domain, the series, the entities) is passed as data below and is not
 * curried at all. This is the same split the benches already had; the kit just
 * has to be explicit about which half is which.
 */
export const BoardView: Component<BoardViewProps> = (props) => {
  // Read once, on purpose -- see the header. A board does not change its shape.
  const config = props.config;
  const groups = groupsOf(config.axes);
  const mix = props.mix;
  const labels = props.labels;
  // The two JSX slots, captured ONCE — see `MixOptions.header` for why they are
  // functions and why reading them repeatedly is what locked the page up.
  const mixHeader = props.mix.header;
  const formBody = props.form.body;

  const Toolbar = createMutationToolbar({});

  const Gauge = createRateGauge({
    baselineLabel: "Baseline",
    formatAgainst: config.sentences.against,
    formatDelta: config.sentences.delta,
  });

  const StackChart = createStackedTimelineChart({
    ...(mix.margin === undefined ? {} : { margin: mix.margin }),
    ...(mix.yTickFormat === undefined ? {} : { yTickFormat: mix.yTickFormat }),
    ...(mix.xTickFormat === undefined ? {} : { xTickFormat: mix.xTickFormat }),
  });

  const Timeline = createLevelsTimeline({
    formatValue: props.mixLevels?.formatValue ?? String,
  });

  /**
   * THE DIAL ROW, chosen by arity. See the header for why three and not one.
   *
   * Three or more axes is ONE grouped row over every measure — not a stack of
   * paired ones — so nothing here remaps an index.
   */
  const grouped = config.axes.length > 2;

  const GroupedRow = grouped
    ? createGroupedMutationSliders({
        axes: map(
          (axis: MeasureAxis): GroupedMeasureAxis => ({
            label: axis.label,
            domain: axis.domain,
            snap: axis.snap,
            format: axis.format,
            ...(axis.group === undefined ? {} : { group: axis.group }),
          }),
          config.axes,
        ),
        labels,
      })
    : undefined;

  /** The 1- and 2-axis rows, curried per group. The axes ARE the curry. */
  const rows = grouped
    ? []
    : map((group: AxisGroup) => {
        if (group.axes.length >= 2) {
          const Row = createPairedMutationSliders({
            axes: [group.axes[0] as MeasureAxis, group.axes[1] as MeasureAxis],
            labels,
          });
          return { group, Row, paired: true as const };
        }
        const axis = group.axes[0] as MeasureAxis;
        const Row = createMutationSliders({
          format: axis.format,
          snap: axis.snap,
          labels,
        });
        return { group, Row, paired: false as const };
      }, groups);

  /**
   * The cells as a MUTABLE array, memoised.
   *
   * `CashflowScrubChart.cells` is `CashflowCell[]` and the board hands over a
   * `readonly` list, so a copy is needed — but the copy must be MEMOISED, not
   * spread at the call site. `props.cashflow` is a getter: reading it re-runs
   * the board's object literal, so `cells={[...props.cashflow.cells]}` hands
   * the chart a brand-new array on every read, and anything downstream keyed on
   * that array's identity never settles.
   */
  const cells = createMemo(() => [...props.cashflow.cells]);

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
                  cells={cells()}
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
                {mixHeader?.()}
              </SpreadRow>
              {/* A CONDITIONAL EXPRESSION, not `Show`+`fallback`. A JSX
                  element written in a `fallback` prop is CONSTRUCTED when the
                  `Show` is created, whichever branch wins — so a fallback here
                  would build the levels chart on a stacked board and the stack
                  on a levels one, each with the other's props. An expression
                  builds only the branch it returns. */}
              {config.mix === "levels" && props.mixLevels !== undefined ? (
                <GrowFillBox>
                  <Timeline
                    levels={props.mixLevels.levels}
                    transfers={props.mixLevels.transfers}
                    mutations={props.mutations}
                    domain={config.domain}
                    valueDomain={props.mixLevels.valueDomain}
                    selectedMutationId={props.selected ?? undefined}
                    onSelectMutation={props.onSelect}
                    onPick={props.onPickTime}
                  />
                </GrowFillBox>
              ) : (
                <StackedMix
                  Chart={StackChart}
                  series={props.mixSeries ?? []}
                  config={config}
                  mix={props.mix}
                  mutations={props.mutations}
                  onPick={props.onPick}
                />
              )}
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
                    config's axes, so POSITION is their identity. The branch is
                    a conditional EXPRESSION for the same reason as the mix
                    card above — a `fallback` would construct a single-dial row
                    around a paired component on every two-axis board. */}
                {GroupedRow !== undefined ? (
                  <GrowFillBox>
                    <GroupedRow
                      entities={map(
                        (entity: PairedMutationEntity): GroupedMutationEntity => ({
                          id: entity.id,
                          label: entity.label,
                          measures: entity.measures,
                        }),
                        props.entities,
                      )}
                      summary={props.summary}
                      onChange={(
                        id: string,
                        measure: GroupedMeasureIndex,
                        value: number,
                      ) => props.onMeasure(id, measure, value)}
                      onRemove={props.onRemove}
                      onRestore={props.onRestore}
                      onAdd={props.onAdd}
                    />
                  </GrowFillBox>
                ) : null}
                <Index each={rows}>
                  {(row) => (
                    <GrowFillBox>
                      {row().paired ? (
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
                      ) : (
                        <SingleRow
                          Row={
                            row().Row as ReturnType<
                              typeof createMutationSliders
                            >
                          }
                          group={row().group}
                          entities={props.entities}
                          axis={row().group.axes[0] as MeasureAxis}
                          onMeasure={props.onMeasure}
                          onRemove={props.onRemove}
                          onRestore={props.onRestore}
                          onAdd={props.onAdd}
                        />
                      )}
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
                    Gauge={Gauge}
                    domain={config.rateDomain}
                    baseline={props.baseline}
                    caution={config.comfortable}
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
        {formBody()}
      </Modal>
    </div>
  );
};

/** The stacked mix, lifted out so the branch above stays one expression. */
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
  summary?: (entity: GroupedMutationEntity) => string;
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
