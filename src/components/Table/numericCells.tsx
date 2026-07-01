/* Table cell renderers — numeric cells (Money, Duration, Float, Int, MetricValue). */
import { type Component, Show } from "solid-js";
import {
  CURRENCY_DEFAULT_MAX,
  currencyMaxChars,
  fieldWidthForChars,
} from "../../internal/fieldWidth/fieldWidth";
import type { CellRendererProps } from "./cellStyle";

// ============================================
// Money Renderer
// ============================================
export interface MoneyCellProps
  extends CellRendererProps<number | null | undefined> {
  currency?: string;
  locale?: string;
  /**
   * Largest value this column is expected to hold. Caps the cell's width to
   * the rendered width of that magnitude (via the shared `fieldWidthForChars`
   * rule) so a money column reserves no more than its widest value needs.
   * Default `$10,000,000,000` (ten billion); pass a smaller ceiling for
   * tighter columns, or `null` to opt out of the width cap.
   */
  maxValue?: number | null;
}

/** Width cap (rem) for a money cell holding up to `maxValue`. No stepper
 *  chrome here (display only), just the right-padding the cell paints. */
function moneyCellWidthRem(maxValue: number): number {
  return fieldWidthForChars(currencyMaxChars(maxValue), 0.5);
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

  // Same width discipline as CurrencyInput: tabular figures + a cap derived
  // from the widest formatted value (unless explicitly opted out with null).
  const maxRem = () => {
    const cap =
      props.maxValue === undefined ? CURRENCY_DEFAULT_MAX : props.maxValue;
    return cap == null ? undefined : `${moneyCellWidthRem(cap)}rem`;
  };

  return (
    <Show
      when={formatted() != null}
      fallback={<span class="cell-empty">—</span>}
    >
      <span class="cell-money" style={{ "max-width": maxRem() }}>
        {formatted()}
      </span>
    </Show>
  );
};

// ============================================
// Duration Renderer
// ============================================
export interface DurationCellProps
  extends CellRendererProps<number | null | undefined> {
  /** Input unit: 'ms', 's', 'm', 'h' (default: 's') */
  unit?: "ms" | "s" | "m" | "h";
}

export const DurationCell: Component<DurationCellProps> = (props) => {
  const formatted = () => {
    if (props.value == null) return null;

    // Convert to seconds
    let seconds = props.value;
    switch (props.unit || "s") {
      case "ms":
        seconds = props.value / 1000;
        break;
      case "m":
        seconds = props.value * 60;
        break;
      case "h":
        seconds = props.value * 3600;
        break;
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
    <Show
      when={formatted() != null}
      fallback={<span class="cell-empty">—</span>}
    >
      <span class="cell-duration">{formatted()}</span>
    </Show>
  );
};

// ============================================
// Float Renderer
// ============================================
export interface FloatCellProps
  extends CellRendererProps<number | null | undefined> {
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
    <Show
      when={formatted() != null}
      fallback={<span class="cell-empty">—</span>}
    >
      <span class="cell-float">{formatted()}</span>
    </Show>
  );
};

// ============================================
// Int Renderer
// ============================================
export interface IntCellProps
  extends CellRendererProps<number | null | undefined> {
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
    <Show
      when={formatted() != null}
      fallback={<span class="cell-empty">—</span>}
    >
      <span class="cell-int">{formatted()}</span>
    </Show>
  );
};

// ============================================
// Metric Value Renderer (compliance-colored number)
// ============================================
export interface MetricValueCellProps
  extends CellRendererProps<number | null | undefined> {
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
    <Show
      when={formatted() != null}
      fallback={<span class="cell-empty">—</span>}
    >
      <span class="cell-metric-value" style={{ color: color() }}>
        {formatted()}
      </span>
    </Show>
  );
};
