import { Component } from "solid-js";
import { CompletionChart } from "../../src/components/ThroughputChart";

// A deterministic 48h history: items trickle in over the window, so the bars
// vary per hour and the cumulative line climbs toward ~100%.
export const CompletionChartShowcase: Component = () => {
  const now = Date.now();
  const HOUR = 3_600_000;
  let s = 41;
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const total = 120;
  const completions: { completedAt: number }[] = [];
  for (let h = 0; h < 48 && completions.length < total - 10; h++) {
    const n = Math.round(rand() * 4);
    for (let i = 0; i < n; i++) {
      completions.push({ completedAt: now - (48 - h) * HOUR + rand() * HOUR });
    }
  }
  return (
    <div class="component-section">
      <h2>CompletionChart — Composed (Depth 2)</h2>
      <p class="text-meta">
        Per-hour completed-item bars + a cumulative-% line on one shared 0–100
        axis. Self-sizing (measures its own width) and data-only:
        <code>{` { completions, now, windowHours, totalCount, baselineCompleted? } `}</code>.
        Built for an ETL "tables done / hr + % complete" header.
      </p>
      <div class="example-group">
        <CompletionChart
          completions={completions}
          now={now}
          windowHours={48}
          totalCount={total}
          baselineCompleted={10}
          barsLabel="Tables / hr"
        />
      </div>
    </div>
  );
};
