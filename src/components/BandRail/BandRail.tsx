// ============================================
// BandRail — Atomic (Depth 1)
// Owns CSS (BandRail.css), imports no other component.
// Factory: createBandRail().
//
// One horizontal axis that is a control and a readout at the same time. A
// thumb rides the axis and reports the current value. Named ticks stand off
// the axis at the values where the answer changes, and those ticks are model
// OUTPUTS plotted on the axis of the model INPUT.
//
// That coupling is the whole component. A consumer that composed a slider and
// a separate annotated axis would have to keep two scales in step, place every
// label without collision, and clamp the labels at both ends. The rail absorbs
// all three (see helpers.ts) so the consumer supplies only computed thresholds.
//
// The rail does NO arithmetic on the values it is given, and it never snaps
// the value it emits to a threshold. It places what it is handed.
//
// This is the library's first true slider: no other component carries
// role="slider" or aria-valuenow.
// ============================================
import {
  type Component,
  createMemo,
  createSignal,
  Index,
  type JSX,
  mergeProps,
  splitProps,
} from "solid-js";
import { linearScale } from "../Chart/scales";
import { clamp } from "../../internal/math/clamp";
import { safeSetPointerCapture } from "../../internal/pointer/safeSetPointerCapture";
import type { Tone } from "../../types";
import "./BandRail.css";
import {
  ARROW_HALF_WIDTH,
  ARROW_TIP_GAP,
  ARROW_TOP,
  DOT_RADIUS,
  laneGeometry,
  nestedThreshold,
  placeThresholds,
  RAIL_INSET,
  railExtents,
  RING_RADIUS,
  STEM_HALF_WIDTH,
  VIEW_WIDTH,
} from "./helpers";
import type { PlacedThreshold, Threshold } from "./types";

/** Fraction of the domain one arrow key covers. Shift multiplies it by 10. */
const KEY_STEPS = 100;
const SHIFT_MULTIPLIER = 10;

export interface BandRailProps
  extends Omit<
    JSX.SvgSVGAttributes<SVGSVGElement>,
    "children" | "onChange" | "role" | "class"
  > {
  // ---- Overrides ----
  /** Renders a threshold's value as its second text line. Defaults to `String`. */
  format?: (value: number) => string;

  // ---- Data ----
  /** Ends of the axis, in the consumer's own units. */
  domain: readonly [number, number];
  /** Where the thumb sits. Clamped into `domain` before it is drawn. */
  value: number;
  /** Fires with the new value on drag and on every key that moves the thumb. */
  onChange?: (value: number) => void;
  /** The values where the answer changes. Computed by the consumer. */
  thresholds?: readonly Threshold[];
  /** Accessible name for the slider — what the axis measures. */
  label: string;
  /** Stops pointer and keyboard input and dims the rail. */
  disabled?: boolean;
  /** Extra class for the host element. */
  class?: string;
}

type BandRailOverrides = Pick<BandRailProps, "format">;
type BandRailDataProps = Omit<
  BandRailProps,
  keyof BandRailOverrides
>;

const toneClass = (tone: Tone | undefined): string =>
  tone && tone !== "default" ? ` sui-band-rail__threshold--${tone}` : "";

