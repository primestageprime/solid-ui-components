// ============================================
// LevelsTimeline — Atomic (Depth 1).
// Owns CSS (LevelsTimeline.css). Composes no other component.
//
// A horizontal time chart of pay LEVELS. Each level is a RAIL at a fixed y —
// a level does not go anywhere — and what varies along it is its THICKNESS,
// which is proportional to the headcount holding that level. People moving up
// are not a step in either line: they are a FLOW, a ribbon running from the
// source rail to the destination rail at the moment of the move, on the same
// width scale, so the lower rail visibly thins and the upper one thickens
// across that x. A level that appears mid-chart is a first hire; a level
// nobody holds draws nothing at all.
//
// Two vertical channels, and they never double up. Numbered FLAGS sit above
// the plot for the CONSUMER's named mutations, each dropping a rule through
// the whole plot. Every OTHER change — a headcount point, a transfer, a level
// starting — gets a thin muted dropline instead, so a lone hire on no
// particular date is still visible as an event.
//
// This REPLACED a stepped model in which y moved and thickness was constant.
// Per the add/deprecate/delete commandment the rail path went in BESIDE it,
// its one consumer (scenario-board) moved over at its own pace, and only then
// was `series` deleted — one breaking change at the end rather than a broken
// consumer at the start.
//
// Everything positional lives in geometry.ts, which is pure and prints as a
// table (geometry.test.ts); this file only paints what that returns. It is the
// headless-observation-first discipline made structural: there is nowhere in
// this module for a number to be decided.
//
// Why it is still Atomic: the only consumer text it PAINTS is a mutation's
// flag number and a level's own short code ("L7") — both enumerated and short
// by construction, like an axis tick. A free-text label would drag in the
// ellipsize-plus-Tooltip treatment Peter's standing rule requires and make this
// Depth 2, which is what happened to RateGauge. See the /promote questions.
//
// No size/variant props and no factory: every prop is DATA. The chart fills
// its container's width and the consumer constrains it, as RateGauge does.
// ============================================
import {
  For,
  type Component,
  createMemo,
  createUniqueId,
} from "solid-js";
import {
  AXIS_LABEL_Y,
  AXIS_TICK_LENGTH,
  FLAG_RULE_TOP,
  PLOT_BOTTOM,
  PLOT_LEFT,
  PLOT_RIGHT,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type Flag,
  type Level,
  type Mutation,
  type Rail,
  type FlowBand,
  type TimeDomain,
  type Transfer,
  levelsRailGeometry,
  timeOf,
} from "./geometry";
import { filter, find, join, map, sortBy } from "../../fn";
import "./LevelsTimeline.css";

export interface LevelsTimelineProps {
  /**
   * The pay levels, as rails. A level is keyed by its `value`, and `value` IS
   * its y — so two levels sharing a value are drawn on top of each other. A
   * consumer whose groups can share a figure wants one chart per group, as the
   * bench does with its three tracks.
   */
  levels: readonly Level[];
  /** People moving between levels. Drawn as flows. */
  transfers?: readonly Transfer[];
  /** The numbered events. Each gets a flag above the plot and a rule through it. */
  mutations: readonly Mutation[];
  /** The visible span. The consumer's, never derived from the data. */
  domain: TimeDomain;
  /** Which mutation is lit. Its flag and rule take the accent; the rest mute. */
  selectedMutationId?: string;
  /** Provided => the flags become buttons. Omitted => the chart is a readout. */
  onSelectMutation?: (id: string) => void;
}

/** How many series colours the theme defines (`--sui-series-1` … `-8`). */
const SERIES_TOKEN_COUNT = 8;

/** `1..8`, wrapping — a ninth rail reuses the first colour rather than none. */
const tokenOf = (seriesIndex: number): number =>
  ((seriesIndex - 1) % SERIES_TOKEN_COUNT) + 1;

const EMPTY_TRANSFERS: readonly Transfer[] = [];

/** `1 person`, `3 people`. The announcement is prose; it has to read as prose. */
const headcount = (count: number): string =>
  count === 1 ? "1 person" : `${count} people`;

/** One level, said out loud: what it starts holding and what it ends holding. */
const describeLevel = (level: Level): string => {
  if (level.points.length === 0) return `${level.label}: nobody.`;
  const ordered = sortBy((point) => timeOf(point.at), level.points);
  const first = ordered[0].count;
  const last = ordered[ordered.length - 1].count;
  if (first === last) return `${level.label}: ${headcount(first)} throughout.`;
  if (last === 0) return `${level.label}: ${headcount(first)}, ending empty.`;
  return `${level.label}: ${headcount(first)}, ending at ${last}.`;
};

/**
 * One flow, said out loud, named by its numbered mutation where it has one.
 * A one-ended flow is announced as what it is — a departure or a hire — so a
 * screen reader gets the conservation the picture gets.
 */
