// ============================================
// ChangeRenderer — Depth 2 (Composite)
// Composes `ValueRenderer` (Depth 1) for the before/after sides.
// Owns CSS (ChangeRenderer.css).
//
// Before/after pair display with a directional arrow. Both sides dispatch
// through `ValueRenderer`, so any `renderValue` override applies to both
// sides and honors nested object rendering consistently.
// ============================================
import { type Component, type JSX, Show } from "solid-js";
import { ValueRenderer, type RenderValueFn } from "../ValueRenderer";
import "./ChangeRenderer.css";

export interface ChangeRendererProps {
  /** Optional label; renders `{label}: {before} → {after}` when supplied. */
  label?: string;
  /** The "before" value — dispatched via ValueRenderer. */
  before: unknown;
  /** The "after" value — dispatched via ValueRenderer. */
  after: unknown;
  /** Shared render override applied to both sides. */
  renderValue?: RenderValueFn;
  /** Decimal places for numeric values on both sides (default `2`). */
  numberPrecision?: number;
  /** Glyph used between before and after (default `→`). */
  arrow?: JSX.Element;
  /** Extra class on the outer container. */
  class?: string;
}

const DEFAULT_ARROW = "\u2192"; // →

/**
 * `ChangeRenderer` — before/after pair display composed from two
 * `ValueRenderer` instances (one per side) plus a directional arrow.
 *
 * @example
 *   // Simple primitive change
 *   <ChangeRenderer label="Count" before={12} after={15} />
 *
 *   // Object change
 *   <ChangeRenderer
 *     label="Context"
 *     before={{ temperature: 45, active: true }}
 *     after={{ temperature: 50, active: true }}
 *   />
 *
 *   // Shared domain dispatch
 *   <ChangeRenderer
 *     label="Status"
 *     before="NOMINAL"
 *     after="ALARM"
 *     renderValue={(v) =>
 *       typeof v === "string" && isStatus(v) ? <StatusBadge status={v} /> : undefined
 *     }
 *   />
 */
export const ChangeRenderer: Component<ChangeRendererProps> = (props) => {
  const containerClass = () =>
    ["sui-change", props.class].filter(Boolean).join(" ");

  const arrow = () => props.arrow ?? DEFAULT_ARROW;

  const pair = (
    <div class="sui-change__pair">
      <div class="sui-change__side sui-change__side--before">
        <ValueRenderer
          value={props.before}
          renderValue={props.renderValue}
          numberPrecision={props.numberPrecision}
        />
      </div>
      <span class="sui-change__arrow" aria-hidden="true">
        {arrow()}
      </span>
      <div class="sui-change__side sui-change__side--after">
        <ValueRenderer
          value={props.after}
          renderValue={props.renderValue}
          numberPrecision={props.numberPrecision}
        />
      </div>
    </div>
  );

  return (
    <Show
      when={props.label}
      fallback={<div class={containerClass()}>{pair}</div>}
    >
      <div class={`${containerClass()} sui-change--with-label`}>
        <span class="sui-change__label">{props.label}:</span>
        {pair}
      </div>
    </Show>
  );
};
