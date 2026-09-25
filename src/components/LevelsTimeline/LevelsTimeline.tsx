// ============================================
// LevelsTimeline — Atomic (Depth 1).
// Owns CSS (LevelsTimeline.css). Composes no other component.
//
// A horizontal time chart of LEVELS. Each level is a RAIL at a fixed y — a
// level does not go anywhere — and what varies along it is its THICKNESS,
// which is proportional to the COUNT holding that level. A move between
// levels is not a step in either line: it is a FLOW, a ribbon running from
// the source rail to the destination rail at the moment of the move, on the
// same width scale, so the lower rail visibly thins and the upper one
// thickens across that x. A level that appears mid-chart is an arrival; a
// level nobody holds draws nothing at all.
//
// Two vertical channels, and they never double up. Numbered FLAGS sit above
// the plot for the CONSUMER's named mutations, each dropping a rule through
// the whole plot. Every OTHER change — a count point, a transfer, a level
// starting — gets a thin muted dropline instead, so a lone arrival on no
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
// Why it is still Atomic: the chart paints its OWN flag numbers (enumerated
// and short by construction) and the only consumer text it paints is inside
// its own hover panels — a level's formatted value, and a flag's `details`
// lines — never in the plot. Nothing else in the plot carries ink — no series
// labels, no legend, no colour coding. A
// level is told apart by WHERE IT SITS, and that is deliberate: a per-level
// colour ramp reads as a ranking, as though one level were a better KIND of
// thing than another, when the only difference between them is height.
//
// No size or variant props: the only presentational prop is `formatValue`,
// which a curried variant bakes (see `createLevelsTimeline` at the foot of
// this file and ./variants), so a call site passes data and callbacks only.
// The chart fills its container's box and the consumer constrains it.
//
// The MODEL IS GENERIC — levels with a numeric `value`, counts on each level,
// and transfers between them. It knows nothing about what a level or a count
// is a level or a count OF; naming that is the consumer's job, through
// `Level.label`, `formatValue` and whatever it puts around the chart.
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
  mergeProps,
  onCleanup,
  onMount,
} from "solid-js";
import {
  DAY_MS,
  DRAG_THRESHOLD_PX,
  FLAG_RULE_TOP,
  FLAG_TIP_TOP,
  Y_LABEL_GAP,
  Y_TICK_LENGTH,
  type Flag,
  type Level,
  type Mutation,
  type TimeValue,
  type FlowBand,
  type Hover,
  type TimeDomain,
  type Transfer,
  clampMutationTime,
  dragTimeAt,
  type PickStrategy,
  hoverAt,
  isoDayOf,
  levelsRailGeometry,
  monthLabelOf,
  mutationNumbers,
  timeOf,
} from "./geometry";
import { placeTooltipX } from "../Chart/tooltipPlacement";
import { find, join, map, sortBy } from "../../fn";
import { observeSize } from "../../internal/dom/observeSize";
import "./LevelsTimeline.css";

