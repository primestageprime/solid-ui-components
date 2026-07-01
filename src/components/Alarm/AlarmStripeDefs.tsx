// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
import type { Component } from "solid-js";
import "./Alarm.css";

/**
 * SVG `<defs>` block that registers the `alarm-stripe` pattern used by
 * `AlarmHotZones`. Render this inside the `<Chart>` exactly once per
 * chart instance.
 *
 * The pattern is a `spacing`×`spacing` (in user-space coordinates)
 * diagonal-line motif over a translucent red ground. Geometry is driven
 * by numeric props because SVG geometry attributes do not resolve CSS
 * `var(...)` — paint (fill/stroke colors and opacities) is still themed
 * via `--sui-alarm-zone-stripe-*` CSS vars.
 *
 * The pattern ID is configurable so multiple alarm overlays on the same
 * page (or differently-styled overlays in one chart) don't collide.
 *
 * @example
 *   <Chart ...>
 *     <AlarmStripeDefs />
 *     <AlarmHotZones zones={zones} />
 *   </Chart>
 */
export interface AlarmStripeDefsProps {
  /** Pattern id used by `<AlarmHotZones>` via `fill="url(#id)"`. Default `"alarm-stripe"`. */
  patternId?: string;
  /**
   * Stripe tile size in user-space pattern coordinates. Controls both
   * the diagonal-line spacing and the tile dimensions. Default `10`.
   *
   * Numeric (not a CSS var) because SVG geometry attributes — `width`,
   * `height`, `x1`/`y1`/`x2`/`y2` — do not resolve `var(...)`. Passing a
   * `var()` string here would collapse the tile to 0/NaN and the
   * patternTransform rotation would render an undefined fallback.
   */
  spacing?: number;
  /** Stripe stroke width in user-space units. Default `3`. */
  strokeWidth?: number;
}

export const AlarmStripeDefs: Component<AlarmStripeDefsProps> = (props) => {
  const id = () => props.patternId ?? "alarm-stripe";
  const spacing = () => props.spacing ?? 10;
  const strokeWidth = () => props.strokeWidth ?? 3;
  return (
    <defs>
      <pattern
        id={id()}
        patternUnits="userSpaceOnUse"
        width={spacing()}
        height={spacing()}
        patternTransform="rotate(45)"
      >
        <rect
          width={spacing()}
          height={spacing()}
          fill="var(--sui-alarm-zone-stripe-fill, #ff4040)"
          fill-opacity="var(--sui-alarm-zone-stripe-bg-opacity, 0.30)"
        />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2={spacing()}
          stroke="var(--sui-alarm-zone-stripe-fill, #ff4040)"
          stroke-width={strokeWidth()}
          stroke-opacity="var(--sui-alarm-zone-stripe-line-opacity, 0.55)"
        />
      </pattern>
    </defs>
  );
};
