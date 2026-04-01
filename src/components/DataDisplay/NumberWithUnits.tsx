// ============================================
// NumberWithUnits — Depth 2 (zero CSS)
// Composes Text (curried: MonoValue + TextUnits).
// Monospace value paired with units label.
// ============================================
import { Component, splitProps } from "solid-js";
import { Text } from "../Text/Text";
import { TextUnits } from "../Text/variants";

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
    if (v == null) return "\u2014";
    if (typeof v === "number") {
      return local.precision != null ? v.toFixed(local.precision) : String(v);
    }
    return v;
  };

  return (
    <span style={{ display: "inline-flex", "align-items": "baseline", gap: "4px", "white-space": "nowrap" }}>
      <Text variant="value" color={local.color} style={{ "font-family": '"JetBrains Mono", "Fira Code", monospace' }}>{formatted()}</Text>
      <TextUnits>{local.units}</TextUnits>
    </span>
  );
};
