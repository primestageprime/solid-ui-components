import { type Component, createMemo, createSignal } from "solid-js";
import { Button } from "../../src/components/Button/Button";
import { BorderedButtonGroup } from "../../src/components/ButtonGroup";
import { CandlestickRenderer } from "../../src/components/CandlestickRenderer";
import {
  CandlestickScrubChart,
  buildCandleCells,
  type CandlestickGranularity,
  type CandlestickSample,
} from "../../src/components/CandlestickScrubChart";
import { ClusterRow } from "../../src/components/Layout";
import { MutedBody, TextSublabel } from "../../src/components/Text";

// ── Deterministic sample data ────────────────────────────────────────────
// SUB-DAY samples — several "orders" per trading day — because that is what a
// day candle's distribution is made of. One-sample-per-day data would render
// every day candle flat (see the component's header warning), which is exactly
// the degenerate bar this component exists to avoid.
//
// Weekends are SKIPPED entirely rather than emitted as zero rows: gap days must
// never reach the OHLC math, or every month's low would pin to 0.
const RANGE_START = new Date("2025-09-01T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS = 400;

// Cheap deterministic PRNG — a demo must look the same on every reload.
const rand = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const buildSamples = (): CandlestickSample[] => {
  const out: CandlestickSample[] = [];
  for (let d = 0; d < DAYS; d++) {
    const at = new Date(RANGE_START.getTime() + d * DAY_MS);
    const dow = at.getUTCDay();
    if (dow === 0 || dow === 6) continue; // no trading on weekends
    // A slow seasonal swell so month candles have a trend to show.
    const base = 4200 + Math.sin(d / 46) * 1400 + Math.sin(d / 11) * 520;
    // 3–8 orders inside the day, each a different size → a real intra-day
    // distribution, so the day candle gets genuine wicks.
    const orders = 3 + Math.floor(rand(d + 1) * 6);
    for (let k = 0; k < orders; k++) {
      const hour = 8 + Math.floor((k / orders) * 9);
      const jitter = 0.45 + rand(d * 31 + k * 7) * 1.5;
      out.push({
        at: new Date(at.getTime() + hour * 60 * 60 * 1000),
        value: Math.round((base / orders) * jitter),
      });
    }
  }
  return out;
};

const samples = buildSamples();

const fmtUsd = (v: number): string =>
  `$${Math.round(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const CandlestickScrubChartShowcase: Component = () => {
  const [granularity, setGranularity] =
    createSignal<CandlestickGranularity>("day");
  const [selected, setSelected] = createSignal(0);

  // Selection is per-strip, so a granularity flip must reset it — a day index
  // means nothing on a month strip. (The component also clamps defensively.)
  const switchTo = (g: CandlestickGranularity) => {
    setGranularity(g);
    setSelected(0);
  };

  // Reduce once more here purely to drive the readout beside the chart —
  // the same pure helper the component uses internally.
  const cells = createMemo(() => buildCandleCells(samples, granularity()));
  const selectedCell = createMemo(() => cells()[selected()]);

  return (
    <div class="component-section">
      <h2>CandlestickScrubChart — Domain Composite (Depth 3)</h2>
      <p class="text-meta">
        Composes <code>ScrubChart</code> with a candlestick{" "}
        <code>renderChart</code> and a per-period ribbon. The consumer passes
        RAW samples plus a <code>granularity</code>; the component buckets,
        reduces the OHLC and plots. Drag or click the chart to scrub.
      </p>

      <div class="example-group">
        <h3>Dispersion, not price</h3>
        <MutedBody>
          Each candle's open/close are the period's FIRST and LAST sub-bucket,
          its wicks the best and worst. A month candle reduces that month's
          populated DAY totals; a day candle reduces that day's individual
          samples. Consecutive candles deliberately do NOT connect — January's
          close is not February's open — so no line is drawn between them.
          Empty periods keep a slot but contribute nothing: a zero-filled gap
          would pin every low to $0.
        </MutedBody>
      </div>

      <div class="example-group">
        <h3>Runtime granularity switch</h3>
        <ClusterRow>
          <BorderedButtonGroup>
            <Button
              size="sm"
              active={granularity() === "day"}
              onClick={() => switchTo("day")}
            >
              Day
            </Button>
            <Button
              size="sm"
              active={granularity() === "month"}
              onClick={() => switchTo("month")}
            >
              Month
            </Button>
          </BorderedButtonGroup>
          <TextSublabel>
            {cells().length} {granularity()} cells from {samples.length} samples
          </TextSublabel>
        </ClusterRow>

        <div class="candlestick-scrub-chart-demo">
          <CandlestickScrubChart
            samples={samples}
            granularity={granularity()}
            selected={selected()}
            onScrub={(i) => setSelected(i)}
            formatValue={fmtUsd}
            hover
            renderHoverTooltip={(cell) => (
              <div class="candlestick-scrub-chart-demo__tip">
                <div class="candlestick-scrub-chart-demo__tip-title">
                  {cell.start.toISOString().slice(0, 10)}
                </div>
                {cell.candle ? (
                  <>
                    <div>
                      O {fmtUsd(cell.candle.open)} · C{" "}
                      {fmtUsd(cell.candle.close)}
                    </div>
                    <div>
                      H {fmtUsd(cell.candle.high)} · L {fmtUsd(cell.candle.low)}
                    </div>
                    <div>
                      {cell.subBucketCount} sub-buckets · {cell.sampleCount}{" "}
                      samples
                    </div>
                  </>
                ) : (
                  <div>no data</div>
                )}
              </div>
            )}
          />
        </div>
      </div>

      <div class="example-group">
        <h3>Selected period readout</h3>
        <MutedBody>
          The atomic <code>CandlestickRenderer</code> showing the scrubbed
          period's numbers — the same visual language the plotted glyph uses.
        </MutedBody>
        <CandlestickRenderer
          label={selectedCell()?.start.toISOString().slice(0, 10) ?? "—"}
          candlestick={selectedCell()?.candle}
          precision={0}
        />
      </div>

      <div class="example-group">
        <h3>Plain mode (no scrub layer)</h3>
        <MutedBody>
          <code>scrub={"{false}"}</code> composes the whole scrub layer off —
          same candles, no ribbon and no pointer interaction.
        </MutedBody>
        <div class="candlestick-scrub-chart-demo candlestick-scrub-chart-demo--plain">
          <CandlestickScrubChart
            samples={samples}
            granularity="month"
            scrub={false}
            formatValue={fmtUsd}
          />
        </div>
      </div>

      <div class="example-group">
        <h3>Empty state</h3>
        <MutedBody>No samples renders an empty strip, not a crash.</MutedBody>
        <div class="candlestick-scrub-chart-demo candlestick-scrub-chart-demo--plain">
          <CandlestickScrubChart samples={[]} />
        </div>
      </div>
    </div>
  );
};
