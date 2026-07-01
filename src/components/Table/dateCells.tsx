/* Table cell renderers — date/time cells (Date, DateTime, MinuteDateTime) plus
 * the shared date-formatting helpers. */
import { type Component, Show } from "solid-js";
import type { CellRendererProps } from "./cellStyle";

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

function formatDatePattern(
  date: Date,
  pattern: string,
  timeZone?: string,
): string {
  const parts = timeZone
    ? zonedDateParts(date, timeZone)
    : localDateParts(date);
  return formatDatePatternFromParts(parts, pattern);
}

/** Extract the short time-zone abbreviation (e.g. "PDT") via Intl.DateTimeFormat. */
function zoneAbbreviation(
  date: Date,
  timeZone: string | undefined,
  locale: string,
): string {
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
export interface DateCellProps
  extends CellRendererProps<string | Date | null | undefined> {
  /** Preset format or custom pattern string (e.g., "YYYY-MM-DD") */
  format?: "short" | "medium" | "long" | "iso" | string;
  locale?: string;
}

export const DateCell: Component<DateCellProps> = (props) => {
  const formatted = () => {
    if (props.value == null || props.value === "") return null;
    const date =
      typeof props.value === "string" ? new Date(props.value) : props.value;
    if (Number.isNaN(date.getTime())) return null;

    const format = props.format || "iso";

    // Handle ISO format (default)
    if (format === "iso") {
      return formatDatePattern(date, "YYYY-MM-DD");
    }

    // Handle custom pattern strings (contains YYYY, MM, DD, etc.)
    if (
      format.includes("YYYY") ||
      format.includes("MM") ||
      format.includes("DD")
    ) {
      return formatDatePattern(date, format);
    }

    // Handle preset formats
    const locale = props.locale || "en-US";
    const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
      short: { month: "numeric", day: "numeric", year: "2-digit" },
      medium: { month: "short", day: "numeric", year: "numeric" },
      long: { month: "long", day: "numeric", year: "numeric" },
    };

    return new Intl.DateTimeFormat(
      locale,
      formatOptions[format] || formatOptions.medium,
    ).format(date);
  };

  return (
    <Show
      when={formatted() != null}
      fallback={<span class="cell-empty">—</span>}
    >
      <span class="cell-date">{formatted()}</span>
    </Show>
  );
};

// ============================================
// DateTime Renderer
// ============================================
export interface DateTimeCellProps
  extends CellRendererProps<string | Date | null | undefined> {
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
    const date =
      typeof props.value === "string" ? new Date(props.value) : props.value;
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };

  const useCustomFormat = () => {
    const format = props.format || "iso";
    return (
      format === "iso" ||
      format.includes("YYYY") ||
      format.includes("MM") ||
      format.includes("DD")
    );
  };

  const suffix = (date: Date) => {
    if (!props.showZoneAbbreviation) return "";
    const abbr = zoneAbbreviation(
      date,
      props.timeZone,
      props.locale || "en-US",
    );
    return abbr ? ` (${abbr})` : "";
  };

  const formatted = () => {
    const date = getDate();
    if (!date) return null;

    const format = props.format || "iso";

    // Handle ISO format (default)
    if (format === "iso") {
      const pattern =
        props.showSeconds !== false
          ? "YYYY-MM-DD HH:mm:ss"
          : "YYYY-MM-DD HH:mm";
      return formatDatePattern(date, pattern, props.timeZone) + suffix(date);
    }

    // Handle custom pattern strings
    if (
      format.includes("YYYY") ||
      format.includes("MM") ||
      format.includes("DD")
    ) {
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
    return (
      new Intl.DateTimeFormat(props.locale || "en-US", {
        hour: "numeric",
        minute: "2-digit",
        ...(props.showSeconds && { second: "2-digit" }),
        ...(props.timeZone && { timeZone: props.timeZone }),
      }).format(date) + suffix(date)
    );
  };

  const emptyClass = () =>
    props.emptyVariant === "plain"
      ? "cell-empty cell-empty--plain"
      : "cell-empty";

  return (
    <Show
      when={getDate() != null}
      fallback={<span class={emptyClass()}>—</span>}
    >
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
export interface MinuteDateTimeCellProps
  extends CellRendererProps<string | Date | null | undefined> {
  locale?: string;
}

/** Convenience cell for minute-level timestamps: YYYY-MM-DD HH:mm */
export const MinuteDateTimeCell: Component<MinuteDateTimeCellProps> = (
  props,
) => {
  const formatted = () => {
    if (props.value == null || props.value === "") return null;
    const date =
      typeof props.value === "string" ? new Date(props.value) : props.value;
    if (Number.isNaN(date.getTime())) return null;
    return formatDatePattern(date, "YYYY-MM-DD HH:mm");
  };

  return (
    <Show
      when={formatted() != null}
      fallback={<span class="cell-empty">—</span>}
    >
      <span class="cell-datetime cell-datetime--single">{formatted()}</span>
    </Show>
  );
};
