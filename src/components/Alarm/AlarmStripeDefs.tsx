import { Component } from "solid-js";
import "./Alarm.css";

/**
 * SVG `<defs>` block that registers the `alarm-stripe` pattern used by
 * `AlarmHotZones`. Render this inside the `<Chart>` exactly once per
 * chart instance.
 *
 * The pattern is a 10×10 (in user-space coordinates) diagonal-line motif
 * over a translucent red ground. Override the visual via
 * `--sui-alarm-zone-stripe-*` CSS vars in your theme.
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
}

export const AlarmStripeDefs: Component<AlarmStripeDefsProps> = (props) => {
  const id = () => props.patternId ?? "alarm-stripe";
  return (
    <defs>
      <pattern
        id={id()}
        patternUnits="userSpaceOnUse"
        width="var(--sui-alarm-zone-stripe-spacing, 10)"
        height="var(--sui-alarm-zone-stripe-spacing, 10)"
        patternTransform="rotate(45)"
      >
        <rect
          width="var(--sui-alarm-zone-stripe-spacing, 10)"
          height="var(--sui-alarm-zone-stripe-spacing, 10)"
          fill="var(--sui-alarm-zone-stripe-fill, #ff4040)"
          fill-opacity="var(--sui-alarm-zone-stripe-bg-opacity, 0.30)"
        />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="var(--sui-alarm-zone-stripe-spacing, 10)"
          stroke="var(--sui-alarm-zone-stripe-fill, #ff4040)"
          stroke-width="var(--sui-alarm-zone-stripe-line-width, 3)"
          stroke-opacity="var(--sui-alarm-zone-stripe-line-opacity, 0.55)"
        />
      </pattern>
    </defs>
  );
};