const describeTransfer = (
  transfer: Transfer,
  levels: readonly Level[],
  mutations: readonly Mutation[],
): string => {
  const labelOf = (id: string): string =>
    find((level: Level) => level.id === id, levels)?.label ?? id;
  const flag = find(
    (mutation: Mutation) => timeOf(mutation.at) === timeOf(transfer.at),
    mutations,
  );
  const when = flag === undefined ? "" : ` at mutation ${flag.label}`;
  const what = (): string => {
    if (transfer.from !== undefined && transfer.to !== undefined) {
      return `moved from ${labelOf(transfer.from)} to ${labelOf(transfer.to)}`;
    }
    if (transfer.from !== undefined)
      return `left from ${labelOf(transfer.from)}`;
    if (transfer.to !== undefined) return `joined at ${labelOf(transfer.to)}`;
    return "moved";
  };
  return `${headcount(transfer.count)} ${what()}${when}.`;
};

export const LevelsTimeline: Component<LevelsTimelineProps> = (props) => {
  const transfers = () => props.transfers ?? EMPTY_TRANSFERS;

  const geometry = createMemo(() =>
    levelsRailGeometry({
      levels: props.levels,
      transfers: transfers(),
      mutations: props.mutations,
      domain: props.domain,
    }),
  );

  const interactive = () => props.onSelectMutation !== undefined;
  const isSelected = (flag: Flag): boolean =>
    props.selectedMutationId === flag.id;
  /** Nothing selected = nothing muted; the chart reads as a plain readout. */
  const isMuted = (flag: Flag): boolean =>
    props.selectedMutationId !== undefined && !isSelected(flag);

  // The announcement has to carry what the picture carries — how many people
  // hold each level, and who moved where — or the reading is thickness-only,
  // which is exactly the channel a screen reader cannot see.
  const description = () =>
    join(" ", [
      `Headcount by pay level, ${props.mutations.length} marked mutations.`,
      ...map(describeLevel, props.levels),
      ...map(
        (transfer: Transfer) =>
          describeTransfer(transfer, props.levels, props.mutations),
        sortBy((transfer: Transfer) => timeOf(transfer.at), transfers()),
      ),
    ]);

  /** `sui-levels-timeline__<block> sui-levels-timeline__tone-N`. */
  const toneClass = (block: string, seriesIndex: number | undefined): string =>
    `sui-levels-timeline__${block} sui-levels-timeline__tone-${tokenOf(
      seriesIndex ?? 1,
    )}`;

  const railClass = (rail: Rail): string => toneClass("rail", rail.seriesIndex);

  /**
   * A CONTINUATION is painted exactly as the band is — same classes, same
   * tone, full opacity — because nothing happened to that rail here and the
   * join must be invisible. It is only split at all because something happened
   * elsewhere on the chart, and a rail that read as dashed would be inventing
   * an event it did not have.
   */
  const isContinuation = (flow: FlowBand): boolean =>
    flow.kind === "continuation";

  const flowClass = (flow: FlowBand): string =>
    isContinuation(flow)
      ? toneClass("rail", flow.fromSeriesIndex)
      : join(" ", [
          "sui-levels-timeline__ribbon",
          `sui-levels-timeline__ribbon--${flow.kind}`,
        ]);

  /**
   * A flow is painted with its own horizontal gradient, running from the
   * source level's tone to the destination's — which is what makes a ribbon
   * read as belonging to both ends rather than being stolen from one of them.
   * A one-ended flow graduates to TRANSPARENT instead, so a departure fades
   * out of the picture and a hire fades into it; that fade is the only thing
   * distinguishing the two, since both are the same shape.
   */
  const gradientId = (flow: FlowBand): string => `${maskId}-${flow.key}`;
  const toneVar = (index: number | undefined): string =>
    index === undefined ? "transparent" : `var(--sui-series-${tokenOf(index)})`;

  /** Per-INSTANCE id prefix for this chart's gradients. */
  const maskId = createUniqueId();

  const flagClass = (flag: Flag, block: string): string =>
    join(" ", [
      `sui-levels-timeline__${block}`,
      isSelected(flag) ? `sui-levels-timeline__${block}--selected` : "",
      isMuted(flag) ? `sui-levels-timeline__${block}--muted` : "",
    ]);

  /**
   * A flag's name carries its own state. `aria-pressed` would be the idiomatic
   * carrier, but the role here is conditional (`interactive()`), so a static
   * linter reads the attribute against a bare <g> and rejects it — and a
   * conditional `aria-pressed` on a non-button is worse than none. The word is
   * unambiguous and survives the same reading.
   */
  const flagLabel = (flag: Flag): string =>
    isSelected(flag)
      ? `Mutation ${flag.label}, selected`
      : `Mutation ${flag.label}`;

  const select = (flag: Flag): void => props.onSelectMutation?.(flag.id);

  const onFlagKeyDown = (event: KeyboardEvent, flag: Flag): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    select(flag);
  };

  return (
    <div
      class="sui-levels-timeline"
      data-selected-mutation={props.selectedMutationId}
    >
      {/* The announcement lives on the canvas's own <title> rather than on a
          wrapper with role="img": role="img" would make the whole canvas
          presentational and take the flags — which are real buttons when
          selection is wired — out of the accessibility tree with it. A <title>
          names the graphic and leaves its contents reachable. */}
      <svg
        class="sui-levels-timeline__canvas"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      >
        <title>{description()}</title>
        {/* One gradient per flow. The ids are per-INSTANCE (createUniqueId)
            because three charts on one page — which the bench stacks — would
            otherwise share one set and the first mounted would own them all. */}
        <defs>
          <For each={filter((flow: FlowBand) => !isContinuation(flow), geometry().flows)}>
            {(flow) => (
              <linearGradient id={gradientId(flow)} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color={toneVar(flow.fromSeriesIndex)} />
                <stop offset="100%" stop-color={toneVar(flow.toSeriesIndex)} />
              </linearGradient>
            )}
          </For>
        </defs>
        <g>
          <line
            class="sui-levels-timeline__baseline"
            x1={PLOT_LEFT}
            x2={PLOT_RIGHT}
            y1={PLOT_BOTTOM}
            y2={PLOT_BOTTOM}
          />

          {/* The month axis. Built from DateAxis's own calendar (geometry.ts),
              so the chart and the axis component agree on where a month is. */}
          <For each={geometry().ticks}>
            {(tick) => (
              <g class="sui-levels-timeline__tick">
                <line
                  x1={tick.x}
                  x2={tick.x}
                  y1={PLOT_BOTTOM}
                  y2={PLOT_BOTTOM + AXIS_TICK_LENGTH}
                />
                <text
                  class="sui-levels-timeline__tick-label"
                  x={tick.x}
                  y={AXIS_LABEL_Y}
                  text-anchor="middle"
                >
                  {tick.label}
                </text>
              </g>
            )}
          </For>

          {/* The un-numbered changes. Thinner and fainter than a flag's rule,
              because they carry no name — they only say "something happened
              here", which is precisely what a lone hire needs. */}
          <For each={geometry().droplines}>
            {(dropline) => (
              <line
                class="sui-levels-timeline__dropline"
                x1={dropline.x}
                x2={dropline.x}
                y1={FLAG_RULE_TOP}
                y2={PLOT_BOTTOM}
              />
            )}
          </For>

          {/* The flags' rules, under everything: a rule locates a change, it
              does not compete with one. */}
          <For each={geometry().flags}>
            {(flag) => (
              <line
                class={flagClass(flag, "rule")}
                x1={flag.x}
                x2={flag.x}
                y1={flag.ruleTop}
                y2={flag.ruleBottom}
              />
            )}
          </For>

          {/* Flows first, UNDER the rails they join, so a flow reads as
              growing out from beneath both ends rather than crossing them. */}
          <For each={geometry().flows}>
            {(flow) => (
              <path
                class={flowClass(flow)}
                d={flow.path}
                fill={
                  isContinuation(flow)
                    ? undefined
                    : `url(#${gradientId(flow)})`
                }
              />
            )}
          </For>

          <For each={geometry().rails}>
            {(rail) => (
              <g class="sui-levels-timeline__rail-group">
                <For each={rail.runs}>
                  {(run) => <path class={railClass(rail)} d={run.path} />}
                </For>
              </g>
            )}
          </For>
        </g>

        {/* The flags. Buttons when the consumer wants selection, plain marks
            otherwise — a chart nobody can drive should not advertise a
            control, and an unreachable one should not exist. */}
        <For each={geometry().flags}>
          {(flag) => (
            // biome-ignore lint/a11y/noStaticElementInteractions: conditionally interactive — role="button", tabindex and Enter/Space keyboard parity are wired exactly when onSelectMutation is provided (interactive()); the analyzer cannot see through that runtime guard.
            <g
              class={flagClass(flag, "flag")}
              role={interactive() ? "button" : undefined}
              tabindex={interactive() ? 0 : undefined}
              aria-label={interactive() ? flagLabel(flag) : undefined}
              data-selected={isSelected(flag) ? "true" : undefined}
              onClick={interactive() ? () => select(flag) : undefined}
              onKeyDown={
                interactive()
                  ? (event: KeyboardEvent) => onFlagKeyDown(event, flag)
                  : undefined
              }
            >
              <rect
                class="sui-levels-timeline__flag-box"
                x={flag.boxX}
                y={flag.boxY}
                width={flag.boxWidth}
                height={flag.boxHeight}
                rx="3"
              />
              <text
                class="sui-levels-timeline__flag-label"
                x={flag.textX}
                y={flag.textY}
                text-anchor="middle"
                dominant-baseline="central"
              >
                {flag.label}
              </text>
            </g>
          )}
        </For>
      </svg>
    </div>
  );
};
