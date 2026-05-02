import { Component } from "solid-js";
import { CompletionTimeline } from "../../src/components/CompletionTimeline";

export const CompletionTimelineShowcase: Component = () => {
  const now = Date.now();
  let s = 31;
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const completions = Array.from({ length: 80 }, (_, i) => ({
    tableName: `events_shard_${(i % 8) + 1}`,
    completedAt: now - rand() * 8 * 60 * 60 * 1000,
    rowCount: Math.round(rand() * 5_000_000),
  }));
  return (
    <div class="component-section">
      <h2>CompletionTimeline — Composed (Depth 2)</h2>
      <p class="text-meta">
        Per-30-min bucket completion bars over a rolling window. Internally
        composes <code>Chart</code> + <code>BarSeries</code>.
      </p>
      <div class="example-group">
        <CompletionTimeline completions={completions} windowHours={8} />
      </div>
    </div>
  );
};
