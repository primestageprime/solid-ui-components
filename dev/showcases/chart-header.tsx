import type { Component } from "solid-js";
import { createSignal } from "solid-js";
import { ChartHeader } from "../../src/components/ChartHeader";
import { Sparkline } from "../../src/components/Sparkline";

export const ChartHeaderShowcase: Component = () => {
  const [n, setN] = createSignal(42);
  return (
    <div class="component-section">
      <h2>ChartHeader — Composed (Depth 2)</h2>
      <p class="text-meta">
        The standard chart title strip: mono accent title left, muted meta
        readout right, spread across the chart's top edge. Data-only call
        site; all styling is baked. Born from CompletionTimeline's header.
      </p>

      <div class="example-group">
        <h3>Title + meta</h3>
        <ChartHeader
          title="Completion Timeline"
          meta={`${n()} completions in window`}
        />
        <Sparkline values={[2, 5, 3, 8, 6, 9, 7]} width={240} height={32} />
        <div class="example-row">
          <button class="demo-btn" type="button" onClick={() => setN(n() + 1)}>
            bump count
          </button>
        </div>
      </div>

      <div class="example-group">
        <h3>Title only</h3>
        <ChartHeader title="Throughput" />
        <Sparkline
          values={[1, 4, 2, 6, 5]}
          mode="sawtooth"
          width={240}
          height={32}
        />
      </div>
    </div>
  );
};
