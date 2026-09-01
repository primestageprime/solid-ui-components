// ============================================
// BandRail — the band layer and the arc-ring thumb.
//
// Lowercase filename ON PURPOSE. `isEntryPath` in scripts/render-coverage.mjs
// matches any PascalCase `.tsx` under src/components/, and missingDepthHeaders
// uses the same selector, so a `Bands.tsx` here would register as a new
// component owing its own depth header and its own showcase. Same disposition
// as ExtractionBoard/cards.tsx.
//
// This file draws. It computes no geometry: bandGeometry and arcLengths are in
// helpers.ts, where sideExtent reads the same functions, so a bar and the box
// sized to hold it can never disagree.
// ============================================
import { For, Index, Show } from "solid-js";
import type { Tone } from "../../types";
import {
  ARC_STROKE,
  arcLengths,
  bandGeometry,
  BAND_CAP_HALF,
  RING_RADIUS,
} from "./helpers";
import type { PlacedBand } from "./types";

/** `sui-band-rail__<block>--<tone>`, or nothing for the default tone. */
export const toneModifier = (block: string, tone: Tone | undefined): string =>
  tone && tone !== "default" ? ` sui-band-rail__${block}--${tone}` : "";

/**
 * One band: a bar across the span, a cap and a tick at each end it claims, and
 * its label riding the bar.
 *
 * A band that does not hold at the current value is dimmed rather than hidden.
 * The dimming is the PRIMARY channel for the direction answer — the reader
 * drags and watches which bars light up — which is what makes the thumb's arcs
 * legal as redundant encoding rather than meaning left in colour alone.
 */
export function BandLayer(props: {
  placed: readonly PlacedBand[];
  railY: number;
  isActive: (placed: PlacedBand) => boolean;
}) {
  return (
    <For each={props.placed}>
      {(placed) => {
        const geometry = () =>
          bandGeometry(placed.lane, placed.side, props.railY);
        const middle = () => (placed.x1 + placed.x2) / 2;
        const classes = () =>
          `sui-band-rail__band${toneModifier("band", placed.band.tone)}${
            props.isActive(placed) ? "" : " sui-band-rail__band--inactive"
          }`;
        return (
          <g class={classes()}>
            {/* The tick drops to the rail only where the band claims a
                crossing. An end that ran off the domain has none to draw. */}
            <Show when={placed.capStart}>
              <line
                class="sui-band-rail__band-tick"
                x1={placed.x1}
                x2={placed.x1}
                y1={props.railY}
                y2={geometry().barY}
              />
            </Show>
            <Show when={placed.capEnd}>
              <line
                class="sui-band-rail__band-tick"
                x1={placed.x2}
                x2={placed.x2}
                y1={props.railY}
                y2={geometry().barY}
              />
            </Show>

            <line
              class="sui-band-rail__bar"
              x1={placed.x1}
              x2={placed.x2}
              y1={geometry().barY}
              y2={geometry().barY}
            />

            {/* Caps make "stops here" and "runs off past here" look different.
                Without them a clipped bar and a bounded one are the same mark. */}
            <Show when={placed.capStart}>
              <line
                class="sui-band-rail__cap"
                x1={placed.x1}
                x2={placed.x1}
                y1={geometry().barY - BAND_CAP_HALF}
                y2={geometry().barY + BAND_CAP_HALF}
              />
            </Show>
            <Show when={placed.capEnd}>
              <line
                class="sui-band-rail__cap"
                x1={placed.x2}
                x2={placed.x2}
                y1={geometry().barY - BAND_CAP_HALF}
                y2={geometry().barY + BAND_CAP_HALF}
              />
            </Show>

            <text
              class="sui-band-rail__band-label"
              x={middle()}
              y={geometry().labelY}
              text-anchor={placed.anchor}
            >
              {placed.band.label}
            </text>
          </g>
        );
      }}
    </For>
  );
}

/**
 * The thumb ring, its stroke split into one arc per active band.
 *
 * ONE radius for every count. A concentric stack would rank the bands, which
 * is information nobody asked for, and each extra ring would push the label
 * stack outward — so the box height would move as the user dragged. Arcs cost
 * no height at all.
 *
 * Arcs run clockwise from 12 o'clock, in the consumer's own band order. Order
 * has to be STABLE while dragging, and input order is stable and theirs to
 * control.
 */
export function ArcRing(props: {
  cx: number;
  cy: number;
  tones: readonly (Tone | undefined)[];
}) {
  const arcs = () => arcLengths(props.tones.length, RING_RADIUS);
  const circumference = () => 2 * Math.PI * RING_RADIUS;

  return (
    <Show
      when={arcs().length > 0}
      fallback={
        // Past MAX_ARCS every arc is about twice the stroke width and reads as
        // a dash rather than an arc. One neutral ring says "several hold here"
        // without pretending to be countable; the dimmed bars carry the rest.
        <circle
          class="sui-band-rail__ring"
          cx={props.cx}
          cy={props.cy}
          r={RING_RADIUS}
        />
      }
    >
      <g transform={`rotate(-90 ${props.cx} ${props.cy})`}>
        <Index each={arcs()}>
          {(arc, i) => (
            <circle
              class={`sui-band-rail__arc${toneModifier("arc", props.tones[i])}`}
              cx={props.cx}
              cy={props.cy}
              r={RING_RADIUS}
              stroke-width={ARC_STROKE}
              stroke-dasharray={`${arc().arc} ${circumference() - arc().arc}`}
              stroke-dashoffset={-i * (arc().arc + arc().gap)}
            />
          )}
        </Index>
      </g>
    </Show>
  );
}
