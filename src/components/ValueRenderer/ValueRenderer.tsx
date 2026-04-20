// ============================================
// ValueRenderer — Atomic (Depth 1)
// Owns CSS (ValueRenderer.css), no component imports.
//
// Meta-primitive for labeled label/value layout. Dispatches a value of
// unknown shape to a sensible default rendering:
//   - string      → plain text
//   - number      → toLocaleString (with precision if configured)
//   - boolean     → "true" / "false"
//   - null/undef  → em-dash (muted)
//   - object      → key/value entry list (recursing via the same default dispatch)
//   - JSX element → passed through unchanged
//
// Callers can override the dispatch entirely via the `renderValue` prop —
// useful for wiring domain-specific types (status badges, candlesticks,
// epoch-millis dates, etc.) from the host application.
// ============================================
import {
  type Component,
  type JSX,
  For,
  Show,
  mergeProps,
} from "solid-js";
import "./ValueRenderer.css";

/** Optional render override — receives the raw value, returns JSX. */
export type RenderValueFn = (value: unknown) => JSX.Element;

export interface ValueRendererProps {
  /** Optional label; when provided, renders `{label}: {value}` in a row. */
  label?: string;
  /** The value to render. Dispatched through `renderValue` (caller-supplied) or the default dispatcher. */
  value: unknown;
  /**
   * Render override for the value portion. If absent, the built-in default
   * dispatcher is used. Useful for injecting domain renderers (status badges,
   * candlesticks, epoch-millis dates) without subclassing.
   */
  renderValue?: RenderValueFn;
  /** Decimal places for number values (default `2`). Ignored when `renderValue` is supplied. */
  numberPrecision?: number;
  /** Extra class on the outer container. */
  class?: string;
}

const DEFAULT_NUMBER_PRECISION = 2;

const isJSXElement = (value: unknown): value is JSX.Element =>
  value !== null
  && typeof value === "object"
  && "$$typeof" in (value as Record<string, unknown>);

const formatNumber = (value: number, precision: number): string =>
  Number.isFinite(value)
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      })
    : String(value);

/**
 * Default value dispatcher — renders primitives inline, objects as key/value
 * entries. Recurses through `renderOne` for nested values so a caller-supplied
 * override takes effect at every level.
 */
const defaultDispatch = (
  value: unknown,
  renderOne: RenderValueFn,
  precision: number,
): JSX.Element => {
  if (value === null || value === undefined) {
    return <span class="sui-value__empty">—</span>;
  }
  if (isJSXElement(value)) {
    return value;
  }
  if (typeof value === "string") {
    return <span class="sui-value__text">{value}</span>;
  }
  if (typeof value === "number") {
    return <span class="sui-value__number">{formatNumber(value, precision)}</span>;
  }
  if (typeof value === "boolean") {
    return <span class="sui-value__text">{value ? "true" : "false"}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <span class="sui-value__array">
        <For each={value}>
          {(item, i) => (
            <>
              <Show when={i() > 0}>
                <span class="sui-value__sep">, </span>
              </Show>
              {renderOne(item)}
            </>
          )}
        </For>
      </span>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <Show
        when={entries.length > 0}
        fallback={<span class="sui-value__empty">Empty</span>}
      >
        <div class="sui-value__entries">
          <For each={entries}>
            {([key, entryValue]) => (
              <div class="sui-value__entry">
                <span class="sui-value__entry-key">{key}:</span>
                <div class="sui-value__entry-value">{renderOne(entryValue)}</div>
              </div>
            )}
          </For>
        </div>
      </Show>
    );
  }
  return <span class="sui-value__text">{String(value)}</span>;
};

/**
 * `ValueRenderer` — labeled label/value layout with pluggable dispatch.
 *
 * @example
 *   // Zero-config primitives
 *   <ValueRenderer label="Status" value="ONLINE" />
 *   <ValueRenderer label="Count" value={1234.5678} numberPrecision={2} />
 *   <ValueRenderer label="Missing" value={null} />
 *
 *   // Object
 *   <ValueRenderer
 *     label="Context"
 *     value={{ temperature: 45.2, active: true }}
 *   />
 *
 *   // Custom dispatch for domain types
 *   <ValueRenderer
 *     label="Status"
 *     value="ALARM"
 *     renderValue={(v) =>
 *       typeof v === "string" && STATUS.includes(v)
 *         ? <StatusBadge status={v} />
 *         : undefined
 *     }
 *   />
 */
export const ValueRenderer: Component<ValueRendererProps> = (rawProps) => {
  const props = mergeProps(
    { numberPrecision: DEFAULT_NUMBER_PRECISION },
    rawProps,
  );

  // A single render function that prefers the caller override but falls back
  // to the default dispatcher — recursion uses the same function so overrides
  // apply at every nesting level.
  const renderOne: RenderValueFn = (v) => {
    const override = props.renderValue?.(v);
    if (override !== undefined && override !== null) {
      return override;
    }
    return defaultDispatch(v, renderOne, props.numberPrecision);
  };

  const containerClass = () =>
    ["sui-value", props.class].filter(Boolean).join(" ");

  return (
    <Show
      when={props.label}
      fallback={<div class={containerClass()}>{renderOne(props.value)}</div>}
    >
      <div class={`${containerClass()} sui-value--with-label`}>
        <span class="sui-value__label">{props.label}:</span>
        <div class="sui-value__body">{renderOne(props.value)}</div>
      </div>
    </Show>
  );
};
