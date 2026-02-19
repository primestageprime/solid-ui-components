// ============================================
// ResultDisplay — Depth 3
// Owns CSS (ResultDisplay.css).
// Composes NumberWithUnits (Depth 2).
// Large value + units row with label, sublabel, badge.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import { NumberWithUnits } from "./NumberWithUnits";
import "./ResultDisplay.css";

export interface ResultDisplayProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: string | number | JSX.Element;
  units?: string;
  label?: string;
  sublabel?: string;
  badge?: JSX.Element;
  valueColor?: string;
}

export const ResultDisplay: Component<ResultDisplayProps> = (props) => {
  const [local, others] = splitProps(props, [
    "value",
    "units",
    "label",
    "sublabel",
    "badge",
    "valueColor",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["result-display"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} {...others}>
      {(local.label || local.sublabel) && (
        <div class="result-display__header">
          {local.label && <h3 class="result-display__label">{local.label}</h3>}
          {local.sublabel && <span class="result-display__sublabel">{local.sublabel}</span>}
        </div>
      )}
      <div class="result-display__row">
        {local.units ? (
          <NumberWithUnits
            value={local.value as string | number}
            units={local.units}
            color={local.valueColor}
          />
        ) : (
          <span
            class="result-display__value"
            style={local.valueColor ? { color: local.valueColor } : undefined}
          >
            {local.value}
          </span>
        )}
        {local.badge}
      </div>
      {local.children}
    </div>
  );
};
