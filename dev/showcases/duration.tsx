import { Component, For } from "solid-js";
import { Duration } from "../../src/components/Duration";
import { Row, Stack } from "../../src/components/Layout";

const SAMPLES = [
  { label: "null", ms: null as number | null },
  { label: "120ms", ms: 120 },
  { label: "950ms", ms: 950 },
  { label: "1.2s", ms: 1234 },
  { label: "12.3s", ms: 12345 },
  { label: "12.3s verbose", ms: 12345, verbose: true },
  { label: "4m 8s", ms: 248_000 },
  { label: "2h 13m", ms: 8_028_000 },
];

export const DurationShowcase: Component = () => (
  <div class="component-section">
    <h2>Duration — Atomic (Depth 1)</h2>
    <p class="text-meta">
      Renders a span with a human-friendly duration. <code>ms</code> ≤ 1s →
      <code>123ms</code>; 1–10s → <code>12.3s</code>; minutes → <code>4m 8s</code>;
      hours → <code>2h 13m</code>. <code>null</code>/<code>undefined</code> → <code>--</code>.
    </p>
    <div class="example-group">
      <Stack gap="xs">
        <For each={SAMPLES}>
          {(s) => (
            <Row gap="md">
              <span style={{ "min-width": "10rem" }} class="text-meta">{s.label}</span>
              <Duration ms={s.ms ?? null} verbose={s.verbose} />
            </Row>
          )}
        </For>
      </Stack>
    </div>
  </div>
);
