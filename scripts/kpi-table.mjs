#!/usr/bin/env node
// ============================================
// KPI table — renders the latest entry of scripts/health-history.json
// (written by health.mjs on every run whose metrics changed).
//
//   node scripts/kpi-table.mjs            # latest snapshot as a table
//   node scripts/kpi-table.mjs --history  # one row per recorded iteration
//
// Sort order (Peter ruling 2026-07-15): non-zero KPIs ascending on top
// (smallest offenders first — easy wins), zeros at the bottom ordered by
// how likely they are to regress.
// ============================================
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HISTORY_PATH = join(root, "scripts", "health-history.json");

// Higher = more regression-prone; breaks ties among the zeros.
const ZERO_PRIORITY = {
  bareHexTsx: 5,
  bareHexCss: 4,
  missingDepthHeaders: 3,
  undocumentedComponents: 2,
  foldersWithoutTests: 1,
};

if (!existsSync(HISTORY_PATH)) {
  console.error("No history yet — run `npm run health` first.");
  process.exit(1);
}
const history = JSON.parse(readFileSync(HISTORY_PATH, "utf8"));
if (!history.length) {
  console.error("History is empty — run `npm run health` first.");
  process.exit(1);
}

const latest = history[history.length - 1];
const prev = history[history.length - 2];

const rows = Object.entries(latest.metrics).sort(([ka, va], [kb, vb]) => {
  if (va > 0 && vb > 0) return va - vb; // non-zero: smallest first
  if (va > 0 !== vb > 0) return va > 0 ? -1 : 1; // non-zero above zeros
  return (ZERO_PRIORITY[kb] ?? 0) - (ZERO_PRIORITY[ka] ?? 0);
});

// Lower is always better: ↓ = improvement, ↑ = regression.
const fmtDelta = (d) =>
  d === null ? "" : d === 0 ? "±0" : d > 0 ? `↑${d}` : `↓${-d}`;

if (process.argv.includes("--history")) {
  const keys = rows.map(([k]) => k);
  console.log(
    ["when".padEnd(17), ...keys.map((k) => k.slice(0, 12).padStart(13))].join(
      "",
    ),
  );
  for (const entry of history)
    console.log(
      [
        entry.at.slice(0, 16).replace("T", " ").padEnd(17),
        ...keys.map((k) => String(entry.metrics[k] ?? "—").padStart(13)),
      ].join(""),
    );
  process.exit(0);
}

console.log(
  `SUI KPIs — as of ${latest.at.slice(0, 16).replace("T", " ")} (iteration ${history.length})\n`,
);
console.log(
  `  ${"KPI".padEnd(24)}${"now".padStart(6)}${"Δ prev".padStart(8)}${"baseline".padStart(10)}  status`,
);
for (const [k, v] of rows) {
  const base = latest.baseline?.[k];
  const delta = prev ? v - (prev.metrics[k] ?? v) : null;
  const status =
    base === undefined
      ? "(no baseline)"
      : v > base
        ? "✗ REGRESSED"
        : v === 0
          ? "✅ done"
          : v < base
            ? "✓ improved"
            : "open debt";
  console.log(
    `  ${k.padEnd(24)}${String(v).padStart(6)}${fmtDelta(delta).padStart(8)}${String(base ?? "—").padStart(10)}  ${status}`,
  );
}
const open = rows.filter(([, v]) => v > 0);
console.log(
  open.length
    ? `\n  Next up: ${open[0][0]} (${open[0][1]})`
    : "\n  🏁 All KPIs at zero.",
);
