// ============================================
// RateGaugeCanvas — Structural Primitive (Depth 1)
//
// The instrument itself: the meter host, the measured box, the dial, the
// needles, the brace, the sector and the HUD callouts. Owns
// `RateGaugeCanvas.css` and every intrinsic element the readout is made of,
// and composes no library component.
//
// It decides no NUMBER and no WORD. Numbers come from `geometry.ts`, which is
// pure and prints as a table (`geometry.test.ts`); words come from the caller,
// through `lines` and `valueText`, which this module calls with the resolved
// geometry and never edits. That is the headless-observation-first discipline
// made structural twice over: there is nowhere in this module for a number to
// be decided, and nowhere for a sentence to be invented.
//
// ## The label seam
//
// A callout line the CONSUMER worded can be any length, so by Peter's standing
// rule it must ellipsize AND hand the whole of itself back in a Tooltip. A
// Tooltip is a sibling Primitive, which a Primitive may not import, so the
// canvas does not build that device: it draws the `<foreignObject>` and the
// label box its own CSS clips, states the class hook, and calls `renderLabel`
// for the content. The Composite above supplies `Tooltip` +
// `EllipsizedHudCaption` into it. Same seam as `ScrubChart`'s `renderChart`
// callbacks, which ADR 0010 keeps so that adapters can mount inside them.
//
// Content passed in through a prop is the CALLER's child, not this module's,
// so it does not raise this module's depth — exactly as `Chart` stays Depth 1
// while hosting arbitrary slot children.
//
// A line marked `unbounded: false` is short by construction and stays SVG
// `<text>`, which is why the delta row and the reference needle's name never
// reach the seam.
// ============================================
import {
  For,
  Index,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from "solid-js";
import {
  type Band,
  type Box,
  type Callout,
  type CalloutMode,
  type CornerBlock,
  type CornerId,
  type CornerLabels,
  COLUMN_TICK_HALF,
  type Domain,
  type GaugeGeometry,
  gaugeGeometry,
  PIVOT_RADIUS,
  TERMINAL_RADIUS,
} from "./geometry";
import { observeSize } from "../../internal/dom/observeSize";
import "./RateGaugeCanvas.css";

/** Height of a callout's label box, and half of it — one 11px line. */
const LABEL_BOX_HEIGHT = 14;

/**
 * One line of one callout, as the caller worded it.
 *
 * `unbounded` is the whole of the decision the canvas makes about it: an
 * unbounded line is the consumer's own text of unknown length, so it goes to
 * the ellipsize-plus-tooltip seam; a bounded one is short by construction and
 * is painted as SVG text.
 */
export interface RateGaugeLine {
  readonly text: string;
  readonly unbounded: boolean;
}

/**
 * One line of a CORNER block (`callouts: "corners"`).
 *
 * `role` picks the treatment the same line gets in a leader callout: a name
 * in its row's tone, a muted `relative` line, or the bold `delta` sentence in
 * the active tone.
 */
export interface RateGaugeCornerLine extends RateGaugeLine {
  readonly role: "name" | "relative" | "delta";
}

/**
 * What the canvas hands the caller for one unbounded line.
 *
 * Only the text: the box the line is clipped inside is an intrinsic `<div>`
 * that this module renders and its own CSS styles, so the caller supplies the
 * ellipsize-plus-tooltip device and nothing around it.
 */
export interface RateGaugeLabelSlot {
  /** The complete line — never truncated here. */
  text: string;
}

export interface RateGaugeCanvasProps {
  /** The value range the ring spans, mapped onto [−90°, +90°]. */
  domain: Domain;
  baseline: number;
  value: number;
  /** The consumer's caution threshold; splits the positive half. */
  caution?: number;
  /**
   * Exactly the strings the callouts will carry, for sizing the label column.
   *
   * The canvas is cut to the words as well as to the dial, and only the caller
   * knows what the words will be — so it states them here rather than letting
   * the canvas guess from the numbers.
   */
  labels: readonly string[];
  /** The lines one callout carries, given the resolved geometry. */
  lines: (callout: Callout, geometry: GaugeGeometry) => readonly RateGaugeLine[];
  /** The whole `aria-valuetext`, given the resolved geometry. */
  valueText: (geometry: GaugeGeometry) => string;
  /** The whole `aria-label` for the meter, in the caller's words. */
  ariaLabel: string;
  /** Content for an unbounded line's `<foreignObject>` slot. */
  renderLabel: (slot: RateGaugeLabelSlot) => JSX.Element;
  /**
   * `leaders` (default) draws the leader column; `corners` draws the corner
   * blocks instead. Never chosen here — see `calloutModeFor` in geometry.ts.
   */
  callouts?: CalloutMode;
  /** The corner blocks' strings, for sizing them (only read under `corners`). */
  cornerLabels?: CornerLabels;
  /** The lines one corner block carries, given the resolved geometry. */
  cornerLines?: (
    id: CornerId,
    geometry: GaugeGeometry,
  ) => readonly RateGaugeCornerLine[];
}

/**
 * A band carries its own tone and whether it is lit. The dimming is the primary
 * channel for the answer — the reader watches which band the needle stands
 * in — so the tone is redundant encoding rather than the only signal.
 */
const bandClass = (band: Band): string =>
  `sui-rate-gauge__band sui-rate-gauge__band--${band.tone} sui-rate-gauge__band--${
    band.lit ? "lit" : "dim"
  }`;

/** A corner line's row: the delta keeps the delta row's tone and weight. */
const cornerRowClass = (block: CornerBlock, line: RateGaugeCornerLine): string =>
  `sui-rate-gauge__row sui-rate-gauge__row--${line.role === "delta" ? "delta" : block.id}`;

const cornerTextClass = (line: RateGaugeCornerLine): string =>
  line.role === "name"
    ? "sui-rate-gauge__label"
    : `sui-rate-gauge__label sui-rate-gauge__label--${line.role}`;

const textClass = (callout: Callout, index: number): string =>
  `sui-rate-gauge__label${index === 0 ? "" : " sui-rate-gauge__label--relative"}${
    callout.id === "delta" ? " sui-rate-gauge__label--delta" : ""
  }`;

export function RateGaugeCanvas(props: RateGaugeCanvasProps): JSX.Element {
  // The host's own box, once it has one.
  //
  // With it, the canvas is that box at ONE UNIT PER CSS PIXEL: the dial grows
  // to fill the card while the labels, strokes and dots keep their own size.
  // Without it — a card that sizes to its content, which is most of the
  // bench — the gauge draws its default dial on a canvas cut tight to it, and
  // the whole thing scales together as it always did. That fallback is why
  // this is a signal starting `undefined` rather than a measurement the first
  // render has to wait for: an unmeasured gauge is a correct gauge, not a
  // blank one.
  const [box, setBox] = createSignal<Box | undefined>(undefined);
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
    // Synchronously first, so the first paint is already at the right size.
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
    gaugeGeometry({
      domain: props.domain,
      baseline: props.baseline,
      value: props.value,
      caution: props.caution,
      labels: props.labels,
      box: box(),
      callouts: props.callouts,
      cornerLabels: props.cornerLabels,
    }),
  );
  const tone = () => geometry().tone;

  return (
    // biome-ignore lint/a11y/useSemanticElements: intentional ARIA meter; a native <meter> is a replaced element with its own UA bar rendering and cannot host the SVG dial that IS this readout.
    <div
      ref={host}
      class={`sui-rate-gauge sui-rate-gauge--${tone()}`}
      role="meter"
      aria-label={props.ariaLabel}
      aria-valuemin={props.domain[0]}
      aria-valuemax={props.domain[1]}
      aria-valuenow={geometry().drawnValue}
      aria-valuetext={props.valueText(geometry())}
    >
      <svg
        class="sui-rate-gauge__canvas"
        viewBox={geometry().viewBox}
        aria-hidden="true"
      >
        {/* The ring's bands. Only the one holding the needle is lit — two of
            them normally, three once a caution threshold splits the positive
            half. */}
        <For each={geometry().bands}>
          {(band) => <path class={bandClass(band)} d={band.path} />}
        </For>

        {/* The delta as an AREA: the sector the two needles enclose, in the
            active tone at low alpha. Then the zero reference line. */}
        <Show when={geometry().deltaSector}>
          <path class="sui-rate-gauge__delta-sector" d={geometry().deltaSector} />
        </Show>
        <line
          class="sui-rate-gauge__zero"
          x1={geometry().metrics.center.cx}
          y1={geometry().metrics.center.cy}
          x2={geometry().zeroLine.x2}
          y2={geometry().zeroLine.y2}
        />

        {/* The baseline needle: dashed and grey, because it is the reference,
            not the reading. No tip cap — the cap marks where you ARE. */}
        <line
          class="sui-rate-gauge__needle sui-rate-gauge__needle--baseline"
          x1={geometry().metrics.center.cx}
          y1={geometry().metrics.center.cy}
          x2={geometry().baselineTip.x}
          y2={geometry().baselineTip.y}
        />

        {/* The delta brace, outside the ring, in the active tone. Its cusp is
            where the delta's leader starts — which is why that callout carries
            no dot. */}
        <Show when={geometry().brace}>
          <path class="sui-rate-gauge__brace" d={geometry().brace} />
        </Show>

        {/* The current needle, capped with an arc concentric with the ring so
            the cap reads as a segment of the instrument's own edge. */}
        <line
          class="sui-rate-gauge__needle sui-rate-gauge__needle--value"
          x1={geometry().metrics.center.cx}
          y1={geometry().metrics.center.cy}
          x2={geometry().valueTip.x}
          y2={geometry().valueTip.y}
        />
        <path class="sui-rate-gauge__needle-cap" d={geometry().valueTip.capArc} />

        <circle
          class="sui-rate-gauge__pivot"
          cx={geometry().metrics.center.cx}
          cy={geometry().metrics.center.cy}
          r={PIVOT_RADIUS}
        />

        {/* The callouts. Geometry decided every point; this only paints. */}
        <For each={geometry().callouts}>
          {(callout) => (
            <g class={`sui-rate-gauge__row sui-rate-gauge__row--${callout.id}`}>
              <path class="sui-rate-gauge__leader" d={callout.leader} />
              {/* The terminal, when geometry says there is room for one. A dot
                  on a mark the callout does not name reads as a blemish on
                  that mark, so those leaders start bare from the anchor
                  instead. Filled for a live mark, open for the baseline — the
                  same distinction the dashed needle already makes. */}
              <Show when={callout.showDot}>
                <circle
                  class="sui-rate-gauge__terminal"
                  cx={callout.anchor.x}
                  cy={callout.anchor.y}
                  r={TERMINAL_RADIUS}
                />
              </Show>
              <line
                class="sui-rate-gauge__column-tick"
                x1={callout.labelX}
                x2={callout.labelX}
                y1={callout.y - COLUMN_TICK_HALF}
                y2={callout.y + COLUMN_TICK_HALF}
              />
              {/* Line one names the thing; line two says where it stands
                  against zero. Only an UNBOUNDED line needs a
                  <foreignObject> to ellipsize in and a tooltip to hand the
                  whole of itself back. */}
              <Index each={props.lines(callout, geometry())}>
                {(line, index) => (
                  <Show
                    when={line().unbounded}
                    fallback={
                      <text
                        class={textClass(callout, index)}
                        x={callout.textX}
                        y={callout.lineY[index]}
                        dominant-baseline="middle"
                      >
                        {line().text}
                      </text>
                    }
                  >
                    <foreignObject
                      x={callout.textX}
                      y={callout.lineY[index] - LABEL_BOX_HEIGHT / 2}
                      width={geometry().labelWidth}
                      height={LABEL_BOX_HEIGHT}
                    >
                      <div class="sui-rate-gauge__label-box">
                        {props.renderLabel({ text: line().text })}
                      </div>
                    </foreignObject>
                  </Show>
                )}
              </Index>
            </g>
          )}
        </For>

        {/* The corner blocks, when the box chose them over leaders: no
            leader, no tick, just the words right-aligned in their corner,
            each line in the treatment its leader row would have given it. */}
        <Show when={geometry().corners}>
          {(corners) => (
            <For each={corners()}>
              {(block) => (
                <Index each={props.cornerLines?.(block.id, geometry()) ?? []}>
                  {(line, index) => (
                    <g class={cornerRowClass(block, line())}>
                      <Show
                        when={line().unbounded}
                        fallback={
                          <text
                            class={cornerTextClass(line())}
                            x={block.x}
                            y={block.lineY[index]}
                            text-anchor="end"
                            dominant-baseline="middle"
                          >
                            {line().text}
                          </text>
                        }
                      >
                        <foreignObject
                          x={block.x - block.width}
                          y={block.lineY[index] - LABEL_BOX_HEIGHT / 2}
                          width={block.width}
                          height={LABEL_BOX_HEIGHT}
                        >
                          <div class="sui-rate-gauge__label-box sui-rate-gauge__label-box--end">
                            {props.renderLabel({ text: line().text })}
                          </div>
                        </foreignObject>
                      </Show>
                    </g>
                  )}
                </Index>
              )}
            </For>
          )}
        </Show>
      </svg>
    </div>
  );
}