export const BandRail: Component<BandRailProps> = (rawProps) => {
  const merged = mergeProps(
    { format: String, thresholds: [] as readonly Threshold[], disabled: false },
    rawProps,
  );
  const [local, rest] = splitProps(merged, [
    "format",
    "domain",
    "value",
    "onChange",
    "thresholds",
    "label",
    "disabled",
    "class",
  ]);

  let hostEl: HTMLDivElement | undefined;
  let svgEl: SVGSVGElement | undefined;
  // A signal, not a plain `let`: the host reads it to swap `grab` for
  // `grabbing`, which is the only reactivity the affordance work adds.
  const [dragging, setDragging] = createSignal(false);

  const scale = createMemo(() =>
    linearScale(local.domain, [RAIL_INSET, VIEW_WIDTH - RAIL_INSET]),
  );

  const layout = createMemo(() =>
    placeThresholds(local.thresholds, scale(), local.format),
  );

  const extents = createMemo(() => {
    const { aboveLanes, belowLanes } = layout();
    return railExtents(aboveLanes, belowLanes);
  });

  const railY = () => extents().railY;

  /** The value actually drawn — always inside the domain, whatever came in. */
  const shown = () => clamp(local.value, local.domain[0], local.domain[1]);
  const thumbX = () => scale()(shown());

  const nested = (): PlacedThreshold | undefined =>
    nestedThreshold(layout().placed, thumbX());

  const valueText = () => {
    const on = nested();
    const written = local.format(shown());
    return on ? `${written}, ${on.threshold.label}` : written;
  };

  const emit = (next: number): void => {
    const bounded = clamp(next, local.domain[0], local.domain[1]);
    if (bounded === local.value) return;
    local.onChange?.(bounded);
  };

  /**
   * Map a client x onto the domain. The viewBox keeps its aspect ratio, so the
   * only conversion needed is the CSS-to-viewBox scale factor. A zero-width
   * rect means the rail has not been laid out and there is no position to read.
   */
  const valueFromClientX = (clientX: number): number | null => {
    const rect = svgEl?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const viewX = ((clientX - rect.left) / rect.width) * VIEW_WIDTH;
    return scale().invert(clamp(viewX, RAIL_INSET, VIEW_WIDTH - RAIL_INSET));
  };

  const track = (clientX: number): void => {
    const next = valueFromClientX(clientX);
    if (next !== null) emit(next);
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (local.disabled || e.button !== 0) return;
    setDragging(true);
    safeSetPointerCapture(e.currentTarget as Element, e.pointerId);
    hostEl?.focus();
    track(e.clientX);
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (dragging()) track(e.clientX);
  };

  const endDrag = (): void => {
    setDragging(false);
  };

  /** The next threshold strictly past `from`, walking in `direction`. */
  const neighbourThreshold = (
    from: number,
    direction: 1 | -1,
  ): number | null => {
    let best: number | null = null;
    for (const p of layout().placed) {
      const v = p.threshold.value;
      if (direction === 1 ? v <= from : v >= from) continue;
      if (best === null || (direction === 1 ? v < best : v > best)) best = v;
    }
    return best;
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (local.disabled) return;
    const [lo, hi] = local.domain;
    const step = ((hi - lo) / KEY_STEPS) * (e.shiftKey ? SHIFT_MULTIPLIER : 1);
    const here = shown();

    const next = ((): number | null => {
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          return here - step;
        case "ArrowRight":
        case "ArrowUp":
          return here + step;
        case "Home":
          return lo;
        case "End":
          return hi;
        case "PageDown":
          return neighbourThreshold(here, -1) ?? lo;
        case "PageUp":
          return neighbourThreshold(here, 1) ?? hi;
        default:
          return null;
      }
    })();

    if (next === null) return;
    e.preventDefault();
    emit(next);
  };

  const classes = () =>
    `sui-band-rail${local.disabled ? " sui-band-rail--disabled" : ""}${
      dragging() ? " sui-band-rail--dragging" : ""
    }${local.class ? ` ${local.class}` : ""}`;

  return (
    // The slider lives on the host, not on the <svg>. Two reasons: an <svg> is
    // a non-interactive element and may not take an interactive role, and the
    // tick labels are real text nodes that would otherwise compete with
    // aria-valuetext for the same announcement.
    <div
      ref={(el) => {
        hostEl = el;
      }}
      class={classes()}
      role="slider"
      tabIndex={local.disabled ? -1 : 0}
      aria-label={local.label}
      aria-valuemin={local.domain[0]}
      aria-valuemax={local.domain[1]}
      aria-valuenow={shown()}
      aria-valuetext={valueText()}
      aria-disabled={local.disabled || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    >
      <svg
        {...rest}
        ref={(el) => {
          svgEl = el;
        }}
        class="sui-band-rail__canvas"
        viewBox={`0 0 ${VIEW_WIDTH} ${extents().height}`}
        aria-hidden="true"
      >
        {/* The fill is drawn first so the rail's own stroke sits on top of it.
            It encodes the VALUE, not an answer — one neutral tone that cannot
            be read as a band's tone. Every slider has one, and it is the
            strongest single cue that this rail is a control. */}
        <line
          class="sui-band-rail__fill"
          x1={RAIL_INSET}
          x2={thumbX()}
          y1={railY()}
          y2={railY()}
        />

        <line
          class="sui-band-rail__line"
          x1={RAIL_INSET}
          x2={VIEW_WIDTH - RAIL_INSET}
          y1={railY()}
          y2={railY()}
        />

        <Index each={layout().placed}>
          {(placed) => {
            const geometry = () =>
              laneGeometry(placed().lane, placed().side, railY());
            return (
              <g
                class={`sui-band-rail__threshold${toneClass(
                  placed().threshold.tone,
                )}`}
              >
                <line
                  class="sui-band-rail__tick"
                  x1={placed().x}
                  x2={placed().x}
                  y1={railY()}
                  y2={geometry().tickEnd}
                />
                <text
                  class="sui-band-rail__name"
                  x={placed().x}
                  y={geometry().nameY}
                  text-anchor={placed().anchor}
                >
                  {placed().threshold.label}
                </text>
                <text
                  class="sui-band-rail__value"
                  x={placed().x}
                  y={geometry().valueY}
                  text-anchor={placed().anchor}
                >
                  {placed().valueLabel}
                </text>
              </g>
            );
          }}
        </Index>

        {nested() ? (
          <g
            class={`sui-band-rail__threshold${toneClass(
              nested()?.threshold.tone,
            )}`}
          >
            <circle
              class="sui-band-rail__ring"
              cx={thumbX()}
              cy={railY()}
              r={RING_RADIUS}
            />
            <circle
              class="sui-band-rail__thumb"
              cx={thumbX()}
              cy={railY()}
              r={DOT_RADIUS}
            />
          </g>
        ) : (
          <g class="sui-band-rail__thumb">
            <polygon
              points={`${thumbX()},${railY() - ARROW_TIP_GAP} ${
                thumbX() - ARROW_HALF_WIDTH
              },${railY() - ARROW_TOP} ${thumbX() + ARROW_HALF_WIDTH},${
                railY() - ARROW_TOP
              }`}
            />
            <rect
              x={thumbX() - STEM_HALF_WIDTH}
              y={railY() - ARROW_TIP_GAP}
              width={STEM_HALF_WIDTH * 2}
              height={ARROW_TIP_GAP * 2}
            />
          </g>
        )}
      </svg>
    </div>
  );
};

/**
 * Curry the presentational config — in practice the formatter, which is a
 * static decision (a currency, a duration) rather than reactive data.
 */
export const createBandRail = (
  overrides: BandRailOverrides,
): Component<BandRailDataProps> => {
  return (props) => <BandRail {...overrides} {...props} />;
};

export type { BandRailDataProps, BandRailOverrides };
