// lastReviewedAt: 2026-10-13
// lastReviewedBy: adlai.arnold
// ============================================
// PointCaptions — Structural (Depth 1). SVG chart slot; composes no library components.
// Tags: shows:text, shows:mark, does:view, data:list, role:slot
//
// A SHORT WORD pinned to a point: "early" above a dot, "under" below it. The
// seat is stated, not found — the caption sits `offset` px above or below its
// point and nowhere else. `ChartLabels` is the other thing: a ladder that
// finds each label a free seat and drops what fits nowhere, for captions that
// must not collide. A one-word verdict beside its own mark needs no ladder.
// ============================================
import { For } from "solid-js";
import type { Tone } from "../../types";
import { useChart } from "./context";

export type CaptionSide = "above" | "below";

export interface PointCaptionsProps<T> {
  data: readonly T[];
  x: (d: T) => number;
  y: (d: T) => number;
  text: (d: T) => string;
  /** Which side of the point the word sits. Default `above`. */
  side?: CaptionSide | ((d: T) => CaptionSide);
  /** Distance in px from the point to the text's near edge. Default 6. */
  offset?: number;
  /** The caption's tone (src/types.ts), per datum or for all. Default the
   *  tick colour, as every other chart caption. */
  tone?: Tone | ((d: T) => Tone);
  class?: string;
}

export function PointCaptions<T>(props: PointCaptionsProps<T>) {
  const ctx = useChart();
  const side = (d: T): CaptionSide =>
    typeof props.side === "function" ? props.side(d) : (props.side ?? "above");
  const tone = (d: T): Tone | undefined =>
    typeof props.tone === "function" ? props.tone(d) : props.tone;
  const offset = () => props.offset ?? 6;
  return (
    <g class={`sui-chart__point-captions${props.class ? ` ${props.class}` : ""}`}>
      <For each={props.data}>
        {(d) => {
          const px = () => ctx.xScale()(props.x(d));
          const py = () => ctx.yScale()(props.y(d));
          const above = () => side(d) === "above";
          return (
            <text
              class="sui-chart__point-caption"
              x={px()}
              y={above() ? py() - offset() : py() + offset()}
              text-anchor="middle"
              dominant-baseline={above() ? "auto" : "hanging"}
              data-side={side(d)}
              data-tone={tone(d)}
            >
              {props.text(d)}
            </text>
          );
        }}
      </For>
    </g>
  );
}
