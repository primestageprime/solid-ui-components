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
// flag number, which is enumerated and short by construction. Nothing else in
// the plot carries ink — no series labels, no legend, no colour coding. A
// level is told apart by WHERE IT SITS, and that is deliberate: a per-level
// colour ramp reads as a ranking, as though one pay level were a better KIND
// of thing than another, when the only difference between them is height.
//
// No size/variant props and no factory: every prop is DATA. The chart fills
// its container's width and the consumer constrains it, as RateGauge does.
// ============================================
import {
  For,
  Index,
  Show,
  type Component,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
} from "solid-js";
import {
  AXIS_TICK_LENGTH,
  FLAG_RULE_TOP,

  type Flag,
  type Level,
  type Mutation,
  type TimeValue,
  type FlowBand,
  type Hover,
  type TimeDomain,
  type Transfer,
  hoverAt,
  levelsRailGeometry,
  monthLabelOf,
  timeOf,
} from "./geometry";
import { placeTooltipX } from "../Chart/tooltipPlacement";
import { find, join, map, sortBy } from "../../fn";
import { observeSize } from "../../internal/dom/observeSize";
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
  /**
   * Formatter for the pay figure in the hover readout. The chart never invents
   * a format — without this the raw number is shown, which is honest but
   * rarely what a consumer wants.
   */
  formatValue?: (value: number) => string;
  /**
   * Provided => clicking the plot reports the date under the pointer, snapped
   * to the nearest month. The chart does nothing else with it: adding a
   * mutation, moving an as-of, or ignoring it is the consumer's business.
   *
   * NOT fired by a flag click — those are `onSelectMutation`, and the flags sit
   * above the plot so the two never compete for the same pixel.
   */
  onPick?: (at: TimeValue) => void;
}

const EMPTY_TRANSFERS: readonly Transfer[] = [];

