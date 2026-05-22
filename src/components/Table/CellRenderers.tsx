// ============================================
// CellRenderers — Atomic (Depth 1)
// Owns CSS (CellRenderers.css), no component imports.
// Typed cell renderers for tables: dates, numbers,
// status, tags, durations, styled factories.
// ============================================
import { Component, Show, createSignal, createEffect, on, onMount, onCleanup, JSX } from "solid-js";
import { Tooltip } from "../Tooltip";
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
// Date Format Helpers
// ============================================
const pad2 = (n: number) => n.toString().padStart(2, "0");

interface DateParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

/** Host-local date parts using native Date getters. Preserves pre-TZ behavior. */
function localDateParts(date: Date): DateParts {
  return {
    year: date.getFullYear().toString(),
    month: pad2(date.getMonth() + 1),
    day: pad2(date.getDate()),
    hour: pad2(date.getHours()),
    minute: pad2(date.getMinutes()),
    second: pad2(date.getSeconds()),
  };
}

/**
 * Zoned date parts extracted via Intl.DateTimeFormat.formatToParts.
 *
 * Locale is pinned to "en-US" because we only consume the integer part values
 * and re-assemble them via the user's pattern template (e.g. "YYYY-MM-DD").
 * Using the consumer's locale here would leak locale-specific digit shapes
 * (Arabic-Indic, Devanagari, etc.) into strings that the pattern consumer
 * expects to be Western Arabic digits. The user-supplied `locale` is applied
 * where it actually matters: in `zoneAbbreviation()` and the Intl-named-format
 * path inside `DateTimeCell`.
 */
function zonedDateParts(date: Date, timeZone: string): DateParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  // en-US 24h can emit "24" for midnight — normalize to "00" for stable output.
  const hourRaw = pick("hour");
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: hourRaw === "24" ? "00" : hourRaw,
    minute: pick("minute"),
    second: pick("second"),
  };
}

function formatDatePatternFromParts(parts: DateParts, pattern: string): string {
  return pattern
    .replace("YYYY", parts.year)
    .replace("MM", parts.month)
    .replace("DD", parts.day)
    .replace("HH", parts.hour)
    .replace("mm", parts.minute)
    .replace("ss", parts.second);
}

function formatDatePattern(date: Date, pattern: string, timeZone?: string): string {
  const parts = timeZone ? zonedDateParts(date, timeZone) : localDateParts(date);
  return formatDatePatternFromParts(parts, pattern);
}

