// ============================================
// ScenarioDot — Atomic (Depth 1)
// Owns CSS (ScenarioDot.css), no component imports.
// A tiny circular scenario-identity marker: colour = the scenario's accent
// (given by the consumer), so a scenario is recognisable by the same colour on
// its chip, its chart line, and its config membership icons. `filled` picks the
// shape: a solid disc marks the SELECTED scenario; a hollow ring marks an
// unselected one — both the same outer diameter (border-box).
// A sibling of BaselineDot, which is the fixed-blue special case of this.
// ============================================
import { type Component, type JSX, splitProps } from "solid-js";
import "./ScenarioDot.css";

export interface ScenarioDotProps
  extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** The scenario's accent colour (any CSS colour). */
  color: string;
  /** Solid disc when true (the selected scenario); hollow ring when false or
   *  omitted (an unselected scenario). */
  filled?: boolean;
  /** Outer diameter in px (default 8). */
  size?: number;
}

export const ScenarioDot: Component<ScenarioDotProps> = (props) => {
  const [local, others] = splitProps(props, [
    "color",
    "filled",
    "size",
    "class",
    "style",
  ]);
  const diameter = () => `${local.size ?? 8}px`;
  const overrides = () =>
    local.style && typeof local.style === "object" ? local.style : {};
  return (
    <span
      class={`scenario-dot${local.class ? ` ${local.class}` : ""}`}
      style={{
        width: diameter(),
        height: diameter(),
        // Hollow rings need a visible stroke; filled discs read the same width.
        "border-width": "1.5px",
        "border-color": local.color,
        background: local.filled ? local.color : "transparent",
        ...overrides(),
      }}
      {...others}
    />
  );
};
