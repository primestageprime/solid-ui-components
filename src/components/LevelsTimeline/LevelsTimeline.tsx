// ============================================
// LevelsTimeline — Atomic (Depth 1).
// Owns CSS (LevelsTimeline.css). Composes no other component.
//
// A horizontal time chart of SERIES held as LEVELS: each series holds a level,
// then steps up or down at a mutation date and holds the new one — horizontal
// runs joined by vertical risers (step-after). Several series share the plot;
// the one marked `primary` is drawn heavier, in the primary ink, on top.
//
// Above the plot sit numbered FLAGS, one per mutation, each dropping a thin
// vertical rule through the whole plot at its own x. That rule is the only
// device tying "mutation 2" to the risers that happened at it — which is why
// the flags are the labelling channel here and a per-series legend is not.
//
// Everything positional lives in geometry.ts, which is pure and prints as a
// table (geometry.test.ts); this file only paints what that returns. It is the
// headless-observation-first discipline made structural: there is nowhere in
// this module for a number to be decided.
//
// Why it is Atomic and not the Depth 2 that RateGauge became: the only
// consumer-supplied text this chart PAINTS is `mutations[].label`, which is
// short by construction ("1", "2", "3"). A series' own `label` is free text and
// so would drag in the ellipsize-plus-Tooltip treatment Peter's standing rule
// requires — so it is not painted at all. Series identity is carried by the
// `--sui-series-*` colour and by the announcement; a legend, if one turns out
// to be wanted, is a /promote question.
//
// No size/variant props and no factory: `series`, `mutations`, `domain`,
// `selectedMutationId` and `onSelectMutation` are all DATA. The chart fills its
// container's width and the consumer constrains it, exactly as RateGauge does.
// ============================================
import { For, Show, type Component, createMemo } from "solid-js";
import {
  AXIS_LABEL_Y,
  AXIS_TICK_LENGTH,
  PLOT_BOTTOM,
  PLOT_LEFT,
  PLOT_RIGHT,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type Flag,
  type Line,
  type Mutation,
  type Series,
  type TimeDomain,
  levelsTimelineGeometry,
  timeOf,
} from "./geometry";
import { join, map, sortBy } from "../../fn";
import "./LevelsTimeline.css";

export interface LevelsTimelineProps {
  /** The stepped lines. One is usually marked `primary` — the total. */
  series: readonly Series[];
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

/** `1..8`, wrapping — a ninth series reuses the first colour rather than none. */
const tokenOf = (seriesIndex: number): number =>
  ((seriesIndex - 1) % SERIES_TOKEN_COUNT) + 1;

/**
 * The mutations a series stepped at, as their flag numbers. A lookup, not
 * arithmetic: a series stepped at a mutation when one of its points shares
 * that mutation's moment.
 */
const stepsAt = (
  series: Series,
  mutations: readonly Mutation[],
): readonly string[] => {
  const moments = new Set(map((point) => timeOf(point.at), series.points));
  const hit = (mutation: Mutation): boolean => moments.has(timeOf(mutation.at));
  const ordered = sortBy((mutation: Mutation) => timeOf(mutation.at), mutations);
  const labels: string[] = [];
  for (const mutation of ordered) {
    if (hit(mutation)) labels.push(mutation.label);
  }
  return labels;
};

/** One series, said out loud: where it starts, where it steps, where it ends. */
const describeSeries = (
  series: Series,
  mutations: readonly Mutation[],
): string => {
  if (series.points.length === 0) return `${series.label}: no levels.`;
  const ordered = sortBy((point) => timeOf(point.at), series.points);
  const first = ordered[0].level;
  const last = ordered[ordered.length - 1].level;
  const marks = stepsAt(series, mutations);
  if (marks.length === 0) return `${series.label}: ${first}, holding.`;
  return `${series.label}: ${first}, stepping at ${join(", ", marks)} to ${last}.`;
};

export const LevelsTimeline: Component<LevelsTimelineProps> = (props) => {
  const geometry = createMemo(() =>
    levelsTimelineGeometry({
      series: props.series,
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

  // The announcement has to carry what the picture carries — which series
  // stepped at which numbered mutation — or the reading is colour-only.
  const description = () =>
    join(" ", [
      `Levels over time, ${props.mutations.length} marked mutations.`,
      ...map(
        (series: Series) => describeSeries(series, props.mutations),
        props.series,
      ),
    ]);

  const lineClass = (line: Line): string =>
    join(" ", [
      "sui-levels-timeline__line",
      `sui-levels-timeline__line--series-${tokenOf(line.seriesIndex)}`,
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

          {/* The rules, under the lines: they locate a step, they do not
              compete with it. */}
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

          <For each={geometry().lines}>
            {(line) => (
              <Show when={line.path !== ""}>
                <path class={lineClass(line)} d={line.path} />
              </Show>
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
