// ============================================
// CellRenderers — Atomic (Depth 1)
// Owns CSS (CellRenderers.css), no component imports.
// Typed cell renderers for tables: dates, numbers,
// status, tags, durations, styled factories.
// ============================================
import { Component, Show, createSignal, JSX } from "solid-js";
import "./CellRenderers.css";

// ============================================
// Cell Renderer Types
// ============================================

export interface CellRendererProps<T = unknown> {
  value: T;
  row?: unknown;
}

// ============================================
// Styled Cell Factory
// ============================================

/** Style options for curried cell renderers */
export interface CellStyleOptions {
  fontSize?: string;
  color?: string;
  fontWeight?: string | number;
  textAlign?: "left" | "center" | "right";
  className?: string;
}

/**
 * Factory to create a styled version of any cell renderer.
 * Preserves SolidJS reactivity - props flow through to the base component.
 *
 * @example
 * // Define styled variants once
 * const SmallDate = withCellStyle(DateCell, { fontSize: "0.75rem" });
 * const AccentFloat = withCellStyle(FloatCell, { color: "#00d4ff", textAlign: "right" });
 *
 * // Use in tables - updating the definition updates all usages
 * <SmallDate value={row.created_at} />
 * <AccentFloat value={row.amount} />
 */
export function withCellStyle<P extends CellRendererProps<unknown>>(
  BaseCell: Component<P>,
  styleOptions: CellStyleOptions
): Component<P> {
  return (props: P) => {
    const style: JSX.CSSProperties = {
      "font-size": styleOptions.fontSize,
      color: styleOptions.color,
      "font-weight": styleOptions.fontWeight,
      "text-align": styleOptions.textAlign,
    };

    return (
      <span style={style} class={styleOptions.className}>
        <BaseCell {...props} />
      </span>
    );
  };
}

/**
 * Factory to create a cell with dynamic coloring based on value.
 * The color function receives the value and returns a color string (or undefined for default).
 *
 * @example
 * // Color based on threshold
 * const NoxCell = withValueColor(FloatCell, (v) => v > 2.8 ? "#ff6b6b" : undefined, { textAlign: "right" });
 *
 * // Color based on ranges
 * const ScoreCell = withValueColor(IntCell, (v) => {
 *   if (v >= 90) return "#00ff88";  // green
 *   if (v >= 70) return "#ffaa00";  // yellow
 *   return "#ff6b6b";               // red
 * });
 */
export function withValueColor<V, P extends CellRendererProps<V>>(
  BaseCell: Component<P>,
  colorFn: (value: V) => string | undefined,
  baseStyles?: Omit<CellStyleOptions, "color">
): Component<P> {
  return (props: P) => {
    const color = () => colorFn(props.value);
    const style = (): JSX.CSSProperties => ({
      "font-size": baseStyles?.fontSize,
      color: color(),
      "font-weight": baseStyles?.fontWeight,
      "text-align": baseStyles?.textAlign,
    });

    return (
      <span style={style()} class={baseStyles?.className}>
        <BaseCell {...props} />
      </span>
    );
  };
}

// ============================================
// ID Renderer
// ============================================
export const IdCell: Component<CellRendererProps<string | number | null | undefined>> = (props) => {
  return (
    <Show when={props.value != null && props.value !== ""} fallback={<span class="cell-empty">—</span>}>
      <span class="cell-id">{props.value}</span>
    </Show>
  );
};

// ============================================
// String Renderer
// ============================================
export const StringCell: Component<CellRendererProps<string | null | undefined>> = (props) => {
  return (
    <Show when={props.value != null && props.value !== ""} fallback={<span class="cell-empty">—</span>}>
      <span class="cell-string">{props.value}</span>
    </Show>
  );
};

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
// Money Renderer
// ============================================
export interface MoneyCellProps extends CellRendererProps<number | null | undefined> {
  currency?: string;
  locale?: string;
}

export const MoneyCell: Component<MoneyCellProps> = (props) => {
  const formatted = () => {
    if (props.value == null) return null;
    const currency = props.currency || "USD";
    const locale = props.locale || "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(props.value);
  };

  return (
    <Show when={formatted() != null} fallback={<span class="cell-empty">—</span>}>
      <span class="cell-money">{formatted()}</span>
    </Show>
  );
};

// ============================================
// Date Format Helper
// ============================================
function formatDatePattern(date: Date, pattern: string): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return pattern
    .replace("YYYY", date.getFullYear().toString())
    .replace("MM", pad(date.getMonth() + 1))
    .replace("DD", pad(date.getDate()))
    .replace("HH", pad(date.getHours()))
    .replace("mm", pad(date.getMinutes()))
    .replace("ss", pad(date.getSeconds()));
}

