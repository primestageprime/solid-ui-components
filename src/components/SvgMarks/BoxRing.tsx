// ============================================
// BoxRing — Primitive (Depth 1). SVG mark; composes no library components.
// Owns SvgMarks.css (stroke width).
//
// A rounded outline standing just OFF the box it is handed — the "this one
// needs attention" ring around a bar or a cell. Colour is data (a paint or a
// `var(--sui-*)` token), so the same mark reads as danger, warning or focus.
// ============================================
import { type Component, mergeProps } from "solid-js";
import { type SvgBox, inflate } from "./geometry";
import "./SvgMarks.css";

export interface BoxRingProps {
  readonly box: SvgBox;
  /** Stroke paint, e.g. `var(--sui-danger)`. */
  readonly color: string;
  /** How far outside the box the ring stands, in user units. Default 3. */
  readonly offset?: number;
  /** Corner radius of the ring. Default 6. */
  readonly radius?: number;
}

export type BoxRingOverrides = Pick<BoxRingProps, "offset" | "radius">;
export type BoxRingDataProps = Omit<BoxRingProps, keyof BoxRingOverrides>;

export const BoxRing: Component<BoxRingProps> = (raw) => {
  const props = mergeProps({ offset: 3, radius: 6 }, raw);
  const ring = () => inflate(props.box, props.offset);
  return (
    <rect
      class="sui-box-ring"
      x={ring().x}
      y={ring().y}
      width={ring().width}
      height={ring().height}
      rx={props.radius}
      stroke={props.color}
    />
  );
};

export function createBoxRing(
  defaults: Partial<BoxRingOverrides>,
): Component<BoxRingDataProps> {
  return (props) => <BoxRing {...mergeProps(defaults, props)} />;
}
