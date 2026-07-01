import type { Component } from "solid-js";
import { ThroughputChart } from "../../src/components/ThroughputChart";

export const ThroughputChartShowcase: Component = () => {
  const now = Date.now();
  const HOUR = 3_600_000;
  let s = 17;
  const rand = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  // RATE mode (default): instantaneous rows/min over an 8h window.
  const points = Array.from({ length: 96 }, (_, i) => ({
    timestamp: now - (96 - i) * 5 * 60_000,
    rowsPerMinute: Math.max(
      0,
      Math.round(2000 + Math.sin(i / 8) * 800 + (rand() - 0.5) * 600),
    ),
  }));

  // COMPLETION mode (opt-in via `completions`): per-hour completed-item bars +
  // a cumulative-% line over a 48h window. Items trickle in across the window.
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
      <h2>ThroughputChart — Composed (Depth 1)</h2>
      <p class="text-meta">
        Two modes, one component. RATE (default): rows/min line + area + average
        reference + crosshair tooltip —{" "}
        <code>{` { dataPoints, windowHours? } `}</code>. COMPLETION (opt-in via{" "}
        <code>completions</code>): per-hour completed-item bars + a cumulative-%
        line on a shared 0–100 axis; self-sizing —
        <code>{` { completions, now, windowHours, totalCount, baselineCompleted? } `}</code>
        .
      </p>
      <div class="example-group">
        <ThroughputChart dataPoints={points} windowHours={8} />
      </div>
      <div class="example-group">
        <ThroughputChart
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