// ============================================
// Date Renderer
// ============================================
export interface DateCellProps extends CellRendererProps<string | Date | null | undefined> {
  /** Preset format or custom pattern string (e.g., "YYYY-MM-DD") */
  format?: "short" | "medium" | "long" | "iso" | string;
  locale?: string;
}

export const DateCell: Component<DateCellProps> = (props) => {
  const formatted = () => {
    if (props.value == null || props.value === "") return null;
    const date = typeof props.value === "string" ? new Date(props.value) : props.value;
    if (isNaN(date.getTime())) return null;

    const format = props.format || "iso";

    // Handle ISO format (default)
    if (format === "iso") {
      return formatDatePattern(date, "YYYY-MM-DD");
    }

    // Handle custom pattern strings (contains YYYY, MM, DD, etc.)
    if (format.includes("YYYY") || format.includes("MM") || format.includes("DD")) {
      return formatDatePattern(date, format);
    }

    // Handle preset formats
    const locale = props.locale || "en-US";
    const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
      short: { month: "numeric", day: "numeric", year: "2-digit" },
      medium: { month: "short", day: "numeric", year: "numeric" },
      long: { month: "long", day: "numeric", year: "numeric" },
    };

    return new Intl.DateTimeFormat(locale, formatOptions[format] || formatOptions.medium).format(date);
  };

  return (
    <Show when={formatted() != null} fallback={<span class="cell-empty">—</span>}>
      <span class="cell-date">{formatted()}</span>
    </Show>
  );
};

// ============================================
// DateTime Renderer
// ============================================
export interface DateTimeCellProps extends CellRendererProps<string | Date | null | undefined> {
  /** Custom format pattern (e.g., "YYYY-MM-DD HH:mm:ss") or use showSeconds for Intl format */
  format?: "iso" | string;
  showSeconds?: boolean;
  locale?: string;
}

export const DateTimeCell: Component<DateTimeCellProps> = (props) => {
  const getDate = () => {
    if (props.value == null || props.value === "") return null;
    const date = typeof props.value === "string" ? new Date(props.value) : props.value;
    if (isNaN(date.getTime())) return null;
    return date;
  };

  const useCustomFormat = () => {
    const format = props.format || "iso";
    return format === "iso" || format.includes("YYYY") || format.includes("MM") || format.includes("DD");
  };

  const formatted = () => {
    const date = getDate();
    if (!date) return null;

    const format = props.format || "iso";

    // Handle ISO format (default)
    if (format === "iso") {
      const pattern = props.showSeconds !== false ? "YYYY-MM-DD HH:mm:ss" : "YYYY-MM-DD HH:mm";
      return formatDatePattern(date, pattern);
    }

    // Handle custom pattern strings
    if (format.includes("YYYY") || format.includes("MM") || format.includes("DD")) {
      return formatDatePattern(date, format);
    }

    // Use Intl format (legacy behavior for named formats)
    const locale = props.locale || "en-US";
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      ...(props.showSeconds && { second: "2-digit" }),
    };

    return new Intl.DateTimeFormat(locale, options).format(date);
  };

  const dateStr = () => {
    const date = getDate();
    if (!date) return null;
    return new Intl.DateTimeFormat(props.locale || "en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
  };

  const timeStr = () => {
    const date = getDate();
    if (!date) return null;
    return new Intl.DateTimeFormat(props.locale || "en-US", {
      hour: "numeric",
      minute: "2-digit",
      ...(props.showSeconds && { second: "2-digit" }),
    }).format(date);
  };

  return (
    <Show when={getDate() != null} fallback={<span class="cell-empty">—</span>}>
      <Show
        when={useCustomFormat()}
        fallback={
          <span class="cell-datetime">
            <span class="cell-datetime__date">{dateStr()}</span>
            <span class="cell-datetime__time">{timeStr()}</span>
          </span>
        }
      >
        <span class="cell-datetime cell-datetime--single">{formatted()}</span>
      </Show>
    </Show>
  );
};

// ============================================
// MinuteDateTime Renderer (YYYY-MM-DD HH:mm)
// ============================================
export interface MinuteDateTimeCellProps extends CellRendererProps<string | Date | null | undefined> {
  locale?: string;
}

/** Convenience cell for minute-level timestamps: YYYY-MM-DD HH:mm */
export const MinuteDateTimeCell: Component<MinuteDateTimeCellProps> = (props) => {
  const formatted = () => {
    if (props.value == null || props.value === "") return null;
    const date = typeof props.value === "string" ? new Date(props.value) : props.value;
    if (isNaN(date.getTime())) return null;
    return formatDatePattern(date, "YYYY-MM-DD HH:mm");
  };

  return (
    <Show when={formatted() != null} fallback={<span class="cell-empty">—</span>}>
      <span class="cell-datetime cell-datetime--single">{formatted()}</span>
    </Show>
  );
};

