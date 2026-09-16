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
// DEPRECATED, still shipped: the original STEPPED model, in which y moved and
// thickness was constant — a person's pay stepping up. `series` still renders
// exactly as it did, because scenario-board consumes it today. Per the
// add/deprecate/delete commandment the new path went in beside it rather than
// over it; phase 3 deletes `series` once nothing reads it. Pass `levels` for
// the rail model, `series` for the stepped one; `levels` wins if both arrive.
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
  Show,
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
  type Line,
  type Mutation,
  type Rail,
  type Ribbon,
  type Series,
  type TimeDomain,
  type Transfer,
  levelsRailGeometry,
  levelsTimelineGeometry,
  timeOf,
} from "./geometry";
import { filter, find, join, map, sortBy } from "../../fn";
import "./LevelsTimeline.css";

export interface LevelsTimelineProps {
  /** The pay levels, as rails. The current model. */
  levels?: readonly Level[];
  /** People moving between levels. Drawn as flows. Meaningless without `levels`. */
  transfers?: readonly Transfer[];
  /**
   * @deprecated The stepped model — y moves, thickness is constant. Kept so
   * scenario-board keeps rendering while it migrates to `levels`. Ignored when
   * `levels` is supplied.
   */
  series?: readonly Series[];
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

const EMPTY_LEVELS: readonly Level[] = [];
const EMPTY_TRANSFERS: readonly Transfer[] = [];
const EMPTY_SERIES: readonly Series[] = [];

/** One level, said out loud: what it starts holding and what it ends holding. */
const describeLevel = (level: Level): string => {
  if (level.points.length === 0) return `${level.label}: nobody.`;
  const ordered = sortBy((point) => timeOf(point.at), level.points);
  const first = ordered[0].count;
  const last = ordered[ordered.length - 1].count;
  if (first === last) return `${level.label}: ${first} people throughout.`;
  return `${level.label}: ${first} people, ending at ${last}.`;
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
    if (transfer.from !== undefined) return `left from ${labelOf(transfer.from)}`;
    if (transfer.to !== undefined) return `joined at ${labelOf(transfer.to)}`;
    return "moved";
  };
  return `${transfer.count} ${what()}${when}.`;
};

/** One series, said out loud — the deprecated stepped model's announcement. */
const describeSeries = (
  series: Series,
  mutations: readonly Mutation[],
): string => {
  if (series.points.length === 0) return `${series.label}: no levels.`;
  const ordered = sortBy((point) => timeOf(point.at), series.points);
  const moments = new Set(map((point) => timeOf(point.at), series.points));
  const marks = map(
    (mutation: Mutation) => mutation.label,
    filter(
      (mutation: Mutation) => moments.has(timeOf(mutation.at)),
      sortBy((mutation: Mutation) => timeOf(mutation.at), mutations),
    ),
  );
  const first = ordered[0].level;
  const last = ordered[ordered.length - 1].level;
  if (marks.length === 0) return `${series.label}: ${first}, holding.`;
  return `${series.label}: ${first}, stepping at ${join(", ", marks)} to ${last}.`;
};

