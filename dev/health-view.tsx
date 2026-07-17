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
import { Sparkline } from "../src/components/Sparkline";
import "./health-view.css";

type Metrics = Record<string, number>;
type HistoryEntry = { at: string; metrics: Metrics; baseline?: Metrics };

const baseline = baselineJson as Metrics;
const history = historyJson as HistoryEntry[];

const latestMetrics = history[history.length - 1]?.metrics ?? baseline;

// Biggest offenders lead: columns and tiles sort by current value, descending,
// so the zeros drift right as the ratchet does its job. Alphabetical tiebreak
// keeps the boring (all-zero) tail stable between runs.
const METRIC_KEYS = Object.keys(baseline).sort(
  (a, b) =>
    (latestMetrics[b] ?? baseline[b]) - (latestMetrics[a] ?? baseline[a]) ||
    a.localeCompare(b),
);

/** Chronological series for one metric, skipping runs that predate it. */
const seriesFor = (key: string): number[] =>
  history.filter((h) => h.metrics[key] != null).map((h) => h.metrics[key]);

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

    {/* Small-multiple trend tiles — one per metric, own scale, biggest
        offender left-most. A flat line on the floor is the happy state. */}
    <section class="health-view__summary">
      <For each={METRIC_KEYS}>
        {(key) => {
          const values = seriesFor(key);
          const start = values[0] ?? baseline[key];
          const now = latest?.metrics[key] ?? baseline[key];
          return (
            <div class="health-summary-item">
              <span class="health-summary-item__label">{key}</span>
              {metricCell(now, baseline[key])}
              <Sparkline
                class="health-summary-item__trend"
                values={values.length > 0 ? values : [baseline[key]]}
                width={168}
                height={34}
                color={now === 0 ? "var(--sui-success)" : "var(--sui-accent)"}
              />
              <span class="health-summary-item__range">
                <Show when={start !== now} fallback={<>steady at {now}</>}>
                  {start} → {now}
                </Show>
              </span>
            </div>
          );
        }}
      </For>
    </section>

    <DataTable data={rows} columns={columns} maxHeight="60vh" />
  </div>
);
