import { Component } from "solid-js";
import { ThroughputChart } from "../../src/components/ThroughputChart";

export const ThroughputChartShowcase: Component = () => {
  const now = Date.now();
  let s = 17;
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const points = Array.from({ length: 96 }, (_, i) => ({
    timestamp: now - (96 - i) * 5 * 60_000,
    rowsPerMinute: Math.max(0, Math.round(2000 + Math.sin(i / 8) * 800 + (rand() - 0.5) * 600)),
  }));
  return (
    <div class="component-section">
      <h2>ThroughputChart — Composed (Depth 2)</h2>
      <p class="text-meta">
        Line + area + average reference + crosshair tooltip. Internally
        composes the <code>Chart</code> family. Public API:
        <code>{` { dataPoints, windowHours? } `}</code>.
      </p>
      <div class="example-group">
        <ThroughputChart dataPoints={points} windowHours={8} />
      </div>
    </div>
  );
};