export const LevelsTimeline: Component<LevelsTimelineProps> = (props) => {
  const levels = () => props.levels ?? EMPTY_LEVELS;
  const transfers = () => props.transfers ?? EMPTY_TRANSFERS;
  const series = () => props.series ?? EMPTY_SERIES;
  /** `levels` wins: the rail model is the current one. */
  const isRails = () => props.levels !== undefined;

  const railGeometry = createMemo(() =>
    levelsRailGeometry({
      levels: levels(),
      transfers: transfers(),
      mutations: props.mutations,
      domain: props.domain,
    }),
  );
  const stepGeometry = createMemo(() =>
    levelsTimelineGeometry({
      series: series(),
      mutations: props.mutations,
      domain: props.domain,
    }),
  );
  /** Flags and ticks are the same question in either model. */
  const frame = () => (isRails() ? railGeometry() : stepGeometry());

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
    isRails()
      ? join(" ", [
          `Headcount by pay level, ${props.mutations.length} marked mutations.`,
          ...map(describeLevel, levels()),
          ...map(
            (transfer: Transfer) =>
              describeTransfer(transfer, levels(), props.mutations),
            sortBy((transfer: Transfer) => timeOf(transfer.at), transfers()),
          ),
        ])
      : join(" ", [
          `Levels over time, ${props.mutations.length} marked mutations.`,
          ...map(
            (one: Series) => describeSeries(one, props.mutations),
            series(),
          ),
        ]);

  const railClass = (rail: Rail): string =>
    `sui-levels-timeline__rail sui-levels-timeline__tone-${tokenOf(
      rail.seriesIndex,
    )}`;

  const ribbonClass = (ribbon: Ribbon): string =>
    join(" ", [
      "sui-levels-timeline__ribbon",
      `sui-levels-timeline__ribbon--${ribbon.kind}`,
      `sui-levels-timeline__tone-${tokenOf(ribbon.seriesIndex)}`,
    ]);

  /**
   * A one-ended flow fades into the outside, and a gradient mask is the only
   * way to fade a fill in SVG. The ids must be unique per INSTANCE: three
   * charts on one page (the bench stacks a track each) would otherwise share
   * one set of ids, and the first one mounted would silently own them all.
   */
  const maskId = createUniqueId();
  const departureMask = `${maskId}-departure`;
  const hireMask = `${maskId}-hire`;
  /** Only the open-ended flows are masked; a move is solid at both ends. */
  const ribbonMask = (ribbon: Ribbon): string | undefined => {
    if (ribbon.kind === "departure") return `url(#${departureMask})`;
    if (ribbon.kind === "hire") return `url(#${hireMask})`;
    return undefined;
  };

  const lineClass = (line: Line): string =>
    join(" ", [
      "sui-levels-timeline__line",
      `sui-levels-timeline__tone-${tokenOf(line.seriesIndex)}`,
      line.primary ? "sui-levels-timeline__line--primary" : "",
    ]);

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
        {/* Two fades, opaque at the rail and transparent at the open end, so
            a departure dissolves outward and a hire condenses inward.

            `white` here is a MASK LUMINANCE, not a colour: a mask reads the
            brightness of what is painted into it, so "white" means "keep this
            pixel" and has no theme to come from. It is spelt as the keyword
            rather than as a hex triplet because the bareHexTsx ratchet counts
            hex literals in .tsx and cannot tell a mask stop from a hardcoded
            brand colour — and it is right not to try. */}
        <defs>
          <linearGradient id={`${departureMask}-ramp`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="white" stop-opacity="1" />
            <stop offset="100%" stop-color="white" stop-opacity="0" />
          </linearGradient>
          <linearGradient id={`${hireMask}-ramp`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="white" stop-opacity="0" />
            <stop offset="100%" stop-color="white" stop-opacity="1" />
          </linearGradient>
          <mask id={departureMask} maskContentUnits="objectBoundingBox">
            <rect
              x="0"
              y="0"
              width="1"
              height="1"
              fill={`url(#${departureMask}-ramp)`}
            />
          </mask>
          <mask id={hireMask} maskContentUnits="objectBoundingBox">
            <rect
              x="0"
              y="0"
              width="1"
              height="1"
              fill={`url(#${hireMask}-ramp)`}
            />
          </mask>
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
          <For each={frame().ticks}>
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
          <Show when={isRails()}>
            <For each={railGeometry().droplines}>
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
          </Show>

          {/* The flags' rules, under everything: a rule locates a change, it
              does not compete with one. */}
          <For each={frame().flags}>
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

          <Show
            when={isRails()}
            fallback={
              <For each={stepGeometry().lines}>
                {(line) => (
                  <Show when={line.path !== ""}>
                    <path class={lineClass(line)} d={line.path} />
                  </Show>
                )}
              </For>
            }
          >
            {/* Flows first, under the rails they join, so a ribbon reads as
                tucking beneath both ends rather than crossing them. */}
            <For each={railGeometry().ribbons}>
              {(ribbon) => (
                <rect
                  class={ribbonClass(ribbon)}
                  x={ribbon.x - ribbon.width / 2}
                  y={Math.min(ribbon.y1, ribbon.y2)}
                  width={ribbon.width}
                  height={Math.abs(ribbon.y2 - ribbon.y1)}
                  mask={ribbonMask(ribbon)}
                />
              )}
            </For>

            <For each={railGeometry().rails}>
              {(rail) => (
                <g class="sui-levels-timeline__rail-group">
                  <For each={rail.spans}>
                    {(span) => (
                      <line
                        class={railClass(rail)}
                        x1={span.x1}
                        x2={span.x2}
                        y1={span.y}
                        y2={span.y}
                        stroke-width={span.width}
                      />
                    )}
                  </For>
                  <Show when={rail.labelAt}>
                    {(at) => (
                      <text
                        class="sui-levels-timeline__rail-label"
                        x={at().x}
                        y={at().y}
                      >
                        {rail.label}
                      </text>
                    )}
                  </Show>
                </g>
              )}
            </For>
          </Show>
        </g>

        {/* The flags. Buttons when the consumer wants selection, plain marks
            otherwise — a chart nobody can drive should not advertise a
            control, and an unreachable one should not exist. */}
        <For each={frame().flags}>
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
