// ============================================
// HatchPattern — Primitive (Depth 1). SVG mark; composes no library components.
//
// A diagonal-stripe `<pattern>` in ONE colour: a faint ground and a stronger
// stripe, both the given colour at two opacities. Anything in the same SVG can
// paint with it through `fill="url(#<id>)"` — a waiting stretch of a bar, a
// blocked cell, an out-of-window band. Draw it once per chart and reference it
// many times; a pattern per bar would repeat the same bytes N times.
//
// The id is the CALLER'S (use Solid's `createUniqueId()`), because the caller
// is what writes the `url(#…)` reference. Colour is data: any SVG paint,
// `var(--sui-*)` tokens included.
// ============================================
import { type Component, mergeProps } from "solid-js";

export interface HatchPatternProps {
  /** The pattern's id — what `fill="url(#id)"` names. Unique per document. */
  readonly id: string;
  /** Stripe and ground colour, e.g. `var(--sui-warning)`. */
  readonly color: string;
  /** Stripe angle in degrees. Default 45. */
  readonly angle?: number;
  /** Stripe width in user units. Default 3. */
  readonly stripe?: number;
  /** Gap between stripes in user units. Default 4. */
  readonly gap?: number;
  /** Opacity of the ground behind the stripes. Default 0.12. */
  readonly groundOpacity?: number;
  /** Opacity of the stripes. Default 0.5. */
  readonly stripeOpacity?: number;
}

export type HatchPatternOverrides = Pick<
  HatchPatternProps,
  "angle" | "stripe" | "gap" | "groundOpacity" | "stripeOpacity"
>;
export type HatchPatternDataProps = Omit<
  HatchPatternProps,
  keyof HatchPatternOverrides
>;

export const HatchPattern: Component<HatchPatternProps> = (raw) => {
  const props = mergeProps(
    { angle: 45, stripe: 3, gap: 4, groundOpacity: 0.12, stripeOpacity: 0.5 },
    raw,
  );
  const tile = () => props.stripe + props.gap;
  return (
    <pattern
      id={props.id}
      class="sui-hatch-pattern"
      width={tile()}
      height={tile()}
      patternUnits="userSpaceOnUse"
      patternTransform={`rotate(${props.angle})`}
    >
      <rect
        width={tile()}
        height={tile()}
        fill={props.color}
        fill-opacity={props.groundOpacity}
      />
      <rect
        width={props.stripe}
        height={tile()}
        fill={props.color}
        fill-opacity={props.stripeOpacity}
      />
    </pattern>
  );
};

export function createHatchPattern(
  defaults: Partial<HatchPatternOverrides>,
): Component<HatchPatternDataProps> {
  return (props) => <HatchPattern {...mergeProps(defaults, props)} />;
}
