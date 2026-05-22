// ============================================
// NumberWithUnits — Atomic Primitive (Depth 1)
// Owns CSS (NumberWithUnits.css), no library Primitive imports.
// Monospace value paired with a faded units label, baseline-aligned
// on a single line. Data-driven `color` flows as an inline style on
// the value span — allowed inside a Primitive per CONTEXT.md (the
// Primitive owns the styling rule; this is the "truly dynamic
// per-instance value" carve-out).
// ============================================
import { Component, splitProps } from "solid-js";
import "./NumberWithUnits.css";

export interface NumberWithUnitsProps {
  value: number | string | null | undefined;
  units: string;
  precision?: number;
  color?: string;
}

export const NumberWithUnits: Component<NumberWithUnitsProps> = (props) => {
  const [local] = splitProps(props, ["value", "units", "precision", "color"]);

  const formatted = () => {
    const v = local.value;
    if (v == null) return "—";
    if (typeof v === "number") {
      return local.precision != null ? v.toFixed(local.precision) : String(v);
    }
    return v;
  };

  return (
    <span class="sui-num-with-units">
      <span
        class="sui-num-with-units__value"
        style={local.color ? { color: local.color } : undefined}
      >
        {formatted()}
      </span>
      <span class="sui-num-with-units__units">{local.units}</span>
    </span>
  );
};
