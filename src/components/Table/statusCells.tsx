/* Table cell renderers — status-style cells (Tag, Status, Checkbox). */
import { Component, Show } from "solid-js";
import { CellRendererProps } from "./cellStyle";

// ============================================
// Tag Renderer
// ============================================
export interface TagCellProps extends CellRendererProps<string | null | undefined> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
}

export const TagCell: Component<TagCellProps> = (props) => {
  const variant = () => props.variant || "default";

  return (
    <Show when={props.value != null && props.value !== ""} fallback={<span class="cell-empty">—</span>}>
      <span class={`cell-tag cell-tag--${variant()}`}>{props.value}</span>
    </Show>
  );
};

// ============================================
// Status Renderer
// ============================================
export interface StatusCellProps extends CellRendererProps<string | null | undefined> {
  statusMap?: Record<string, { label?: string; variant: "active" | "success" | "warning" | "error" | "inactive" | "pending" }>;
  href?: string;
}

const DEFAULT_STATUS_MAP: Record<string, { label?: string; variant: "active" | "success" | "warning" | "error" | "inactive" | "pending" }> = {
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
    <span class={`cell-status cell-status--${statusInfo()?.variant}`}>
      <span class="cell-status__indicator" />
      <span class="cell-status__label">{statusInfo()?.label || props.value}</span>
    </span>
  );

  return (
    <Show when={props.value != null && props.value !== ""} fallback={<span class="cell-empty">—</span>}>
      <Show when={props.href} fallback={inner()}>
        <a href={props.href} target="_blank" rel="noopener noreferrer" style={{ "text-decoration": "none" }}>
          {inner()}
        </a>
      </Show>
    </Show>
  );
};

// ============================================
// Checkbox Renderer
// ============================================
export interface CheckboxCellProps extends CellRendererProps<boolean | null | undefined> {
  onChange?: (value: boolean) => void;
  disabled?: boolean;
}

export const CheckboxCell: Component<CheckboxCellProps> = (props) => {
  return (
    <Show when={props.value != null} fallback={<span class="cell-empty">—</span>}>
      <label class="cell-checkbox">
        <input
          type="checkbox"
          checked={props.value || false}
          disabled={props.disabled}
          onChange={(e) => props.onChange?.(e.currentTarget.checked)}
        />
        <span class="cell-checkbox__indicator" />
      </label>
    </Show>
  );
};
