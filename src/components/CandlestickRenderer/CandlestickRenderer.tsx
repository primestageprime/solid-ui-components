// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// CandlestickRenderer — Atomic (Depth 1)
// Owns CSS (CandlestickRenderer.css), no component imports.
//
// OHLC (open/high/low/close) + mean visualization rendered as a colored
// box flanked by open/close labels with high/low stacked above/below.
// The color function is pluggable so callers can wire their own rules
// (bullish/bearish defaults are green/red respectively).
// ============================================
import { type Component, Show, mergeProps } from "solid-js";
import "./CandlestickRenderer.css";

/** OHLC shape consumed by `CandlestickRenderer`. */
export interface Candlestick {
  open: number;
  close: number;
  high: number;
  low: number;
  mean: number;
  /** Epoch millis — optional; not shown in the base visualization. */
  openAt?: number;
  /** Epoch millis — optional; not shown in the base visualization. */
  closeAt?: number;
}

export interface CandlestickRendererProps {
  /** Optional label; when provided, renders `{label}: {candlestick}`. */
  label?: string;
  /** Candlestick data. `null`/`undefined` renders an em-dash placeholder. */
  candlestick: Candlestick | null | undefined;
  /**
   * Color function for the box fill/border. Defaults to
   * green when `close >= open` (bullish) and red otherwise (bearish).
   */
  getBoxColor?: (c: Candlestick) => string;
  /** Decimal places for displayed values (default `2`). */
  precision?: number;
  /** Extra class on the outer container. */
  class?: string;
}

const DEFAULT_PRECISION = 2;
const BULLISH_COLOR = "var(--sui-success)";
const BEARISH_COLOR = "var(--sui-danger)";

const defaultGetBoxColor = (c: Candlestick): string =>
  c.close >= c.open ? BULLISH_COLOR : BEARISH_COLOR;

const formatNumber = (value: number, precision: number): string =>
  Number.isFinite(value)
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      })
    : String(value);

/**
 * `CandlestickRenderer` — OHLC box with mean, open/close flanks, and
 * high/low stacked markers. Bullish/bearish coloring is configurable.
 *
 * @example
 *   <CandlestickRenderer
 *     label="Price"
 *     candlestick={{ open: 100, close: 105, high: 107, low: 99, mean: 103 }}
 *   />
 *
 *   // Custom color (e.g., doji-aware)
 *   <CandlestickRenderer
 *     candlestick={cs}
 *     getBoxColor={(c) => Math.abs(c.close - c.open) < 0.01 ? "var(--sui-warning)" : undefined}
 *   />
 */
export const CandlestickRenderer: Component<CandlestickRendererProps> = (
  rawProps,
) => {
  const props = mergeProps({ precision: DEFAULT_PRECISION }, rawProps);

  const containerClass = () =>
    ["sui-candlestick", props.class].filter(Boolean).join(" ");

  const body = (
    <Show
      when={props.candlestick}
      fallback={<span class="sui-candlestick__empty">—</span>}
    >
      {(cs) => {
        const color = () =>
          (props.getBoxColor ?? defaultGetBoxColor)(cs()) ??
          defaultGetBoxColor(cs());
        return (
          <div class="sui-candlestick__viz">
            <div class="sui-candlestick__high">
              {formatNumber(cs().high, props.precision)}
            </div>
            <div class="sui-candlestick__row">
              <div class="sui-candlestick__open">
                {formatNumber(cs().open, props.precision)}
              </div>
              <div
                class="sui-candlestick__box"
                style={{
                  "border-color": color(),
                  "background-color": `color-mix(in srgb, ${color()} 20%, transparent)`,
                }}
              >
                <span class="sui-candlestick__mean">
                  {"\u03BC "}
                  {formatNumber(cs().mean, props.precision)}
                </span>
              </div>
              <div class="sui-candlestick__close">
                {formatNumber(cs().close, props.precision)}
              </div>
            </div>
            <div class="sui-candlestick__low">
              {formatNumber(cs().low, props.precision)}
            </div>
          </div>
        );
      }}
    </Show>
  );

  return (
    <Show
      when={props.label}
      fallback={<div class={containerClass()}>{body}</div>}
    >
      <div class={`${containerClass()} sui-candlestick--with-label`}>
        <span class="sui-candlestick__label">{props.label}:</span>
        <div class="sui-candlestick__value-container">{body}</div>
      </div>
    </Show>
  );
};
