import { Component, createSignal, onCleanup, onMount } from "solid-js";
import { createStore, produce } from "solid-js/store";
import {
  ExtractionBoard,
  type ExtractionBoardConfig,
  type BoardTable,
  type TableBatch,
} from "../../src/components/ExtractionBoard";

/** Split a row count into ~10k-row chunks, all `pending` to start. */
function chunkBatches(totalRows: number): TableBatch[] {
  const out: TableBatch[] = [];
  let left = totalRows;
  while (left > 0) {
    const rows = Math.min(10_000, left);
    out.push({ rows, state: "pending" });
    left -= rows;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Board config: 3 categories, a handful of data types with icons. Headers and
// the multi-batch threshold are left at their defaults.
// ---------------------------------------------------------------------------
const config: ExtractionBoardConfig = {
  categories: [
    { id: "lookup", label: "Lookup", description: "Small reference tables" },
    { id: "fact", label: "Fact", description: "Tall transactional streams" },
    { id: "wide", label: "Wide", description: "Many columns, modest rows" },
  ],
  dataTypes: [
    { id: "int", label: "Integer", icon: "chart-bar" },
    { id: "text", label: "Text", icon: "menu" },
    { id: "numeric", label: "Numeric", icon: "chart-line" },
    { id: "date", label: "Date / time", icon: "clock" },
    { id: "json", label: "JSON", icon: "data" },
  ],
  multiBatchAbove: 10_000,
  timing: { slurpMs: 600, moveMs: 400, resortMs: 4000 },
};

// A small deterministic seed set: a mix of single-batch (< 10k rows) and
// multi-batch (> 10k rows) tables across the three categories.
function seedTables(): BoardTable[] {
  const mk = (
    name: string,
    category: string,
    totalRows: number,
    cols: Record<string, number>,
  ): BoardTable => ({
    name,
    category,
    status: "todo",
    totalRows,
    transferredRows: 0,
    colsByType: cols,
    // Multi-batch tables split into ~10k-row chunks, all `pending` to start.
    // Small tables omit `batches` — the board drives one synthetic whole-table
    // batch off `status` doing → done.
    batches:
      totalRows > 10_000 ? chunkBatches(totalRows) : undefined,
  });
  return [
    mk("DIM_CURRENCY", "lookup", 180, { int: 2, text: 3 }),
    mk("DIM_COUNTRY", "lookup", 240, { int: 2, text: 4, date: 1 }),
    mk("DIM_STATUS_CODE", "lookup", 0, { int: 2, text: 2 }), // empty → skipped
    mk("FACT_ORDERS", "fact", 84_000, { int: 6, numeric: 3, date: 4 }),
    mk("FACT_SHIPMENTS", "fact", 52_000, { int: 5, numeric: 2, date: 3 }),
    mk("FACT_PAYMENTS", "fact", 31_000, { int: 4, numeric: 4, date: 2 }),
    mk("STG_PROFILE", "wide", 9_400, { int: 8, text: 7, json: 2, date: 2 }),
    mk("STG_CATALOG", "wide", 6_200, { int: 6, text: 9, json: 3 }),
  ];
}

const TICK_MS = 1500;

const ExtractionBoardShowcase: Component = () => {
  const [tables, setTables] = createStore<BoardTable[]>(seedTables());
  // An empty (0-row) table starts already resolved as SKIPPED (Done column).
  setTables(
    produce((ts) => {
      for (const t of ts) if (t.totalRows === 0) t.status = "skipped";
    }),
  );
  const [running, setRunning] = createSignal(true);
  let timer: number | undefined;

  // One mutation per tick: advance the in-flight Doing table; if none, promote
  // the next Todo to Doing. A Doing table fills over ~2 ticks, then flips Done.
  const tick = () => {
    setTables(
      produce((ts) => {
        const doing = ts.find((t) => t.status === "doing");
        if (doing) {
          // The board itself measures + eases the in-flight fill. The sim only
          // holds the TRUTH of batch lifecycle: commit a running batch (→ done,
          // bumping committed rows) and start the next pending one as running.
          const b = doing.batches;
          if (b) {
            const running = b.findIndex((x) => x.state === "running");
            if (running >= 0) {
              b[running].state = "done";
              doing.transferredRows = Math.min(
                doing.totalRows,
                doing.transferredRows + b[running].rows,
              );
            }
            const pending = b.findIndex((x) => x.state === "pending");
            if (pending >= 0) {
              b[pending].state = "running";
            } else if (b.every((x) => x.state === "done")) {
              doing.transferredRows = doing.totalRows;
              doing.status = "done";
            }
          } else {
            // Single-fill small table: one tick of "running", then done.
            doing.transferredRows = doing.totalRows;
            doing.status = "done";
          }
          return;
        }
        // No active table → start the next queued one (smallest rows first).
        const next = ts
          .filter((t) => t.status === "todo")
          .sort((a, b) => a.totalRows - b.totalRows)[0];
        if (next) {
          next.status = "doing";
          next.transferredRows = 0;
          if (next.batches && next.batches.length > 0) {
            next.batches[0].state = "running";
          }
        } else {
          // All resolved → reset to start so the motion loops.
          for (const t of ts) {
            if (t.totalRows === 0) {
              t.status = "skipped";
            } else {
              t.status = "todo";
              t.transferredRows = 0;
              if (t.batches) {
                for (const x of t.batches) x.state = "pending";
              }
            }
          }
        }
      }),
    );
  };

  const startLoop = () => {
    if (timer !== undefined) return;
    timer = window.setInterval(tick, TICK_MS);
  };
  const stopLoop = () => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
  };

  onMount(startLoop);
  onCleanup(stopLoop);

  const toggle = () => {
    if (running()) {
      stopLoop();
      setRunning(false);
    } else {
      startLoop();
      setRunning(true);
    }
  };

  return (
    <div class="component-section">
      <h2>ExtractionBoard — Composite</h2>
      <p class="text-meta">
        A drop-in ETL extraction board. The client supplies CONFIG (categories,
        data types + icons) and a reactive table store; the board derives the
        Summary / Done / Doing / Todo / +N view and animates transitions (slurp
        → slide → enter) via its FLIP engine. Here a setInterval advances one
        table todo → doing → done every {TICK_MS}ms, then loops.
      </p>
      <p>
        <button onClick={toggle}>{running() ? "Pause" : "Play"}</button>
      </p>
      <ExtractionBoard config={config} tables={tables} />
    </div>
  );
};

export { ExtractionBoardShowcase };
export default ExtractionBoardShowcase;
