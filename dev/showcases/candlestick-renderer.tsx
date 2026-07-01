import type { Component } from "solid-js";
import {
  CandlestickRenderer,
  type Candlestick,
} from "../../src/components/CandlestickRenderer";
import { Stack } from "../../src/components/Layout/Stack";
import { Text } from "../../src/components/Text/Text";

const uptrend: Candlestick = {
  open: 100.0,
  close: 108.5,
  high: 110.2,
  low: 99.1,
  mean: 104.6,
};

const downtrend: Candlestick = {
  open: 108.5,
  close: 100.2,
  high: 109.4,
  low: 98.0,
  mean: 104.0,
};

const doji: Candlestick = {
  open: 100.0,
  close: 100.05,
  high: 101.2,
  low: 99.3,
  mean: 100.1,
};

const largeRange: Candlestick = {
  open: 1_234_567.89,
  close: 1_289_543.21,
  high: 1_305_678.45,
  low: 1_198_234.56,
  mean: 1_257_123.78,
};

// Doji detection: treat nearly-flat candles as warning colored.
const dojiAwareColor = (c: Candlestick): string => {
  const range = c.high - c.low || 1;
  const body = Math.abs(c.close - c.open);
  if (body / range < 0.03) return "var(--sui-warning)";
  return c.close >= c.open ? "var(--sui-success)" : "var(--sui-danger)";
};

export const CandlestickRendererShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>CandlestickRenderer — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (CandlestickRenderer.css), no component imports. OHLC box
        visualization with open/close flanks, high/low stacked markers, and a
        mean value inside the box. Bullish/bearish coloring defaults to
        <code> --sui-success</code> / <code>--sui-danger</code>; override via
        <code> getBoxColor</code> for custom rules (e.g., doji detection).
      </p>

      <div class="example-group">
        <h3>Uptrend (bullish)</h3>
        <CandlestickRenderer label="Price" candlestick={uptrend} />
      </div>

      <div class="example-group">
        <h3>Downtrend (bearish)</h3>
        <CandlestickRenderer label="Price" candlestick={downtrend} />
      </div>

      <div class="example-group">
        <h3>Doji (nearly flat)</h3>
        <Text variant="sublabel">
          Default rendering colors a doji bullish (close ≥ open by 0.05). Use
          <code> getBoxColor</code> to detect near-flat candles and highlight
          them differently.
        </Text>
        <Stack gap="sm">
          <CandlestickRenderer label="Default" candlestick={doji} />
          <CandlestickRenderer
            label="Doji-aware"
            candlestick={doji}
            getBoxColor={dojiAwareColor}
          />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Large range values</h3>
        <CandlestickRenderer label="Trade volume" candlestick={largeRange} />
      </div>

      <div class="example-group">
        <h3>Custom precision</h3>
        <Stack gap="sm">
          <CandlestickRenderer
            label="precision=0"
            candlestick={uptrend}
            precision={0}
          />
          <CandlestickRenderer
            label="precision=4"
            candlestick={uptrend}
            precision={4}
          />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Empty state</h3>
        <Text variant="sublabel">
          <code>null</code>/<code>undefined</code> renders an em-dash
          placeholder.
        </Text>
        <Stack gap="sm">
          <CandlestickRenderer label="No data" candlestick={null} />
          <CandlestickRenderer label="Undefined" candlestick={undefined} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>No label</h3>
        <Text variant="sublabel">
          With <code>label</code> omitted, only the visualization renders.
        </Text>
        <CandlestickRenderer candlestick={uptrend} />
      </div>
    </div>
  );
};
