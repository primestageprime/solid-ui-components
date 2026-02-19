// ============================================
// MetricCard — Depth 3
// Owns CSS (MetricCard.css).
// Composes NumberWithUnits (Depth 2).
// Labeled value card with status color variants.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import { NumberWithUnits } from "./NumberWithUnits";
import "./MetricCard.css";

export type MetricCardColor = "default" | "success" | "warning" | "danger";

export interface MetricCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  units?: string;
  color?: MetricCardColor;
}

export const MetricCard: Component<MetricCardProps> = (props) => {
  const [local, others] = splitProps(props, [
    "label",
    "value",
    "units",
    "color",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["metric-card"];
    if (local.color) classList.push(`metric-card--${local.color}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} {...others}>
      <div class="metric-card__label">{local.label}</div>
      <div class="metric-card__value">
        {local.units ? (
          <NumberWithUnits value={local.value} units={local.units} />
        ) : (
          local.value
        )}
      </div>
      {local.children}
    </div>
  );
};