export interface LevelsTimelineProps {
  /**
   * The levels, as rails. A level is keyed by its `value`, and `value` IS its
   * y — so two levels sharing a value are drawn on top of each other. A
   * consumer whose groups can share a figure wants one chart per group, as the
   * showcase does with its three tracks.
   */
  levels: readonly Level[];
  /** Counts moving between levels. Drawn as flows. */
  transfers?: readonly Transfer[];
  /** The numbered events. Each gets a flag above the plot and a rule through it. */
  mutations: readonly Mutation[];
  /** The visible span. The consumer's, never derived from the data. */
  domain: TimeDomain;
  /**
   * Pin the y range rather than letting it follow the levels.
   *
   * Without it the scale is derived from the values present, so raising one
   * level slides every OTHER rail — the range they are all drawn against has
   * changed. Pin it and a rail moves against a fixed axis, which is what a
   * consumer watching one value move wants. A level outside the pinned range
   * clamps to the edge rather than widening it.
   */
  valueDomain?: readonly [number, number];
  /** Which mutation is lit. Its flag and rule take the accent; the rest mute. */
  selectedMutationId?: string;
  /** Provided => the flags become buttons. Omitted => the chart is a readout. */
  onSelectMutation?: (id: string) => void;
  /**
   * Provided => the flags can be DRAGGED along x (and nudged a day at a time
   * with the arrow keys) to move their event's date, snapped to the day.
   * Omitted => they stay put.
   *
   * The chart only REPORTS the new moment, once per day crossed; the consumer
   * moves the event and re-renders, which is what carries the levels, flows
   * and the flag itself to the new date. A flag can never be dragged past a
   * neighbour: it clamps to one day after the previous flag and one day
   * before the next (`clampMutationTime`), so the numbering never changes
   * under the pointer. A press that travels less than a few px is still a
   * click, and still selects.
   */
  onMoveMutation?: (id: string, at: TimeValue) => void;
  /**
   * Formatter for a level's value in the hover readout. The chart never
   * invents a format — without this the raw number is shown, which is honest
   * but rarely what a consumer wants.
   */
  formatValue?: (value: number) => string;
  /**
   * Provided => clicking the plot reports the date under the pointer, as the
   * pick strategy (`pickAt`) resolves it — the nearest month when none is
   * curried in. The chart does nothing else with it: adding a
   * mutation, moving an as-of, or ignoring it is the consumer's business.
   *
   * NOT fired by a flag click — those are `onSelectMutation`, and the flags sit
   * above the plot so the two never compete for the same pixel.
   */
  onPick?: (at: TimeValue) => void;
  /**
   * How a click's raw moment becomes the date `onPick` reports — and where the
   * hover crosshair sits, so the two agree. `pickDay` (geometry.ts) picks the
   * whole day under the pointer. BEHAVIOURAL CONFIG, so it is curried into a
   * variant (`createLevelsTimeline({ pickAt })`), not passed per call site.
   *
   * Omitted => the nearest MONTH start, which is what every chart did before
   * strategies existed. @deprecated as a default: pass a pick strategy.
   */
  pickAt?: PickStrategy;
}

const EMPTY_TRANSFERS: readonly Transfer[] = [];

/**
 * The graphic's NAME, and it has to stay short: browsers paint an SVG
 * `<title>` as a native tooltip. Anything longer belongs in `<desc>`.
 */
const SVG_TITLE = "Levels timeline";

/** The hover readout's own box. Fixed in viewBox units, like all the chrome. */
const PANEL_PADDING = 5;
const PANEL_ROW_HEIGHT = 11;
const PANEL_HEADER_HEIGHT = 15;
const PANEL_OFFSET = 10;
const PANEL_MIN_WIDTH = 74;
/** Clear air between the value column and the count column. */
const PANEL_COLUMN_GAP = 12;

/** One level, said out loud: what it starts holding and what it ends holding. */
const describeLevel = (level: Level): string => {
  if (level.points.length === 0) return `${level.label}: empty.`;
  const ordered = sortBy((point) => timeOf(point.at), level.points);
  const first = ordered[0].count;
  const last = ordered[ordered.length - 1].count;
  if (first === last) return `${level.label}: ${first} throughout.`;
  if (last === 0) return `${level.label}: ${first}, ending empty.`;
  return `${level.label}: ${first}, ending at ${last}.`;
};

/**
 * One flow, said out loud, named by its numbered mutation where it has one.
 * A one-ended flow is announced as what it is — a departure or an arrival —
 * so a screen reader gets the conservation the picture gets.
 */