/** The hover readout's own box. Fixed in viewBox units, like all the chrome. */
const PANEL_PADDING = 5;
const PANEL_ROW_HEIGHT = 11;
const PANEL_HEADER_HEIGHT = 15;
const PANEL_OFFSET = 10;
const PANEL_MIN_WIDTH = 74;
/** Enough room for a pay figure plus a headcount, before measurement. */

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

  /**
   * FILL-HEIGHT, and why the measurement is defended as carefully as it is.
   *
   * The CSS gives the host an `aspect-ratio`, which applies only while its
   * height is indeterminate — so in ordinary flow the height comes from the
   * width, and in a box that HAS a height the aspect-ratio stops applying and
   * the host fills it. Either way, what we measure is the box the consumer
   * actually gave us, which is what makes this one code path and not two.
   *
   * A ZERO BOX IS NOT A MEASUREMENT. It is the layout saying "not yet", and
   * treating it as an answer is how this component came to draw at its default
   * size inside a consumer's cell forever. The board's chart sits at the end of
   * a chain — viewport calc, three nested flex columns each with `min-height:
   * 0`, a card, a grow box — where every link takes its height from its parent.
   * Nothing in that chain has a height at the moment the innermost child first
   * mounts, so the first observation can legitimately be 0×0. If that is stored
   * and no further resize ever happens, the fallback is permanent, and the
   * symptom is a chart that renders at 640×232 in a 2218×134 cell — which
   * `meet` then letterboxes to a sixth of the width.
   *
   * So: zeroes are ignored rather than stored, the element is measured directly
   * on mount instead of waiting for the observer's first delivery, and a zero
   * observation schedules another look rather than being taken at its word.
   * Any later non-zero observation wins; nothing latches.
   *
   * The element measured is the HOST — the outer div, which is the one the
   * consumer's box sizes. The `<svg>` inside it is `height: 100%` of the host,
   * so measuring the svg would measure our own output and say nothing.
   */
  const [box, setBox] = createSignal<{ width: number; height: number }>();
  let host: HTMLDivElement | undefined;

  const measureHost = (): void => {
    if (host === undefined) return;
    const rect = host.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setBox({ width: rect.width, height: rect.height });
    }
  };

  onMount(() => {
    if (host === undefined) return;
    measureHost();
    const stop = observeSize(host, (measured) => {
      if (measured.width > 0 && measured.height > 0) {
        setBox(measured);
        return;
      }
      // Not laid out yet. Look again once this frame's layout has settled
      // rather than recording a zero as though it were the answer.
      queueMicrotask(measureHost);
    });
    onCleanup(stop);
  });

  const geometry = createMemo(() =>
    levelsRailGeometry({
      levels: props.levels,
      transfers: transfers(),
      mutations: props.mutations,
      domain: props.domain,
      box: box(),
    }),
  );
  const frame = () => geometry().frame;

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

  const RAIL_CLASS = "sui-levels-timeline__rail";

  /**
   * A CONTINUATION is painted exactly as the band is — same class, full
   * opacity — because nothing happened to that rail here and the join must be
   * invisible. It is only split at all because something happened elsewhere on
   * the chart, and a rail that read as dashed would be inventing an event it
   * did not have.
   */
  const isContinuation = (flow: FlowBand): boolean =>
    flow.kind === "continuation";

  /**
   * A one-ended flow is the ONLY thing that still needs a gradient, and it is
   * an opacity gradient rather than a colour one: the chart is a single colour
   * now, so a departure and a hire are the same shape in the same ink and the
   * fade is all that tells them apart. A departure dissolves out of the
   * picture, a hire condenses into it.
   */
  const isOpen = (flow: FlowBand): boolean =>
    flow.kind === "departure" || flow.kind === "hire";

  const flowClass = (flow: FlowBand): string =>
    isContinuation(flow)
      ? RAIL_CLASS
      : join(" ", [
          "sui-levels-timeline__ribbon",
          `sui-levels-timeline__ribbon--${flow.kind}`,
        ]);

  /** Per-INSTANCE id prefix, so several charts on one page cannot collide. */
  const maskId = createUniqueId();

  /**
   * There are exactly TWO gradients in this chart, and neither depends on the
   * data: a fade OUT for a departure and a fade IN for a hire, both in
   * `currentColor`. Giving every flow its own `<linearGradient>` keyed by the
   * flow meant the whole `<defs>` block was rebuilt on every update — and on
   * the board, where a rail's id follows its pay, that happened on every step
   * of a drag. Two static defs cannot churn.
   */
  const fadeOutId = `${maskId}-fade-out`;
  const fadeInId = `${maskId}-fade-in`;
  const gradientId = (flow: FlowBand): string =>
    flow.kind === "hire" ? fadeInId : fadeOutId;

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

  // ── hover and pick ─────────────────────────────────────────────────────────
  //
  // The Chart package's `Crosshair` and `ChartTooltip` slots both call
  // `useChart()`, and this component is not inside a `<Chart>` — so per ADR
  // 0010 the answer is the CORE plus an adapter here, which is what this is.
  // `tooltipPlacement` is reused verbatim; `crosshairMark` is not, because its
  // value is the DOT list and this crosshair is a bare rule with no dots.
  //
  // The SUI `Tooltip` is the wrong shape too: it wraps a trigger ELEMENT, and
  // the trigger here is a moving pointer position inside an SVG.
  const [hover, setHover] = createSignal<Hover | undefined>();
  const [panelWidth, setPanelWidth] = createSignal(PANEL_MIN_WIDTH);
  let panel: SVGGElement | undefined;

  const pointerX = (event: PointerEvent | MouseEvent): number | undefined => {
    const svg = (event.currentTarget as SVGGraphicsElement).ownerSVGElement;
    const rect = svg?.getBoundingClientRect();
    if (rect === undefined || rect.width === 0) return undefined;
    return ((event.clientX - rect.left) / rect.width) * frame().viewWidth;
  };

  const onPlotMove = (event: PointerEvent): void => {
    const x = pointerX(event);
    if (x === undefined) return;
    setHover(hoverAt(props.levels, props.domain, x, frame()));
  };

  const onPlotClick = (event: MouseEvent): void => {
    if (props.onPick === undefined) return;
    const x = pointerX(event);
    if (x === undefined) return;
    props.onPick(hoverAt(props.levels, props.domain, x, frame()).at);
  };

  /**
   * Measure the readout before placing it — `placeTooltipX` takes a MEASURED
   * width, and its own header says measuring is the adapter's job, since the
   * adapter is the side that owns a DOM node. Re-measured whenever the rows
   * change, deferred a microtask so the new text is in the DOM first.
   *
   * `getBBox` is absent in jsdom, so the fallback is the minimum width. That
   * is correct rather than merely safe: a panel narrower than its content
   * would be placed slightly wrong, never drawn wrong.
   */
  const measurePanel = (): void => {
    if (panel === undefined) return;
    const width = panel.getBBox?.().width ?? 0;
    setPanelWidth(Math.max(PANEL_MIN_WIDTH, width + PANEL_PADDING * 2));
  };
  createEffect(() => {
    hover();
    queueMicrotask(measurePanel);
  });

  const panelX = (at: Hover): number =>
    placeTooltipX({
      anchorX: at.x,
      tipWidth: panelWidth(),
      offsetX: PANEL_OFFSET,
      boundsLeft: frame().plotLeft,
      boundsRight: frame().plotRight,
    });

  const formatValue = (value: number): string =>
    props.formatValue?.(value) ?? String(value);

  /** `1 person` / `3 people`, reused from the announcement. */
  const panelHeight = (rows: number): number =>
    PANEL_HEADER_HEIGHT + rows * PANEL_ROW_HEIGHT + PANEL_PADDING;

  const onFlagKeyDown = (event: KeyboardEvent, flag: Flag): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    select(flag);
  };

  return (
    <div
      ref={host}
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
        viewBox={`0 0 ${frame().viewWidth} ${frame().viewHeight}`}
      >
        <title>{description()}</title>
        {/* One opacity gradient per OPEN-ended flow — nothing else needs one
            now that the chart is a single colour. The ids are per-INSTANCE
            (createUniqueId) because three charts on one page, which the bench
            stacks, would otherwise share one set and the first mounted would
            own them all. */}
        <defs>
          <linearGradient id={fadeOutId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="currentColor" stop-opacity={1} />
            <stop offset="100%" stop-color="currentColor" stop-opacity={0} />
          </linearGradient>
          <linearGradient id={fadeInId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="currentColor" stop-opacity={0} />
            <stop offset="100%" stop-color="currentColor" stop-opacity={1} />
          </linearGradient>
        </defs>
        <g>
          <line
            class="sui-levels-timeline__baseline"
            x1={frame().plotLeft}
            x2={frame().plotRight}
            y1={frame().plotBottom}
            y2={frame().plotBottom}
          />

          {/* The month axis. Built from DateAxis's own calendar (geometry.ts),
              so the chart and the axis component agree on where a month is. */}
          <Index each={geometry().ticks}>
            {(tick) => (
              <g class="sui-levels-timeline__tick">
                <line
                  x1={tick().x}
                  x2={tick().x}
                  y1={frame().plotBottom}
                  y2={frame().plotBottom + AXIS_TICK_LENGTH}
                />
                {/* Every boundary gets a tick; in compact chrome only every
                    third gets a LABEL, because a full month row does not fit
                    and overlapping text is worse than none. */}
                <Show when={tick().showLabel}>
                  <text
                    class="sui-levels-timeline__tick-label"
                    x={tick().x}
                    y={frame().axisLabelY}
                    text-anchor="middle"
                  >
                    {tick().label}
                  </text>
                </Show>
              </g>
            )}
          </Index>

          {/* The un-numbered changes. Thinner and fainter than a flag's rule,
              because they carry no name — they only say "something happened
              here", which is precisely what a lone hire needs. */}
          <Index each={geometry().droplines}>
            {(dropline) => (
              <line
                class="sui-levels-timeline__dropline"
                x1={dropline().x}
                x2={dropline().x}
                y1={FLAG_RULE_TOP}
                y2={frame().plotBottom}
              />
            )}
          </Index>

          {/* The flags' rules, under everything: a rule locates a change, it
              does not compete with one. */}
          <Index each={geometry().flags}>
            {(flag) => (
              <line
                class={flagClass(flag(), "rule")}
                x1={flag().x}
                x2={flag().x}
                y1={flag().ruleTop}
                y2={flag().ruleBottom}
              />
            )}
          </Index>

          {/* Flows first, UNDER the rails they join, so a flow reads as
              growing out from beneath both ends rather than crossing them. */}
          <Index each={geometry().flows}>
            {(flow) => (
              <path
                class={flowClass(flow())}
                d={flow().path}
                fill={isOpen(flow()) ? `url(#${gradientId(flow())})` : undefined}
              />
            )}
          </Index>

          <Index each={geometry().rails}>
            {(rail) => (
              <g class="sui-levels-timeline__rail-group">
                <Index each={rail().runs}>
                  {(run) => <path class={RAIL_CLASS} d={run().path} />}
                </Index>
              </g>
            )}
          </Index>
        </g>

        {/* The hover surface. It covers the PLOT only, so it can never
            swallow a flag click — the flags sit above `PLOT_TOP`. Transparent
            rather than absent, because an SVG with no fill takes no pointer
            events at all. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: hover readout and an optional date pick on a data surface; the keyboard path to the same information is the flags, which are real buttons, and the announcement, which carries every headcount. */}
        <rect
          class={join(" ", [
            "sui-levels-timeline__surface",
            props.onPick === undefined
              ? ""
              : "sui-levels-timeline__surface--pickable",
          ])}
          x={frame().plotLeft}
          y={frame().plotTop}
          width={frame().plotRight - frame().plotLeft}
          height={frame().plotBottom - frame().plotTop}
          onPointerMove={onPlotMove}
          onPointerLeave={() => setHover(undefined)}
          onClick={onPlotClick}
        />

        <Show when={hover()}>
          {(at) => (
            <g class="sui-levels-timeline__hover">
              {/* The crosshair. Crisp like a dropline, but following the
                  pointer — and sitting on the SNAPPED date, not under the
                  pointer, so it never lands between two months. */}
              <line
                class="sui-levels-timeline__crosshair"
                x1={at().x}
                x2={at().x}
                y1={FLAG_RULE_TOP}
                y2={frame().plotBottom}
              />
              <Show when={at().rows.length > 0}>
                <g
                  ref={panel}
                  class="sui-levels-timeline__panel"
                  transform={`translate(${panelX(at())} ${frame().plotTop})`}
                >
                  <rect
                    class="sui-levels-timeline__panel-box"
                    x={0}
                    y={0}
                    width={panelWidth()}
                    height={panelHeight(at().rows.length)}
                    rx="3"
                  />
                  <text
                    class="sui-levels-timeline__panel-date"
                    x={PANEL_PADDING}
                    y={PANEL_PADDING + 7}
                  >
                    {monthLabelOf(at().at)}
                  </text>
                  <For each={at().rows}>
                    {(row, index) => (
                      <>
                        <text
                          class="sui-levels-timeline__panel-cell"
                          x={PANEL_PADDING}
                          y={PANEL_HEADER_HEIGHT + index() * PANEL_ROW_HEIGHT + 7}
                        >
                          {formatValue(row.value)}
                        </text>
                        <text
                          class="sui-levels-timeline__panel-cell sui-levels-timeline__panel-cell--count"
                          x={panelWidth() - PANEL_PADDING}
                          y={PANEL_HEADER_HEIGHT + index() * PANEL_ROW_HEIGHT + 7}
                        >
                          {row.count}
                        </text>
                      </>
                    )}
                  </For>
                </g>
              </Show>
            </g>
          )}
        </Show>

        {/* The flags. Buttons when the consumer wants selection, plain marks
            otherwise — a chart nobody can drive should not advertise a
            control, and an unreachable one should not exist. */}
        <Index each={geometry().flags}>
          {(flag) => (
            // biome-ignore lint/a11y/noStaticElementInteractions: conditionally interactive — role="button", tabindex and Enter/Space keyboard parity are wired exactly when onSelectMutation is provided (interactive()); the analyzer cannot see through that runtime guard.
            <g
              class={flagClass(flag(), "flag")}
              role={interactive() ? "button" : undefined}
              tabindex={interactive() ? 0 : undefined}
              aria-label={interactive() ? flagLabel(flag()) : undefined}
              data-selected={isSelected(flag()) ? "true" : undefined}
              onClick={interactive() ? () => select(flag()) : undefined}
              onKeyDown={
                interactive()
                  ? (event: KeyboardEvent) => onFlagKeyDown(event, flag())
                  : undefined
              }
            >
              <rect
                class="sui-levels-timeline__flag-box"
                x={flag().boxX}
                y={flag().boxY}
                width={flag().boxWidth}
                height={flag().boxHeight}
                rx="3"
              />
              <text
                class="sui-levels-timeline__flag-label"
                x={flag().textX}
                y={flag().textY}
                text-anchor="middle"
                dominant-baseline="central"
              >
                {flag().label}
              </text>
            </g>
          )}
        </Index>
      </svg>
    </div>
  );
};
