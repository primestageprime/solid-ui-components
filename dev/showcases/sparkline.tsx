import type { Component } from "solid-js";
import { Sparkline } from "../../src/components/Sparkline";
import { Row } from "../../src/components/Layout/Row";

const WAVE = [10, 30, 20, 50, 40, 70, 55, 80, 65, 90, 75, 100, 85, 95];
const BATCH = [0, 400, 600, 800, 700, 900, 1100, 950, 1200, 1050];
const FLAT = [50, 50, 50, 50, 50];
const SINGLE = [75];

export const SparklineShowcase: Component = () => (
  <div class="component-section">
    <h2>Sparkline — Atomic (Depth 0)</h2>
    <p class="text-meta">
      Generic inline SVG polyline: arbitrary values → tiny chart strip. Two
      modes: <code>line</code> (smooth trend, default) and{" "}
      <code>sawtooth</code> (drops to baseline between samples — useful for
      per-period counts like batch throughput). Color is prop-driven; no
      trend-class coupling. For trend-colored sparklines see TrendSparkline;
      for heartbeat health strips see HeartbeatSparkline.
    </p>

    <div class="example-group">
      <h3>Line mode (default) — accent color</h3>
      <Row gap="sm" align="center">
        <Sparkline values={WAVE} />
        <Sparkline values={WAVE} width={120} height={28} />
        <Sparkline values={FLAT} />
        <Sparkline values={SINGLE} />
      </Row>
    </div>

    <div class="example-group">
      <h3>Sawtooth mode — batch throughput feel</h3>
      <Row gap="sm" align="center">
        <Sparkline values={BATCH} mode="sawtooth" />
        <Sparkline
          values={BATCH}
          mode="sawtooth"
          width={120}
          height={28}
          color="var(--sui-success, #6fcf97)"
        />
      </Row>
    </div>

    <div class="example-group">
      <h3>Explicit colors via theme tokens</h3>
      <Row gap="sm" align="center">
        <Sparkline values={WAVE} color="var(--sui-success, #6fcf97)" />
        <Sparkline values={WAVE} color="var(--sui-warning, #f0ad4e)" />
        <Sparkline values={WAVE} color="var(--sui-danger, #e07a7a)" />
        <Sparkline values={WAVE} color="var(--sui-text-secondary)" />
      </Row>
    </div>

    <div class="example-group">
      <h3>Inline — embedding inside text</h3>
      <p style={{ color: "var(--sui-text-primary)" }}>
        Throughput last 14 batches:{" "}
        <Sparkline
          values={WAVE}
          width={60}
          height={14}
          style={{ "vertical-align": "middle" }}
        />{" "}
        trending up.
      </p>
    </div>
  </div>
);
