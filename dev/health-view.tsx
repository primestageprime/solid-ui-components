// /health — SUI health ratchet viewer. Reads scripts/health-baseline.json
// (the committed ceiling) and scripts/health-history.json (the local
// iteration log appended by scripts/health.mjs) and renders them as a table.
// Reached via hash route #/health (stethoscope in the sidebar brand header).
import type { Component, JSX } from "solid-js";
import { For, Show } from "solid-js";
import baselineJson from "../scripts/health-baseline.json";
import historyJson from "../scripts/health-history.json";
import { DataTable, type TableColumn } from "../src/components/Table";
import { Icon } from "../src/components/Icon";
import "./health-view.css";

type Metrics = Record<string, number>;
type HistoryEntry = { at: string; metrics: Metrics; baseline?: Metrics };

const baseline = baselineJson as Metrics;
const history = historyJson as HistoryEntry[];

const METRIC_KEYS = Object.keys(baseline);

// Rows render newest-first — the row you care about is the latest run.
type HealthRow = HistoryEntry & { index: number };
const rows: HealthRow[] = history
  .map((entry, index) => ({ ...entry, index }))
  .reverse();

const formatWhen = (iso: string): string => {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

/** Value cell colored against that run's recorded baseline: below the
 *  ceiling is an improvement, above it is a regression. */
const metricCell = (value: number, base: number | undefined): JSX.Element => {
  const state =
    base === undefined || value === base
      ? "steady"
      : value > base
        ? "regressed"
        : "improved";
  return (
    <span class={`health-cell health-cell--${state}`}>
      {value}
      <Show when={state !== "steady"}>
        <span class="health-cell__delta">
          {value > (base ?? 0) ? `+${value - (base ?? 0)}` : value - (base ?? 0)}
        </span>
      </Show>
    </span>
  );
};

const columns: TableColumn<HealthRow>[] = [
  {
    id: "at",
    header: "Run",
    accessor: (row) => formatWhen(row.at),
    sortable: true,
  },
  ...METRIC_KEYS.map(
    (key): TableColumn<HealthRow> => ({
      id: key,
      header: key,
      align: "right" as const,
      accessor: (row) => metricCell(row.metrics[key], row.baseline?.[key]),
    }),
  ),
];

const latest = history[history.length - 1];

export const HealthView: Component = () => (
  <div class="health-view">
    <header class="health-view__header">
      <a class="health-view__back" href="#/">
        ← Components
      </a>
      <h1 class="health-view__title">
        <Icon name="stethoscope" size="md" />
        SUI Health
      </h1>
      <p class="health-view__subtitle">
        Ratchet metrics from <code>scripts/health.mjs</code> — lower is
        better, 0 is the goal. The committed baseline is the ceiling; runs
        land here when a metric changes.
      </p>
    </header>

    <section class="health-view__summary">
      <For each={METRIC_KEYS}>
        {(key) => (
          <div class="health-summary-item">
            <span class="health-summary-item__label">{key}</span>
            {metricCell(latest?.metrics[key] ?? baseline[key], baseline[key])}
          </div>
        )}
      </For>
    </section>

    <DataTable data={rows} columns={columns} maxHeight="60vh" />
  </div>
);