/** Extract the short time-zone abbreviation (e.g. "PDT") via Intl.DateTimeFormat. */
function zoneAbbreviation(date: Date, timeZone: string | undefined, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, {
    ...(timeZone ? { timeZone } : {}),
    timeZoneName: "short",
  });
  const parts = fmt.formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
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
  /**
   * IANA time-zone identifier (e.g. "America/Los_Angeles"). When set, the date is
   * formatted in that zone; when unset (default) the host system's local zone is
   * used — identical behavior to pre-0.12 versions.
   */
  timeZone?: string;
  /**
   * When true, append a short time-zone abbreviation (e.g. " (PDT)") to the
   * formatted output. Uses `Intl.DateTimeFormat({ timeZoneName: "short" })`.
   * Honors `timeZone` when provided. Default: `false` (no suffix — pre-0.12 behavior).
   */
  showZoneAbbreviation?: boolean;
  /**
   * Empty-state variant.
   * - `"default"` (default): italic em-dash, preserves pre-0.12 appearance.
   * - `"plain"`: non-italic em-dash — matches downstream `DateRenderer` styling.
   * Advanced consumers can also override `--cell-empty-font-style` on a wrapper
   * element to restyle the italic default globally.
   */
  emptyVariant?: "default" | "plain";
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

  const suffix = (date: Date) => {
    if (!props.showZoneAbbreviation) return "";
    const abbr = zoneAbbreviation(date, props.timeZone, props.locale || "en-US");
    return abbr ? ` (${abbr})` : "";
  };

  const formatted = () => {
    const date = getDate();
    if (!date) return null;

    const format = props.format || "iso";

    // Handle ISO format (default)
    if (format === "iso") {
      const pattern = props.showSeconds !== false ? "YYYY-MM-DD HH:mm:ss" : "YYYY-MM-DD HH:mm";
      return formatDatePattern(date, pattern, props.timeZone) + suffix(date);
    }

    // Handle custom pattern strings
    if (format.includes("YYYY") || format.includes("MM") || format.includes("DD")) {
      return formatDatePattern(date, format, props.timeZone) + suffix(date);
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
      ...(props.timeZone && { timeZone: props.timeZone }),
    };

    return new Intl.DateTimeFormat(locale, options).format(date) + suffix(date);
  };

  const dateStr = () => {
    const date = getDate();
    if (!date) return null;
    return new Intl.DateTimeFormat(props.locale || "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      ...(props.timeZone && { timeZone: props.timeZone }),
    }).format(date);
  };

  const timeStr = () => {
    const date = getDate();
    if (!date) return null;
    return new Intl.DateTimeFormat(props.locale || "en-US", {
      hour: "numeric",
      minute: "2-digit",
      ...(props.showSeconds && { second: "2-digit" }),
      ...(props.timeZone && { timeZone: props.timeZone }),
    }).format(date) + suffix(date);
  };

  const emptyClass = () =>
    props.emptyVariant === "plain" ? "cell-empty cell-empty--plain" : "cell-empty";

  return (
    <Show when={getDate() != null} fallback={<span class={emptyClass()}>—</span>}>
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
      ? (props.compliantColor ?? "var(--sui-accent)")
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
/**
 * Truncation reveal strategy.
 *
 * - `"inline"` (default) — preserves existing behavior: show an inline
 *   "more..." / "less" toggle button to expand/collapse within the cell.
 * - `"tooltip"` — show the full value on hover in a floating tooltip
 *   (composes the library's Kobalte-backed `Tooltip`, which handles
 *   viewport-aware positioning automatically).
 */
export type LongTextReveal = "inline" | "tooltip";

export interface LongTextCellProps extends CellRendererProps<string | null | undefined> {
  /**
   * Character-count truncation threshold. Applies only when `clampLines` is
   * not set. Defaults to 50.
   */
  maxLength?: number;
  /**
   * When `true` (default) the inline reveal button is interactive. Set to
   * `false` to disable expansion while still showing the truncated text
   * and "more..." affordance.
   */
  expandable?: boolean;
  /**
   * Line-count truncation via CSS `-webkit-line-clamp`. When set, overrides
   * `maxLength`: the full value is rendered and truncation is detected at
   * runtime by comparing `scrollHeight`/`scrollWidth` to client dimensions.
   * Use this when the available cell width is dynamic and char-count
   * truncation is too coarse.
   */
  clampLines?: number;
  /**
   * Reveal strategy for the full value when truncated. Defaults to
   * `"inline"` to preserve existing behavior.
   */
  reveal?: LongTextReveal;
  /** Preferred tooltip placement; Kobalte flips automatically when it would overflow. */
  tooltipPlacement?: "top" | "bottom" | "left" | "right";
}

export const LongTextCell: Component<LongTextCellProps> = (props) => {
  const [expanded, setExpanded] = createSignal(false);
  const [clampEl, setClampEl] = createSignal<HTMLSpanElement | undefined>();
  const [clampOverflow, setClampOverflow] = createSignal(false);

  const maxLen = () => props.maxLength || 50;
  const isClampMode = () => (props.clampLines ?? 0) > 0;
  const revealMode = (): LongTextReveal => props.reveal ?? "inline";

  // Char-count truncation (existing behavior).
  const isCharTruncated = () => {
    if (!props.value) return false;
    return props.value.length > maxLen();
  };

  // Combined truncation flag — char-count when clampLines unset, overflow
  // measurement when clampLines is set.
  const isTruncated = () => (isClampMode() ? clampOverflow() : isCharTruncated());

  // Display text: in clamp mode we always render the full value and let CSS
  // handle the visual truncation. In char-count mode we slice on truncation.
  const displayText = () => {
    if (!props.value) return null;
    if (isClampMode()) return props.value;
    if (expanded() || !isCharTruncated()) return props.value;
    return props.value.slice(0, maxLen());
  };

  // Overflow measurement for clamp mode. Runs on mount, after value/lines
  // changes, and on window resize. Kept cheap — single `getBoundingClientRect`
  // comparison is avoided in favour of intrinsic scroll vs. client metrics.
  const measureOverflow = () => {
    const el = clampEl();
    if (!el) return;
    const lines = props.clampLines ?? 0;
    if (lines <= 0) {
      setClampOverflow(false);
      return;
    }
    const overflowed = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    setClampOverflow(overflowed);
  };

  onMount(() => {
    if (!isClampMode()) return;
    measureOverflow();
    const onResize = () => measureOverflow();
    window.addEventListener("resize", onResize);
    onCleanup(() => window.removeEventListener("resize", onResize));
  });

  createEffect(
    on(
      () => [props.value, props.clampLines] as const,
      () => {
        // Re-measure when value or clampLines change. Defer to the next frame
        // so layout reflects the new text/styles.
        if (!isClampMode()) return;
        queueMicrotask(measureOverflow);
      },
    ),
  );

  const clampStyle = (): JSX.CSSProperties | undefined => {
    if (!isClampMode()) return undefined;
    return {
      display: "-webkit-box",
      "-webkit-box-orient": "vertical",
      "-webkit-line-clamp": String(props.clampLines),
      "line-clamp": String(props.clampLines),
      overflow: "hidden",
      "word-break": "break-word",
      "white-space": "normal",
    };
  };

  const renderText = () => (
    <span
      ref={setClampEl}
      class="cell-longtext__text"
      classList={{ "cell-longtext__text--clamped": isClampMode() }}
      style={clampStyle()}
    >
      {displayText()}
    </span>
  );

  return (
    <Show when={props.value != null && props.value !== ""} fallback={<span class="cell-empty">—</span>}>
      <Show
        when={revealMode() === "tooltip"}
        fallback={
          <span class="cell-longtext">
            {renderText()}
            <Show when={!isClampMode() && isTruncated() && !expanded()}>
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
            <Show when={!isClampMode() && expanded()}>
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
        }
      >
        <Show
          when={isTruncated()}
          fallback={<span class="cell-longtext">{renderText()}</span>}
        >
          <Tooltip
            content={() => props.value ?? ""}
            placement={props.tooltipPlacement ?? "top"}
            class="cell-longtext cell-longtext--tooltip"
          >
            {renderText()}
          </Tooltip>
        </Show>
      </Show>
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
