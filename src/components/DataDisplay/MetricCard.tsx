// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// MetricCard — Atomic Primitive (Depth 1)
// Tags: shows:card, shows:number, shows:text, does:view, data:scalar, role:row
// Owns CSS (MetricCard.css), no library Primitive imports.
// Labeled value card with optional units and color-tinted value text.
// When `units` is supplied the value uses the same monospace face as
// the sibling `NumberWithUnits` Primitive so numeric readouts line up.
// `size="lg"` sets the value at 2.5rem for a page's headline figure;
// `size="xl"` grows the label, value and padding too, for a full-screen view.
// ============================================
import { type Component, type JSX, Show, splitProps } from "solid-js";
import "./MetricCard.css";

export type MetricCardColor = "default" | "success" | "warning" | "danger";
export type MetricCardSize = "md" | "lg" | "xl";

export interface MetricCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  units?: string;
  color?: MetricCardColor;
  /**
   * Value size. Default `md` (1.5rem). `lg` is 2.5rem, for a page's headline
   * figure. `xl` is for a card read from across a room (a full-screen panel):
   * the label grows as well as the value (1rem label, 4rem value).
   */
  size?: MetricCardSize;
}

export const MetricCard: Component<MetricCardProps> = (props) => {
  const [local, others] = splitProps(props, [
    "label",
    "value",
    "units",
    "color",
    "size",
    "class",
    "children",
  ]);

  const rootClass = () => {
    const classList = ["sui-metric-card"];
    if (local.color && local.color !== "default") {
      classList.push(`sui-metric-card--${local.color}`);
    }
    if (local.size === "lg" || local.size === "xl") {
      classList.push(`sui-metric-card--${local.size}`);
    }
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const valueClass = () =>
    local.units
      ? "sui-metric-card__value sui-metric-card__value--with-units"
      : "sui-metric-card__value";

  return (
    <div class={rootClass()} {...others}>
      <div class="sui-metric-card__label">{local.label}</div>
      <div class={valueClass()}>
        {local.value}
        <Show when={local.units}>
          <span class="sui-metric-card__value-units">{local.units}</span>
        </Show>
      </div>
      {local.children}
    </div>
  );
};
