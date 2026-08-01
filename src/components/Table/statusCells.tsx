/* Status-style value renderers (Tag, Status, Checkbox). Container-agnostic —
 * render equally in a table cell, a definition-list <dd>, or a card slot; each
 * owns its styling via the co-located CSS below. */
import { type Component, Show } from "solid-js";
import type { CellRendererProps } from "./cellStyle";
import "./statusCells.css";
import "./cellEmpty.css";

// ============================================
// Tag Renderer
// ============================================
export interface TagCellProps
  extends CellRendererProps<string | null | undefined> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
}

export const TagCell: Component<TagCellProps> = (props) => {
  const variant = () => props.variant || "default";

  return (
    <Show
      when={props.value != null && props.value !== ""}
      fallback={<span class="sui-value-empty">—</span>}
    >
      <span class={`sui-value-tag sui-value-tag--${variant()}`}>{props.value}</span>
    </Show>
  );
};

// ============================================
// Status Renderer
// ============================================
export interface StatusCellProps
  extends CellRendererProps<string | null | undefined> {
  statusMap?: Record<
    string,
    {
      label?: string;
      variant:
        | "active"
        | "success"
        | "warning"
        | "error"
        | "inactive"
        | "pending";
    }
  >;
  href?: string;
}

const DEFAULT_STATUS_MAP: Record<
  string,
  {
    label?: string;
    variant:
      | "active"
      | "success"
      | "warning"
      | "error"
      | "inactive"
      | "pending";
  }
> = {
  active: { variant: "active" },
  online: { variant: "active" },
  running: { variant: "active" },
  submitted: { variant: "active" },
  success: { variant: "success" },
  complete: { variant: "success" },
  completed: { variant: "success" },
  done: { variant: "success" },
  warning: { variant: "warning" },
  pending: { variant: "pending" },
  queued: { variant: "pending" },
  waiting: { variant: "pending" },
  error: { variant: "error" },
  failed: { variant: "error" },
  failure: { variant: "error" },
  offline: { variant: "inactive" },
  inactive: { variant: "inactive" },
  disabled: { variant: "inactive" },
  draft: { variant: "inactive" },
  published: { variant: "success" },
};

export const StatusCell: Component<StatusCellProps> = (props) => {
  const statusInfo = () => {
    if (props.value == null || props.value === "") return null;
    const map = props.statusMap || DEFAULT_STATUS_MAP;
    const key = props.value.toLowerCase();
    return map[key] || { variant: "inactive" as const };
  };

  const inner = () => (
    <span class={`sui-value-status sui-value-status--${statusInfo()?.variant}`}>
      <span class="sui-value-status__indicator" />
      <span class="sui-value-status__label">
        {statusInfo()?.label || props.value}
      </span>
    </span>
  );

  return (
    <Show
      when={props.value != null && props.value !== ""}
      fallback={<span class="sui-value-empty">—</span>}
    >
      <Show when={props.href} fallback={inner()}>
        <a
          class="sui-value-status__link"
          href={props.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {inner()}
        </a>
      </Show>
    </Show>
  );
};

// ============================================
// Checkbox Renderer
// ============================================
export interface CheckboxCellProps
  extends CellRendererProps<boolean | null | undefined> {
  onChange?: (value: boolean) => void;
  disabled?: boolean;
}

export const CheckboxCell: Component<CheckboxCellProps> = (props) => {
  return (
    <Show
      when={props.value != null}
      fallback={<span class="sui-value-empty">—</span>}
    >
      <label class="sui-value-checkbox">
        <input
          type="checkbox"
          checked={props.value || false}
          disabled={props.disabled}
          onChange={(e) => props.onChange?.(e.currentTarget.checked)}
        />
        <span class="sui-value-checkbox__indicator" />
      </label>
    </Show>
  );
};