const describeTransfer = (
  transfer: Transfer,
  levels: readonly Level[],
  mutations: readonly Mutation[],
  numbers: ReadonlyMap<string, number>,
): string => {
  const labelOf = (id: string): string =>
    find((level: Level) => level.id === id, levels)?.label ?? id;
  const flag = find(
    (mutation: Mutation) => timeOf(mutation.at) === timeOf(transfer.at),
    mutations,
  );
  const when =
    flag === undefined ? "" : ` at mutation ${numbers.get(flag.id) ?? ""}`;
  const what = (): string => {
    if (transfer.from !== undefined && transfer.to !== undefined) {
      return `moved from ${labelOf(transfer.from)} to ${labelOf(transfer.to)}`;
    }
    if (transfer.from !== undefined)
      return `left from ${labelOf(transfer.from)}`;
    if (transfer.to !== undefined) return `joined at ${labelOf(transfer.to)}`;
    return "moved";
  };
  return `${transfer.count} ${what()}${when}.`;
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
      valueDomain: props.valueDomain,
      // The axis labels and the hover readout share one formatter, so the
      // gutter is sized in the same units the reader is shown.
      formatValue: props.formatValue,
    }),
  );
  const frame = () => geometry().frame;

  const interactive = () => props.onSelectMutation !== undefined;
  const draggable = () => props.onMoveMutation !== undefined;
  /** A flag takes focus when there is anything to DO with it. */
  const focusable = () => interactive() || draggable();
  const isSelected = (flag: Flag): boolean =>
    props.selectedMutationId === flag.id;
  /** Nothing selected = nothing muted; the chart reads as a plain readout. */
  const isMuted = (flag: Flag): boolean =>
    props.selectedMutationId !== undefined && !isSelected(flag);

  // The announcement has to carry what the picture carries — what each level
  // holds, and what moved where — or the reading is thickness-only, which is
  // exactly the channel a screen reader cannot see.
  const description = () =>
    join(" ", [
      `Count by level, ${props.mutations.length} marked mutations.`,
      ...map(describeLevel, props.levels),
      ...map(
        (transfer: Transfer) =>
          describeTransfer(
            transfer,
            props.levels,
            props.mutations,
            mutationNumbers(props.mutations),
          ),
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
   * now, so a departure and an arrival are the same shape in the same ink and
   * the fade is all that tells them apart. A departure dissolves out of the
   * picture, an arrival condenses into it.
   */
  const isOpen = (flow: FlowBand): boolean =>
    flow.kind === "departure" || flow.kind === "arrival";

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
   * data: a fade OUT for a departure and a fade IN for an arrival, both in
   * `currentColor`. Giving every flow its own `<linearGradient>` keyed by the
   * flow meant the whole `<defs>` block was rebuilt on every update — and on
   * the board, where a rail's id follows its value, that happened on every step
   * of a drag. Two static defs cannot churn.
   */
  const fadeOutId = `${maskId}-fade-out`;
  const fadeInId = `${maskId}-fade-in`;
  const gradientId = (flow: FlowBand): string =>
    flow.kind === "arrival" ? fadeInId : fadeOutId;

  const flagClass = (flag: Flag, block: string): string =>
    join(" ", [
      `sui-levels-timeline__${block}`,
      isSelected(flag) ? `sui-levels-timeline__${block}--selected` : "",
      isMuted(flag) ? `sui-levels-timeline__${block}--muted` : "",
      block === "flag" && draggable()
        ? "sui-levels-timeline__flag--draggable"
        : "",
      block === "flag" && draggingId() === flag.id
        ? "sui-levels-timeline__flag--dragging"
        : "",
    ]);

  /**
   * A flag's name carries its own state. `aria-pressed` would be the idiomatic
   * carrier, but the role here is conditional (`interactive()`), so a static
   * linter reads the attribute against a bare <g> and rejects it — and a
   * conditional `aria-pressed` on a non-button is worse than none. The word is
   * unambiguous and survives the same reading.
   */
  const flagLabel = (flag: Flag): string =>
    join(", ", [
      `Mutation ${flag.label}`,
      ...(flag.title === "" || flag.title === flag.label ? [] : [flag.title]),
      isoDayOf(flag.at),
      ...(isSelected(flag) ? ["selected"] : []),
    ]);

  const select = (flag: Flag): void => props.onSelectMutation?.(flag.id);

  // ── the flag tooltip and the drag ─────────────────────────────────────────
  //
  // Hovering (or focusing) a flag shows its exact day and the consumer's list
  // of what changed there, in the SAME panel the plot's hover readout uses —
  // same box, same type, placed by the same `placeTooltipX`. While a flag is
  // being dragged the tooltip stays up and follows it, so the reader sees the
  // date the flag will land on, clamp included.
  const [hoveredFlagId, setHoveredFlagId] = createSignal<string>();
  const [draggingId, setDraggingId] = createSignal<string>();
  const [tipWidth, setTipWidth] = createSignal(PANEL_MIN_WIDTH);
  let tipPanel: SVGGElement | undefined;

  const flagById = (id: string | undefined): Flag | undefined =>
    id === undefined
      ? undefined
      : find((one: Flag) => one.id === id, geometry().flags);
  const tipFlag = (): Flag | undefined =>
    flagById(draggingId() ?? hoveredFlagId());

  /**
   * One press on a flag. `moved` flips once the pointer has travelled
   * `DRAG_THRESHOLD_PX`; until then the press is a click in waiting. `grab` is
   * where on the flag it was taken, so the flag does not jump to centre itself
   * under the pointer on the first move.
   */
  let press:
    | {
        readonly id: string;
        readonly pointerId: number;
        readonly startX: number;
        readonly grab: number;
        moved: boolean;
      }
    | undefined;
  /** Set when a press ended as a drag, so its trailing click does not select. */
  let swallowClick = false;

  const move = (id: string, time: number): void => {
    const current = flagById(id);
    if (current === undefined || current.at === time) return;
    props.onMoveMutation?.(id, time);
  };

  const onFlagPointerDown = (event: PointerEvent, flag: Flag): void => {
    if (!draggable() || event.button !== 0) return;
    const x = pointerX(event);
    if (x === undefined) return;
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    press = {
      id: flag.id,
      pointerId: event.pointerId,
      startX: x,
      grab: x - flag.x,
      moved: false,
    };
    swallowClick = false;
  };

  const onFlagPointerMove = (event: PointerEvent): void => {
    if (press === undefined || press.pointerId !== event.pointerId) return;
    const x = pointerX(event);
    if (x === undefined) return;
    if (!press.moved) {
      if (Math.abs(x - press.startX) < DRAG_THRESHOLD_PX) return;
      press.moved = true;
      setDraggingId(press.id);
    }
    move(
      press.id,
      dragTimeAt(
        props.mutations,
        press.id,
        x - press.grab,
        props.domain,
        frame(),
      ),
    );
  };

  const onFlagPointerEnd = (event: PointerEvent): void => {
    if (press === undefined || press.pointerId !== event.pointerId) return;
    if (press.moved) {
      // The click a drag's pointerup produces arrives in this same task. Clear
      // the flag on the NEXT one, so a click the browser sends elsewhere (or
      // not at all) can never eat a later, genuine click.
      swallowClick = true;
      setTimeout(() => {
        swallowClick = false;
      }, 0);
    }
    (event.currentTarget as Element).releasePointerCapture?.(event.pointerId);
    press = undefined;
    setDraggingId(undefined);
  };

  const onFlagClick = (flag: Flag): void => {
    if (swallowClick) {
      swallowClick = false;
      return;
    }
    select(flag);
  };

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
  /**
   * The hovered POINTER x, not the readout itself. The readout is derived
   * from it and the current data, so a change made at the hovered date (a
   * click that adds an event there) updates the table under the still pointer
   * instead of leaving the pre-click counts on screen until it moves.
   */
  const [hoverX, setHoverX] = createSignal<number | undefined>();
  const hover = createMemo((): Hover | undefined => {
    const x = hoverX();
    return x === undefined
      ? undefined
      : hoverAt(props.levels, props.domain, x, frame(), props.pickAt);
  });
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
    setHoverX(x);
  };

  const onPlotClick = (event: MouseEvent): void => {
    if (props.onPick === undefined) return;
    const x = pointerX(event);
    if (x === undefined) return;
    props.onPick(
      hoverAt(props.levels, props.domain, x, frame(), props.pickAt).at,
    );
  };

  /**
   * The readout's width, from the TEXT ALONE.
   *
   * This measured the panel GROUP, which contains the background `<rect>`
   * whose width IS this value — so every measurement returned the current
   * width and set it to that plus the padding. The panel grew by ten units on
   * every pointer move until it ran off the screen. A measurement that
   * includes the thing being measured is a feedback loop, not a measurement.
   *
   * So only the `<text>` nodes are measured, and only their INTRINSIC widths:
   * `getComputedTextLength` is unaffected by where the text was placed or how
   * wide the panel is. Width is then a pure function of the rows — the widest
   * value, plus the widest count, plus the gap between the columns — and
   * placement is a pure function of that width and the anchor.
   *
   * `getComputedTextLength` is absent in jsdom, where every row measures zero
   * and the minimum width stands. That is correct rather than merely safe: a
   * panel narrower than its content is placed slightly wrong, never drawn
   * wrong.
   */
  const widthOfTexts = (
    selector: string,
    root: SVGGElement | undefined = panel,
  ): number => {
    if (root === undefined) return 0;
    const nodes = [...root.querySelectorAll<SVGTextElement>(selector)];
    const widths = map(
      (node: SVGTextElement) => node.getComputedTextLength?.() ?? 0,
      nodes,
    );
    return widths.length === 0 ? 0 : Math.max(...widths);
  };

  const measurePanel = (): void => {
    if (panel === undefined) return;
    const value = widthOfTexts(
      ".sui-levels-timeline__panel-cell:not(.sui-levels-timeline__panel-cell--count)",
    );
    const count = widthOfTexts(".sui-levels-timeline__panel-cell--count");
    const header = widthOfTexts(".sui-levels-timeline__panel-date");
    const content = Math.max(header, value + PANEL_COLUMN_GAP + count);
    setPanelWidth(Math.max(PANEL_MIN_WIDTH, content + PANEL_PADDING * 2));
  };
  createEffect(() => {
    // Re-measure when the ROWS change — not when the placement does.
    hover()?.rows;
    queueMicrotask(measurePanel);
  });

  /** The flag tooltip's width: its widest line, measured the same way. */
  const measureTip = (): void => {
    if (tipPanel === undefined) return;
    const content = Math.max(
      widthOfTexts(".sui-levels-timeline__panel-date", tipPanel),
      widthOfTexts(".sui-levels-timeline__panel-cell", tipPanel),
    );
    setTipWidth(Math.max(PANEL_MIN_WIDTH, content + PANEL_PADDING * 2));
  };
  createEffect(() => {
    // Re-measure when the tooltip's CONTENT changes: another flag, or the
    // dragged one's new date.
    tipFlag()?.details;
    tipFlag()?.at;
    queueMicrotask(measureTip);
  });

  const tipX = (flag: Flag): number =>
    placeTooltipX({
      anchorX: flag.x,
      tipWidth: tipWidth(),
      offsetX: PANEL_OFFSET,
      boundsLeft: frame().plotLeft,
      boundsRight: frame().plotRight,
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

  /** The readout's height: header, one row per live level, and padding. */
  const panelHeight = (rows: number): number =>
    PANEL_HEADER_HEIGHT + rows * PANEL_ROW_HEIGHT + PANEL_PADDING;

  /**
   * Keyboard parity for both jobs a flag does: Enter/Space selects, and — when
   * the flag is draggable — the arrow keys move it a day, under the same
   * neighbour clamp a drag obeys.
   */
  const onFlagKeyDown = (event: KeyboardEvent, flag: Flag): void => {
    if (
      draggable() &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      event.preventDefault();
      const step = event.key === "ArrowLeft" ? -DAY_MS : DAY_MS;
      move(
        flag.id,
        clampMutationTime(
          props.mutations,
          flag.id,
          flag.at + step,
          props.domain,
        ),
      );
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    select(flag);
  };

  return (
    <div
      ref={host}
      class="sui-levels-timeline"
      data-selected-mutation={props.selectedMutationId}
      data-dragging-mutation={draggingId()}
    >
      {/* The <title> is the graphic's NAME and must stay short: a browser
          paints it as a NATIVE tooltip on hover, and the whole announcement
          was appearing as a paragraph-long OS tooltip over the chart. The
          announcement lives in <desc> instead — the SVG element for exactly
          this, read by assistive technology and never painted.

          Neither goes on a wrapper with role="img", which would make the
          canvas presentational and take the flags — real buttons when
          selection is wired — out of the accessibility tree with it.

          NOTE: <title> must be the FIRST child of <svg>. A JSX comment here
          counts as a child and biome's noSvgWithoutTitle stops seeing it,
          which is why this comment sits outside the element. */}
      <svg
        class="sui-levels-timeline__canvas"
        viewBox={`0 0 ${frame().viewWidth} ${frame().viewHeight}`}
      >
        <title>{SVG_TITLE}</title>
        <desc>{description()}</desc>
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
          {/* THE VALUE AXIS, in the left gutter. Its ticks are nice numbers
              from the value domain and its labels are the consumer's own
              format — a rail's height IS its value, so without this the
              reader can see that one rail sits above another and not what
              either of them is. The gutter's width came from these labels
              (geometry.ts), which is why the plot starts where it does. */}
          <g class="sui-levels-timeline__y-axis">
            <line
              class="sui-levels-timeline__y-axis-line"
              x1={frame().plotLeft}
              x2={frame().plotLeft}
              y1={frame().plotTop}
              y2={frame().plotBottom}
            />
            <Index each={geometry().yTicks}>
              {(tick) => (
                <g class="sui-levels-timeline__y-tick">
                  <line
                    x1={frame().plotLeft - Y_TICK_LENGTH}
                    x2={frame().plotLeft}
                    y1={tick().y}
                    y2={tick().y}
                  />
                  <text
                    class="sui-levels-timeline__y-tick-label"
                    x={frame().plotLeft - Y_TICK_LENGTH - Y_LABEL_GAP}
                    y={tick().y}
                    text-anchor="end"
                    dominant-baseline="central"
                  >
                    {tick().label}
                  </text>
                </g>
              )}
            </Index>
          </g>

          <line
            class="sui-levels-timeline__baseline"
            x1={frame().plotLeft}
            x2={frame().plotRight}
            y1={frame().plotBottom}
            y2={frame().plotBottom}
          />

          {/* The DATED axis (geometry.ts `datedAxisTicks`): a tick at every
              flag date — longer, so the exact position reads without a label —
              and at the span's cadence between. Labels are horizontal exact
              days, painted only where they clear their neighbours; a tick
              whose label would collide is drawn bare. */}
          <Index each={geometry().ticks}>
            {(tick) => (
              <g
                class={
                  tick().event
                    ? "sui-levels-timeline__tick sui-levels-timeline__tick--event"
                    : "sui-levels-timeline__tick"
                }
              >
                <line
                  x1={tick().x}
                  x2={tick().x}
                  y1={frame().plotBottom}
                  y2={frame().plotBottom + tick().tickLength}
                />
                <Show when={tick().showLabel}>
                  <text
                    class="sui-levels-timeline__tick-label"
                    x={tick().labelX}
                    y={tick().labelY}
                    text-anchor={tick().labelAnchor}
                  >
                    {tick().label}
                  </text>
                </Show>
              </g>
            )}
          </Index>

          {/* The un-numbered changes. Thinner and fainter than a flag's rule,
              because they carry no name — they only say "something happened
              here", which is precisely what a lone arrival needs. */}
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
              does not compete with one. A flag whose box was nudged clear of
              a neighbour gets a LEADER from the box down to its rule, which
              stays at the event's true x. */}
          <Index each={geometry().flags}>
            {(flag) => (
              <>
                <line
                  class={flagClass(flag(), "rule")}
                  x1={flag().x}
                  x2={flag().x}
                  y1={flag().ruleTop}
                  y2={flag().ruleBottom}
                />
                <Show when={flag().displaced}>
                  <line
                    class={flagClass(flag(), "leader")}
                    x1={flag().textX}
                    x2={flag().x}
                    y1={FLAG_RULE_TOP}
                    y2={flag().ruleTop}
                  />
                </Show>
              </>
            )}
          </Index>

          {/* Flows first, UNDER the rails they join, so a flow reads as
              growing out from beneath both ends rather than crossing them. */}
          <Index each={geometry().flows}>
            {(flow) => (
              <path
                class={flowClass(flow())}
                d={flow().path}
                fill={
                  isOpen(flow()) ? `url(#${gradientId(flow())})` : undefined
                }
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
        {/* biome-ignore lint/a11y/noStaticElementInteractions: hover readout and an optional date pick on a data surface; the keyboard path to the same information is the flags, which are real buttons, and the announcement, which carries every count. */}
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
          onPointerLeave={() => setHoverX(undefined)}
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
                    {props.pickAt === undefined
                      ? monthLabelOf(at().at)
                      : isoDayOf(at().at)}
                  </text>
                  <For each={at().rows}>
                    {(row, index) => (
                      <>
                        <text
                          class="sui-levels-timeline__panel-cell"
                          x={PANEL_PADDING}
                          y={
                            PANEL_HEADER_HEIGHT + index() * PANEL_ROW_HEIGHT + 7
                          }
                        >
                          {formatValue(row.value)}
                        </text>
                        <text
                          class="sui-levels-timeline__panel-cell sui-levels-timeline__panel-cell--count"
                          x={panelWidth() - PANEL_PADDING}
                          y={
                            PANEL_HEADER_HEIGHT + index() * PANEL_ROW_HEIGHT + 7
                          }
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
            // biome-ignore lint/a11y/noStaticElementInteractions: conditionally interactive — role="button", tabindex and keyboard parity (Enter/Space selects, arrows move a day) are wired exactly when onSelectMutation or onMoveMutation is provided (focusable()); the pointer hover only shows a tooltip whose content is also in the flag's aria-label. The analyzer cannot see through that runtime guard.
            <g
              class={flagClass(flag(), "flag")}
              role={focusable() ? "button" : undefined}
              tabindex={focusable() ? 0 : undefined}
              aria-label={focusable() ? flagLabel(flag()) : undefined}
              data-selected={isSelected(flag()) ? "true" : undefined}
              data-mutation-id={flag().id}
              onClick={focusable() ? () => onFlagClick(flag()) : undefined}
              onKeyDown={
                focusable()
                  ? (event: KeyboardEvent) => onFlagKeyDown(event, flag())
                  : undefined
              }
              onPointerEnter={() => setHoveredFlagId(flag().id)}
              onPointerLeave={() => setHoveredFlagId(undefined)}
              onFocus={() => setHoveredFlagId(flag().id)}
              onBlur={() => setHoveredFlagId(undefined)}
              onPointerDown={(event: PointerEvent) =>
                onFlagPointerDown(event, flag())
              }
              onPointerMove={onFlagPointerMove}
              onPointerUp={onFlagPointerEnd}
              onPointerCancel={onFlagPointerEnd}
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

        {/* The flag tooltip: the exact day, then what changed there. Last,
            so it paints over the flags it describes the neighbours of. */}
        <Show when={tipFlag()}>
          {(flag) => (
            <g
              ref={tipPanel}
              class="sui-levels-timeline__flag-tip"
              transform={`translate(${tipX(flag())} ${FLAG_TIP_TOP})`}
            >
              <rect
                class="sui-levels-timeline__panel-box"
                x={0}
                y={0}
                width={tipWidth()}
                height={panelHeight(flag().details.length)}
                rx="3"
              />
              <text
                class="sui-levels-timeline__panel-date"
                x={PANEL_PADDING}
                y={PANEL_PADDING + 7}
              >
                {isoDayOf(flag().at)}
              </text>
              <Index each={flag().details}>
                {(line, index) => (
                  <text
                    class="sui-levels-timeline__panel-cell"
                    x={PANEL_PADDING}
                    y={PANEL_HEADER_HEIGHT + index * PANEL_ROW_HEIGHT + 7}
                  >
                    {line()}
                  </text>
                )}
              </Index>
            </g>
          )}
        </Show>
      </svg>
    </div>
  );
};

/**
 * The two CONFIG props, and the reason there is a factory at all.
 *
 * A value's format is the chart's own editorial voice, not the consumer's
 * data: it never varies between two renders of the same chart, so it is
 * exactly the thing to bake once at definition time rather than repeat at
 * every call site. The pick strategy (`pickAt`) is the same kind of thing for
 * behaviour — what a click on this chart MEANS never varies per render.
 * Everything else the chart takes is data or a callback.
 *
 * `cadence` is NOT here on purpose. It is derived from the span (`axisTicks`)
 * and no caller has ever wanted to contradict it, so it is not modelled as
 * configurable at all — see `docs/adr/` and STYLE_GUIDE's minimal variant
 * surface.
 */
export type LevelsTimelineOverrides = Pick<
  LevelsTimelineProps,
  "formatValue" | "pickAt"
>;

/** What a curried variant's call site still supplies: data and callbacks. */
export type LevelsTimelineDataProps = Omit<
  LevelsTimelineProps,
  keyof LevelsTimelineOverrides
>;

/**
 * Factory for a curried timeline. Call sites of the returned component pass
 * data only — levels, transfers, mutations, the spans, selection and the two
 * callbacks — and never a format.
 *
 * @example
 * const MoneyLevelsTimeline = createLevelsTimeline({ formatValue: asDollars });
 * // call site: <MoneyLevelsTimeline levels={levels} mutations={m} domain={d} />
 */
export const createLevelsTimeline = (
  defaults: LevelsTimelineOverrides,
): Component<LevelsTimelineDataProps> => {
  return (props) => (
    <LevelsTimeline {...(mergeProps(defaults, props) as LevelsTimelineProps)} />
  );
};
