// ============================================
// ChangeRenderer — Pure Composite (Depth 2)
// Composes DiffPair (Depth 1) + two ValueRenderer (Depth 1) instances.
// Owns no CSS — all layout coordination lives in DiffPair.
//
// Before/after pair display with a directional arrow. Both sides dispatch
// through `ValueRenderer`, so any `renderValue` override applies to both
// sides and honors nested object rendering consistently.
// ============================================
import { type Component, type JSX } from "solid-js";
import { ValueRenderer, type RenderValueFn } from "../ValueRenderer";
import { DiffPair } from "../DiffPair";

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

/**
 * `ChangeRenderer` — before/after pair display composed from two
 * `ValueRenderer` instances (one per side) plus a `DiffPair` for the
 * labeled-grid + flex-pair layout.
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
export const ChangeRenderer: Component<ChangeRendererProps> = (props) => (
  <DiffPair
    label={props.label}
    class={props.class}
    arrow={props.arrow}
    before={
      <ValueRenderer
        value={props.before}
        renderValue={props.renderValue}
        numberPrecision={props.numberPrecision}
      />
    }
    after={
      <ValueRenderer
        value={props.after}
        renderValue={props.renderValue}
        numberPrecision={props.numberPrecision}
      />
    }
  />
);