// ============================================
// Duration Renderer
// ============================================
export interface DurationCellProps extends CellRendererProps<number | null | undefined> {
  /** Input unit: 'ms', 's', 'm', 'h' (default: 's') */
  unit?: "ms" | "s" | "m" | "h";
}

export const DurationCell: Component<DurationCellProps> = (props) => {
  const formatted = () => {
    if (props.value == null) return null;

    // Convert to seconds
    let seconds = props.value;
    switch (props.unit || "s") {
      case "ms": seconds = props.value / 1000; break;
      case "m": seconds = props.value * 60; break;
      case "h": seconds = props.value * 3600; break;
    }

    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
  };

  return (
    <Show when={formatted() != null} fallback={<span class="cell-empty">—</span>}>
      <span class="cell-duration">{formatted()}</span>
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

// ============================================
// Float Renderer
// ============================================
export interface FloatCellProps extends CellRendererProps<number | null | undefined> {
  precision?: number;
  locale?: string;
}

export const FloatCell: Component<FloatCellProps> = (props) => {
  const formatted = () => {
    if (props.value == null) return null;
    const precision = props.precision ?? 2;
    const locale = props.locale || "en-US";
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(props.value);
  };

  return (
    <Show when={formatted() != null} fallback={<span class="cell-empty">—</span>}>
      <span class="cell-float">{formatted()}</span>
    </Show>
  );
};

// ============================================
// Int Renderer
// ============================================
export interface IntCellProps extends CellRendererProps<number | null | undefined> {
  locale?: string;
}

export const IntCell: Component<IntCellProps> = (props) => {
  const formatted = () => {
    if (props.value == null) return null;
    const locale = props.locale || "en-US";
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(Math.round(props.value));
  };

  return (
    <Show when={formatted() != null} fallback={<span class="cell-empty">—</span>}>
      <span class="cell-int">{formatted()}</span>
    </Show>
  );
};

// ============================================
// Metric Value Renderer (compliance-colored number)
// ============================================
export interface MetricValueCellProps extends CellRendererProps<number | null | undefined> {
  /** Whether the value is compliant — drives color */
  compliant?: boolean | null;
  /** Number precision via toPrecision() (default: 4) */
  precision?: number;
  /** Color when compliant (default: #00d4ff) */
  compliantColor?: string;
  /** Color when non-compliant (default: #ff0040) */
  violationColor?: string;
}

export const MetricValueCell: Component<MetricValueCellProps> = (props) => {
  const formatted = () => {
    if (props.value == null) return null;
    return props.value.toPrecision(props.precision ?? 4);
  };

  const color = () => {
    if (props.compliant == null) return undefined;
    return props.compliant
      ? (props.compliantColor ?? "#00d4ff")
      : (props.violationColor ?? "#ff0040");
  };

  return (
    <Show when={formatted() != null} fallback={<span class="cell-empty">—</span>}>
      <span class="cell-metric-value" style={{ color: color() }}>{formatted()}</span>
    </Show>
  );
};

// ============================================
// Long Text Renderer (with "more..." truncation)
// ============================================
export interface LongTextCellProps extends CellRendererProps<string | null | undefined> {
  maxLength?: number;
  expandable?: boolean;
}

export const LongTextCell: Component<LongTextCellProps> = (props) => {
  const [expanded, setExpanded] = createSignal(false);
  const maxLen = () => props.maxLength || 50;

  const isTruncated = () => {
    if (!props.value) return false;
    return props.value.length > maxLen();
  };

  const displayText = () => {
    if (!props.value) return null;
    if (expanded() || !isTruncated()) return props.value;
    return props.value.slice(0, maxLen());
  };

  return (
    <Show when={props.value != null && props.value !== ""} fallback={<span class="cell-empty">—</span>}>
      <span class="cell-longtext">
        <span class="cell-longtext__text">{displayText()}</span>
        <Show when={isTruncated() && !expanded()}>
          <button
            class="cell-longtext__more"
            onClick={(e) => {
              e.stopPropagation();
              if (props.expandable !== false) setExpanded(true);
            }}
          >
            more...
          </button>
        </Show>
        <Show when={expanded()}>
          <button
            class="cell-longtext__less"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
          >
            less
          </button>
        </Show>
      </span>
    </Show>
  );
};

// ============================================
// Helper to create cell renderer for column
// ============================================
export function createCellRenderer<T, V>(
  Component: Component<CellRendererProps<V>>,
  accessor: keyof T | ((row: T) => V),
  extraProps?: Partial<CellRendererProps<V>>
): (row: T) => JSX.Element {
  return (row: T) => {
    const value = typeof accessor === "function"
      ? accessor(row)
      : row[accessor] as V;
    return <Component value={value} row={row} {...extraProps} />;
  };
}
