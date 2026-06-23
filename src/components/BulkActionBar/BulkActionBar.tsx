// ============================================
// BulkActionBar — Composite (Depth 2)
// Composes CountChip + Button (PrimaryButton / GhostButton).
// Owns a minimal structural CSS file (sticky bottom strip / centering /
// elevation) — a deliberate exception to "Depth 2 = zero CSS" because the
// stick-to-bottom-of-the-scroll-area geometry is structural and not
// expressible as a variant of an underlying atomic (same rationale as Fab).
//
// A multi-select action strip: a count chip ("N cell") on the left, a primary
// action button on the right ("Align to baseline"), and an optional Clear
// ghost button. Render it gated behind a <Show when={count > 0}> — it has no
// internal visibility logic. The host scroll/grid container needs
// `position: relative` so the bar sticks to its bottom edge.
//
// Zero-config call site: pass only data + callbacks. The verb, the noun, and
// all visual decisions are the consumer's data, never presentational config.
// ============================================
import { Component, JSX, Show, splitProps } from "solid-js";
import { CountChip } from "../Badge";
import { PrimaryButton, GhostButton } from "../Button";
import "./BulkActionBar.css";

export interface BulkActionBarProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onClick"> {
  /** How many items are selected. Drives the count chip. */
  count: number;
  /** Singular noun for the selected items, e.g. "cell". Pluralized with a
   *  trailing "s" when count !== 1. */
  noun: string;
  /** Label on the primary action button, e.g. "Align to baseline". */
  actionLabel: string;
  /** Fired when the primary action button is pressed. */
  onAction: () => void;
  /** Optional clear-selection handler. When provided, a "Clear" ghost button
   *  renders to the right of the action. */
  onClear?: () => void;
  /** Disable the primary action (e.g. while a bulk op is in flight). */
  disabled?: boolean;
}

export const BulkActionBar: Component<BulkActionBarProps> = (props) => {
  const [local, others] = splitProps(props, [
    "count",
    "noun",
    "actionLabel",
    "onAction",
    "onClear",
    "disabled",
    "class",
  ]);
  const label = () => (local.count === 1 ? local.noun : `${local.noun}s`);
  const cls = () =>
    local.class ? `sui-bulk-action-bar ${local.class}` : "sui-bulk-action-bar";
  return (
    <div class={cls()} role="toolbar" {...others}>
      <CountChip count={local.count} label={label()} active />
      <div class="sui-bulk-action-bar__actions">
        <PrimaryButton onClick={() => local.onAction()} disabled={local.disabled}>
          {local.actionLabel}
        </PrimaryButton>
        <Show when={local.onClear}>
          <GhostButton onClick={() => local.onClear?.()}>Clear</GhostButton>
        </Show>
      </div>
    </div>
  );
};
