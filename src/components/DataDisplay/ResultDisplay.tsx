// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ResultDisplay — Atomic Primitive (Depth 1)
// Header (label + sublabel) over a value+units row with optional badge
// slot. Data-driven `valueColor` flows as inline style on the value span
// — the Primitive owns the styling rule. The `highlightable`/`highlighted`
// pair are the hover-target affordance that FormulaDecomposition used to
// supply via a wrapping div: opting into `highlightable` adds the hover-
// target chrome (cursor + padding + transition); `highlighted` paints the
// active tint.
// ============================================
import { type Component, type JSX, Show, splitProps } from "solid-js";
import "./ResultDisplay.css";

export interface ResultDisplayProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: string | number | JSX.Element;
  units?: string;
  label?: string;
  sublabel?: string;
  badge?: JSX.Element;
  valueColor?: string;
  /** Opt into the hover-target chrome (cursor / padding / transition).
   *  Use when the ResultDisplay is part of a hover-coordinated set (e.g.
   *  a formula-variable-linked result). */
  highlightable?: boolean;
  /** When true (and `highlightable`), paints the active highlight tint. */
  highlighted?: boolean;
}

export const ResultDisplay: Component<ResultDisplayProps> = (props) => {
  const [local, others] = splitProps(props, [
    "value",
    "units",
    "label",
    "sublabel",
    "badge",
    "valueColor",
    "highlightable",
    "highlighted",
    "class",
    "children",
  ]);

  const rootClass = () => {
    const classList = ["sui-result-display"];
    if (local.highlightable)
      classList.push("sui-result-display--highlightable");
    if (local.highlighted) classList.push("sui-result-display--highlighted");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

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
