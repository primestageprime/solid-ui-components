// ============================================
// ResultDisplay — Atomic Primitive (Depth 1)
// Owns CSS (ResultDisplay.css), no library Primitive imports.
// Header (label + sublabel) over a value+units row with optional
// badge slot and trailing children area. Data-driven `valueColor`
// flows as inline style on the value span (allowed inside a
// Primitive per CONTEXT.md — the Primitive owns the styling rule).
// ============================================
import { Component, JSX, Show, splitProps } from "solid-js";
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

  const rootClass = () => local.class ?? undefined;

  const valueClass = () =>
    local.units
      ? "sui-result-display__value sui-result-display__value--with-units"
      : "sui-result-display__value";

  return (
    <div class={rootClass()} {...others}>
      <Show when={local.label || local.sublabel}>
        <div class="sui-result-display__header">
          <Show when={local.label}>
            <h3 class="sui-result-display__label">{local.label}</h3>
          </Show>
          <Show when={local.sublabel}>
            <span class="sui-result-display__sublabel">{local.sublabel}</span>
          </Show>
        </div>
      </Show>
      <div class="sui-result-display__row">
        <span
          class={valueClass()}
          style={local.valueColor ? { color: local.valueColor } : undefined}
        >
          {local.value}
          <Show when={local.units}>
            <span class="sui-result-display__value-units">{local.units}</span>
          </Show>
        </span>
        {local.badge}
      </div>
      {local.children}
    </div>
  );
};
