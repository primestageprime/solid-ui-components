# Rhinotools Components → SUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the real gaps between rhinotools' hand-rolled migration-app components and SUI: add `GapCell` and `CensusView`, add a `ServiceHealthDot` composite for the app-shell health cluster, and close the docs/showcase coverage holes on the four components that already shipped.

**Architecture:** The original 7-component proposal was written against a stale SUI checkout. Ground truth on main @ 0.100.0: **ThroughputChart, ExtractionBoard (`createExtractionBoard`), RingChart, and WorkerCard already exist, are barrel-exported, showcased, and used by rhinotools in production.** SUI also already has two sparklines — `TrendSparkline` (plain line) and `HeartbeatSparkline` (0..1 timeout-fraction samples = exactly the "sawtooth" service-age decay mode). What's genuinely missing: `GapCell` (a severity-ramp table cell), `CensusView` (the bucketed census composition), a reusable service-health dot composite, and documentation coverage. Port visuals verbatim from rhinotools, but swap hard-coded hex for `--sui-*` tokens and inline styles for existing atomics.

**Tech Stack:** SolidJS, vitest + @solidjs/testing-library, hand-rolled SVG (no chart lib), CSS custom properties (`--sui-*` theme tokens).

## Global Constraints

- Depth heuristic: Depth-1 atomics own CSS; Depth-2+ composites have zero CSS except documented structural exceptions (state the exception in the header comment).
- Currying rule: presentational props are Overrides frozen via `create<Name>` (`Overrides = Pick<Props, …>` / `DataProps = Omit<Props, keyof Overrides>` / `mergeProps(defaults, props)`); data-only components may skip currying (SortableList/AssigneeIcon precedent) but must say so in the header comment.
- `index.ts` barrels do NOT export bases that have curried variants.
- No hard-coded colors: use `var(--sui-success)`, `var(--sui-warning)`, `var(--sui-danger)`, `var(--sui-text-muted)` etc. (rhinotools' `#00ff88/#ffaa00/#ff3366` map to these).
- Every component: showcase in `dev/showcases/<kebab>.tsx` + registration in `dev/main.tsx` items + `COMPONENTS.md` entry + `CHANGELOG.md` [Unreleased] entry.
- Gates before any release: `npx tsc --noEmit` · `npm test` · `npm run build`.
- Commits end with:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_0114zmxNPiJDfLYCov7eh4Nr`
- Porting sources (read these files while implementing):
  - `/Users/peter/Documents/clients/PrimeStage/rhinotools/netsuite_extract_rs/ui/src/components/GapCell.tsx` (76 lines)
  - `/Users/peter/Documents/clients/PrimeStage/rhinotools/netsuite_extract_rs/ui/src/components/CensusView.tsx` (419 lines)
  - `/Users/peter/Documents/clients/PrimeStage/rhinotools/netsuite_extract_rs/ui/src/components/censusAdapters.tsx` (adapter pattern — adapters STAY app-side)
  - `/Users/peter/Documents/clients/PrimeStage/rhinotools/netsuite_extract_rs/ui/src/components/AppNav.tsx` lines 21–130 (ServiceDot)

---

## What is explicitly NOT in this plan (already done)

| Proposed | Reality on main @ 0.100.0 |
|---|---|
| Sparkline base | `TrendSparkline` (line mode) + `HeartbeatSparkline` (sawtooth/decay: `samples: number[]` 0..1 fraction-of-timeout, `state`, `width/height/capacity/pulse`) both exist and are exported. |
| ThroughputChart | Exists (`src/components/ThroughputChart/`), showcased, used by rhinotools acumatica dashboard (`completions`, `now`, `windowHours`, `totalCount`, `baselineCompleted`, `barsLabel`, `cumulativeLabel`). |
| ExtractionBoard | Exists with `createExtractionBoard(config)` factory, showcased, used in production. |
| WorkerCard | Exists, showcased, used in production (the rhinotools-local WorkerCard.tsx is the legacy v1-API version — stays app-side). |
| RingChart | Exists (`segments`, `total`, `label`, `sublabel`, `size`), showcased, used in production. |
| BurndownChart bars extension | Not needed — ThroughputChart already does bars + cumulative line. |

Follow-up for rhinotools (out of scope here, note for Peter): its dep is `"solid-ui-components": "github:primestageprime/solid-ui-components"` (unversioned main). Move it to the scoped registry package `@primestageprime/solid-ui-components@^0.101.0` once this releases.

---

### Task 1: GapCell — severity-ramp table cell

**Files:**
- Create: `src/components/Table/GapCell.tsx`
- Create: `src/components/Table/GapCell.css`
- Test: `src/components/Table/GapCell.test.tsx`
- Modify: `src/components/Table/index.ts` (add exports)
- Create: `dev/showcases/gap-cell.tsx`
- Modify: `dev/main.tsx` (register showcase)
- Modify: `COMPONENTS.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: `CellRendererProps<V>` from `src/components/Table/cellStyle.tsx`, `createCellRenderer` from `src/components/Table/createCellRenderer.tsx`.
- Produces: `GapCell: Component<GapCellProps>`, `GapCellProps { remaining: number | null | undefined; total: number }`, `gapSeverity(pctRemaining: number): "success" | "warning" | "danger"` (pure, exported for tests/reuse). Task 2 renders `<GapCell remaining={…} total={…} />` inside its mini-tables.

**Behavior (ported verbatim from rhinotools GapCell.tsx, tokens swapped):** blank state (`total === 0` or `remaining` nullish) renders a muted `—`; otherwise a bold remaining count, a percentage, and a 40×4px inline fill bar showing `100 - pctRemaining` filled. Ramp: `0%` remaining → success, `≤50%` → warning, `>50%` → danger.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Table/GapCell.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { GapCell, gapSeverity } from "./GapCell";

describe("gapSeverity", () => {
  it("ramps 0 → success, ≤50 → warning, >50 → danger", () => {
    expect(gapSeverity(0)).toBe("success");
    expect(gapSeverity(0.1)).toBe("warning");
    expect(gapSeverity(50)).toBe("warning");
    expect(gapSeverity(50.1)).toBe("danger");
    expect(gapSeverity(100)).toBe("danger");
  });
});

describe("GapCell", () => {
  it("renders an em-dash when total is 0 or remaining is nullish", () => {
    const zero = render(() => <GapCell remaining={5} total={0} />);
    expect(zero.container.textContent).toBe("—");
    const nul = render(() => <GapCell remaining={null} total={100} />);
    expect(nul.container.textContent).toBe("—");
  });

  it("renders count, percentage, and a fill bar sized to completion", () => {
    const { container } = render(() => <GapCell remaining={250} total={1000} />);
    expect(container.textContent).toContain("250");
    expect(container.textContent).toContain("25.0%");
    const fill = container.querySelector(".sui-gap-cell__fill") as HTMLElement;
    expect(fill.style.width).toBe("75%"); // 100 - 25 = completed fraction
  });

  it("applies the severity class from the ramp", () => {
    const done = render(() => <GapCell remaining={0} total={10} />);
    expect(done.container.querySelector(".sui-gap-cell")!.className).toMatch(/--success/);
    const bad = render(() => <GapCell remaining={9} total={10} />);
    expect(bad.container.querySelector(".sui-gap-cell")!.className).toMatch(/--danger/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Table/GapCell.test.tsx`
Expected: FAIL — `Cannot find module './GapCell'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/Table/GapCell.tsx
// ============================================
// GapCell — Composite (Depth 2) table cell. Zero CSS exception: GapCell.css is
// structural only (the 40×4 inline bar geometry + number/percent stack) — no
// atomic expresses a two-line number+bar cell. Ported from rhinotools'
// migration app: shows REMAINING work (source − landed) as count + % + a thin
// completion bar, colored by severity (all-done green → mostly-remaining red).
// Data-only (no curried variant needed — everything is data, like SortableList).
// ============================================
import { Component, Show } from "solid-js";
import "./GapCell.css";

export type GapSeverity = "success" | "warning" | "danger";

/** Pure ramp over PERCENT REMAINING: 0 → success, ≤50 → warning, >50 → danger. */
export function gapSeverity(pctRemaining: number): GapSeverity {
  if (pctRemaining === 0) return "success";
  if (pctRemaining <= 50) return "warning";
  return "danger";
}

export interface GapCellProps {
  /** Rows still to land (source − bronze). Nullish renders the blank em-dash. */
  remaining: number | null | undefined;
  /** Denominator; 0 renders the blank em-dash. */
  total: number;
}

export const GapCell: Component<GapCellProps> = (props) => {
  const blank = () => props.total === 0 || props.remaining == null;
  const pct = () => (props.total > 0 ? ((props.remaining ?? 0) / props.total) * 100 : 0);
  const severity = () => gapSeverity(pct());
  return (
    <Show when={!blank()} fallback={<span class="sui-gap-cell__blank">—</span>}>
      <div class={`sui-gap-cell sui-gap-cell--${severity()}`}>
        <div class="sui-gap-cell__count">{(props.remaining ?? 0).toLocaleString()}</div>
        <div class="sui-gap-cell__meta">
          <span class="sui-gap-cell__pct">{pct().toFixed(1)}%</span>
          <div class="sui-gap-cell__bar">
            <div class="sui-gap-cell__fill" style={{ width: `${Math.min(100, 100 - pct())}%` }} />
          </div>
        </div>
      </div>
    </Show>
  );
};
```

```css
/* src/components/Table/GapCell.css */
/* ============================================
   GapCell — structural geometry for the count + %/bar stack. Severity color
   rides the theme tokens; the fill bar is the COMPLETED fraction.
   ============================================ */
.sui-gap-cell { font-family: var(--sui-font-mono); line-height: 1.3; }
.sui-gap-cell__blank { font-family: var(--sui-font-mono); color: var(--sui-text-muted); }
.sui-gap-cell__count { font-size: 13px; font-weight: 600; }
.sui-gap-cell__meta { display: flex; align-items: center; gap: 6px; font-size: 11px; }
.sui-gap-cell__bar {
  width: 40px; height: 4px; border-radius: 2px;
  background: color-mix(in srgb, var(--sui-text-primary) 8%, transparent);
  overflow: hidden; flex-shrink: 0;
}
.sui-gap-cell__fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; }
.sui-gap-cell--success { color: var(--sui-success); }
.sui-gap-cell--success .sui-gap-cell__fill { background: var(--sui-success); }
.sui-gap-cell--warning { color: var(--sui-warning); }
.sui-gap-cell--warning .sui-gap-cell__fill { background: var(--sui-warning); }
.sui-gap-cell--danger { color: var(--sui-danger); }
.sui-gap-cell--danger .sui-gap-cell__fill { background: var(--sui-danger); }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Table/GapCell.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Export from the Table barrel**

In `src/components/Table/index.ts` add:

```ts
export { GapCell, gapSeverity } from "./GapCell";
export type { GapCellProps, GapSeverity } from "./GapCell";
```

- [ ] **Step 6: Showcase + catalog**

```tsx
// dev/showcases/gap-cell.tsx
import type { Component } from "solid-js";
import { GapCell } from "../../src/components/Table";
import { BaseTable } from "../../src/components/Table";

export const GapCellShowcase: Component = () => (
  <div class="component-section">
    <h2>GapCell — Composite (Depth 2)</h2>
    <p class="text-meta">
      Remaining-work table cell: count + % + completion bar, severity ramp
      0%→success · ≤50%→warning · &gt;50%→danger. Blank when uncounted.
    </p>
    <div class="example-group">
      <h3>The ramp</h3>
      <table><tbody><tr>
        <td><GapCell remaining={0} total={1000} /></td>
        <td><GapCell remaining={250} total={1000} /></td>
        <td><GapCell remaining={500} total={1000} /></td>
        <td><GapCell remaining={900} total={1000} /></td>
        <td><GapCell remaining={null} total={1000} /></td>
      </tr></tbody></table>
    </div>
  </div>
);
```

In `dev/main.tsx` import `GapCellShowcase` from `./showcases/gap-cell` and add after the table entries:

```ts
{ id: "gap-cell", label: "GapCell", component: GapCellShowcase, tags: ["depth:2", "table", "data"] },
```

- [ ] **Step 7: Docs.** COMPONENTS.md under the Table family:

```markdown
- **GapCell** — Remaining-work table cell: bold count + percentage + a 40×4 completion bar, colored by a severity ramp over percent-remaining (`0`→success, `≤50`→warning, `>50`→danger; pure `gapSeverity()` exported). Blank (`—`) when `total === 0` or `remaining` is nullish. Data-only. Key props: `remaining`, `total`. Use for: census/migration gap columns (source − landed).
```

CHANGELOG.md `[Unreleased]` → `### Added` → one line summarizing the above.

- [ ] **Step 8: Gates + commit**

```bash
npx tsc --noEmit && npx vitest run src/components/Table/ && npm run build
git add src/components/Table/GapCell.tsx src/components/Table/GapCell.css \
        src/components/Table/GapCell.test.tsx src/components/Table/index.ts \
        dev/showcases/gap-cell.tsx dev/main.tsx COMPONENTS.md CHANGELOG.md
git commit -m "feat(Table): GapCell — remaining-work cell with severity ramp"
```

---

### Task 2: CensusView — bucketed census composition

**Files:**
- Create: `src/components/CensusView/censusModel.ts` (types + pure bucketing)
- Create: `src/components/CensusView/censusModel.test.ts`
- Create: `src/components/CensusView/CensusView.tsx`
- Create: `src/components/CensusView/CensusView.test.tsx`
- Create: `src/components/CensusView/index.ts`
- Create: `dev/showcases/census-view.tsx`
- Modify: `src/index.ts`, `dev/main.tsx`, `COMPONENTS.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: `GapCell` (Task 1), `QuickFilter` (`src/components/QuickFilter/`, render-prop `children(filtered, query)`), `BaseTable` with `stickyHeader` (`src/components/Table/BaseTable.tsx`), `InfoPanel` (`src/components/Panel/variants.ts`), `StatusBadge` (`src/components/Badge/StatusBadge.tsx`).
- Produces: `CensusView: Component<CensusViewProps>`, plus exported types `CensusTable`, `CensusColumn`, `NormStatus`, `CensusBucketId`, and pure `bucketOf(t: CensusTable): CensusBucketId`. Per-source adapters (`adaptNetSuite` etc.) STAY in rhinotools — SUI ships the normalized types + view only.

**Types (port verbatim from rhinotools CensusView.tsx — these are the contract):**

```ts
// src/components/CensusView/censusModel.ts
export interface CensusColumn { name: string; type: string }

export type NormStatus =
  | "doing" | "todo" | "pending" | "done"
  | "partial" | "missing" | "overfetch" | "short"
  | "empty" | "skipped" | "noaccess" | "error";

export interface CensusTable {
  key: string;                 // stable unique id
  entity: string;              // display name
  subtitle?: string | null;
  version?: string | null;
  fieldCount: number | null;
  fieldCountByType?: Record<string, number> | null;
  sourceRows: number | null;   // source-of-truth count
  localRows: number | null;    // landed locally
  targetRows?: number | null;
  status: NormStatus;
  rawStatus?: string | null;
  truncated?: boolean | null;
  approx?: boolean | null;
  note?: string | null;
  error?: string | null;
  columns?: CensusColumn[] | null;
  keyLabel?: string | null;
  keyTitle?: string | null;
  pkColumns?: string[] | null;
  detail?: import("solid-js").JSX.Element | null;
}

export type CensusBucketId =
  | "single" | "lt100" | "lt100k" | "lt1m" | "gte1m"
  | "deep" | "empty" | "noaccess";

export const CENSUS_BUCKETS: { id: CensusBucketId; label: string; hint: string }[] = [
  { id: "single",   label: "Single row",  hint: "exactly 1 record" },
  { id: "lt100",    label: "< 100 rows",  hint: "small operational / lookup" },
  { id: "lt100k",   label: "< 100k rows", hint: "" },
  { id: "lt1m",     label: "< 1M rows",   hint: "" },
  { id: "gte1m",    label: "≥ 1M rows",   hint: "" },
  { id: "deep",     label: "Uncounted",   hint: "row count unknown / truncated" },
  { id: "empty",    label: "Empty",       hint: "counted at 0 — nothing to export" },
  { id: "noaccess", label: "No access",   hint: "error / uncountable — row count unknown" },
];

/** Pure bucketing: status buckets win over size buckets. */
export function bucketOf(t: CensusTable): CensusBucketId {
  if (t.status === "noaccess" || t.status === "error") return "noaccess";
  if (t.status === "empty" || t.sourceRows === 0) return "empty";
  if (t.sourceRows == null || t.truncated) return "deep";
  if (t.sourceRows === 1) return "single";
  if (t.sourceRows < 100) return "lt100";
  if (t.sourceRows < 100_000) return "lt100k";
  if (t.sourceRows < 1_000_000) return "lt1m";
  return "gte1m";
}
```

```ts
export interface CensusViewProps {
  tables: CensusTable[];
  /** Row-click target for the sticky detail panel; controlled selection optional. */
  onSelect?: (t: CensusTable | null) => void;
  selectedKey?: string | null;
  /** Source-specific actions rendered at the detail panel foot. */
  actions?: (t: CensusTable) => import("solid-js").JSX.Element | null;
}
```

- [ ] **Step 1: Write the failing model test**

```ts
// src/components/CensusView/censusModel.test.ts
import { describe, it, expect } from "vitest";
import { bucketOf, CENSUS_BUCKETS } from "./censusModel";
import type { CensusTable } from "./censusModel";

const base: CensusTable = {
  key: "t", entity: "T", fieldCount: 3, sourceRows: 50,
  localRows: 0, status: "todo",
};

describe("bucketOf", () => {
  it("status buckets win over size buckets", () => {
    expect(bucketOf({ ...base, status: "noaccess" })).toBe("noaccess");
    expect(bucketOf({ ...base, status: "error" })).toBe("noaccess");
    expect(bucketOf({ ...base, status: "empty" })).toBe("empty");
    expect(bucketOf({ ...base, sourceRows: 0 })).toBe("empty");
  });
  it("uncounted/truncated goes to deep", () => {
    expect(bucketOf({ ...base, sourceRows: null })).toBe("deep");
    expect(bucketOf({ ...base, truncated: true })).toBe("deep");
  });
  it("size tiers", () => {
    expect(bucketOf({ ...base, sourceRows: 1 })).toBe("single");
    expect(bucketOf({ ...base, sourceRows: 99 })).toBe("lt100");
    expect(bucketOf({ ...base, sourceRows: 99_999 })).toBe("lt100k");
    expect(bucketOf({ ...base, sourceRows: 999_999 })).toBe("lt1m");
    expect(bucketOf({ ...base, sourceRows: 1_000_000 })).toBe("gte1m");
  });
  it("bucket registry covers every id bucketOf can return", () => {
    const ids = new Set(CENSUS_BUCKETS.map((b) => b.id));
    for (const id of ["single","lt100","lt100k","lt1m","gte1m","deep","empty","noaccess"])
      expect(ids.has(id as never)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it — FAIL (module missing).** `npx vitest run src/components/CensusView/censusModel.test.ts`

- [ ] **Step 3: Create `censusModel.ts` with the code above. Re-run — PASS.**

- [ ] **Step 4: Commit the model.**

```bash
git add src/components/CensusView/censusModel.ts src/components/CensusView/censusModel.test.ts
git commit -m "feat(CensusView): normalized census types + pure bucketing"
```

- [ ] **Step 5: Write the failing view test**

```tsx
// src/components/CensusView/CensusView.test.tsx
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { CensusView } from "./CensusView";
import type { CensusTable } from "./censusModel";

const tables: CensusTable[] = [
  { key: "a", entity: "Account",  fieldCount: 10, sourceRows: 50,      localRows: 50, status: "done" },
  { key: "b", entity: "Bill",     fieldCount: 40, sourceRows: 500_000, localRows: 0,  status: "todo" },
  { key: "c", entity: "Contact",  fieldCount: 8,  sourceRows: null,    localRows: 0,  status: "todo", truncated: true },
];

describe("CensusView", () => {
  it("groups tables into labeled buckets", () => {
    const { container } = render(() => <CensusView tables={tables} />);
    const text = container.textContent!;
    expect(text).toContain("< 100 rows");
    expect(text).toContain("< 1M rows");
    expect(text).toContain("Uncounted");
    expect(text).toContain("Account");
    expect(text).toContain("Bill");
  });

  it("row click opens the detail panel and fires onSelect", () => {
    let selected: CensusTable | null = null;
    const { container, getAllByText } = render(() => (
      <CensusView tables={tables} onSelect={(t) => (selected = t)} />
    ));
    fireEvent.click(getAllByText("Bill")[0]);
    expect(selected!.key).toBe("b");
    expect(container.querySelector(".sui-census-view__detail")!.textContent).toContain("Bill");
  });

  it("quick filter narrows every bucket", async () => {
    const { container } = render(() => <CensusView tables={tables} />);
    const input = container.querySelector("input")!;
    fireEvent.input(input, { target: { value: "Acc" } });
    expect(container.textContent).toContain("Account");
    expect(container.textContent).not.toContain("Bill");
  });
});
```

- [ ] **Step 6: Run it — FAIL.** `npx vitest run src/components/CensusView/CensusView.test.tsx`

- [ ] **Step 7: Implement `CensusView.tsx`.** Port from `/Users/peter/Documents/clients/PrimeStage/rhinotools/netsuite_extract_rs/ui/src/components/CensusView.tsx` (419 lines) with these SUI substitutions — the porting map:

| rhinotools | SUI replacement |
|---|---|
| hand-rolled bucket grouping | `bucketOf` from censusModel (Step 3) |
| inline search input | `QuickFilter` render-prop wrapping the whole bucket list (`extract={(t) => `${t.entity} ${t.subtitle ?? ""}`}`) |
| per-bucket `<table>` w/ inline styles | `BaseTable` (`stickyHeader`, `compact`) with columns: entity (+subtitle), fields, source rows, local rows, gap → `<GapCell remaining={Math.max(0, (t.sourceRows ?? 0) - (t.localRows ?? 0))} total={t.sourceRows ?? 0} />`, status → `StatusBadge` (map NormStatus → variant: done/`compliant`, error+noaccess/`violation`, partial+short+overfetch/`warning`, todo+pending+doing/`pending`, rest/`info`) |
| right sticky detail `<div>` w/ inline styles | `InfoPanel` inside `.sui-census-view__detail` (position: sticky; top: 0 — the ONE structural CSS exception, declared in the header comment) |
| detail contents | counts row (`NumberWithUnits`), key chip (`StatusBadge` info w/ `keyLabel`), column-type chips (`CountChip` if present, else plain `StatusBadge`), schema list (`columns` as a compact `BaseTable`), then `props.actions?.(t)` |
| selection | uncontrolled signal + honor `selectedKey`/`onSelect` when provided (same controlled/uncontrolled split as ActionList) |

Header comment: `CensusView — Composite (Depth 3). Zero CSS except CensusView.css structural exception: the two-column grid + sticky detail rail geometry.` Component skeleton:

```tsx
export const CensusView: Component<CensusViewProps> = (props) => {
  const [localSel, setLocalSel] = createSignal<string | null>(null);
  const selKey = () => props.selectedKey !== undefined ? props.selectedKey : localSel();
  const select = (t: CensusTable | null) => { setLocalSel(t?.key ?? null); props.onSelect?.(t); };
  const selected = () => props.tables.find((t) => t.key === selKey()) ?? null;
  const buckets = (list: readonly CensusTable[]) => {
    const by = new Map<CensusBucketId, CensusTable[]>();
    for (const t of list) { const b = bucketOf(t); (by.get(b) ?? by.set(b, []).get(b)!).push(t); }
    return CENSUS_BUCKETS.filter((b) => by.has(b.id)).map((b) => ({ ...b, tables: by.get(b.id)! }));
  };
  return (
    <div class="sui-census-view">
      <QuickFilter items={props.tables} extract={(t) => `${t.entity} ${t.subtitle ?? ""}`}>
        {(filtered) => (
          <div class="sui-census-view__buckets">
            <For each={buckets(filtered)}>{(b) => (
              <section>
                <h3>{b.label} <span class="text-meta">{b.hint}</span></h3>
                <BaseTable stickyHeader compact data={b.tables} columns={CENSUS_COLUMNS(select)} onRowClick={(t) => select(t)} />
              </section>
            )}</For>
          </div>
        )}
      </QuickFilter>
      <Show when={selected()}>{(t) => (
        <div class="sui-census-view__detail"><InfoPanel title={t().entity}>{/* counts, chips, schema, actions — per porting map */}</InfoPanel></div>
      )}</Show>
    </div>
  );
};
```

(Adapt `BaseTable`'s actual column/data prop names from `src/components/Table/BaseTable.tsx` while implementing — the test in Step 5 is the contract, not this sketch.)

- [ ] **Step 8: Run the view test — PASS. Run whole suite:** `npx vitest run src/components/CensusView/`

- [ ] **Step 9: Barrel, showcase, catalog, docs.**
  - `src/components/CensusView/index.ts`: export `CensusView`, `CensusViewProps`, everything from `./censusModel`.
  - `src/index.ts`: `export * from "./components/CensusView";`
  - `dev/showcases/census-view.tsx`: seed ~12 fake `CensusTable`s covering every bucket (incl. an error, an empty, a truncated) + a working `actions` slot (a `GhostButton` logging to a signal shown on the page) + note that adapters stay app-side. Register in `dev/main.tsx`: `{ id: "census-view", label: "CensusView", component: CensusViewShowcase, tags: ["depth:3", "table", "data"] }`. Seed MORE rows than fit and give the bucket tables a `maxHeight` so sticky-header scrolling is visible (showcase-tables-must-demonstrate-scroll).
  - COMPONENTS.md entry (CensusView + the exported model types + bucketOf) and CHANGELOG [Unreleased] line.

- [ ] **Step 10: Gates + commit** (same gate trio; stage only the files above) — `feat(CensusView): bucketed census composition with sticky detail rail`.

---

### Task 3: ServiceHealthDot — app-shell heartbeat dot (CONFIRM WITH PETER FIRST)

Per sui-start-minimal-expand-on-demand this is flagged, not assumed: the proposal's "Sparkline" is covered by existing components; the actually-reusable unit in rhinotools' AppNav is the **dot + name + hover popover** cluster (ServiceDot, AppNav.tsx:21–130). If Peter wants it in SUI (dside's navbar is a plausible second caller), build it; otherwise rhinotools keeps composing `HeartbeatSparkline` locally. **Ask before starting this task.**

**Files:** Create `src/components/ServiceHealthDot/{ServiceHealthDot.tsx,ServiceHealthDot.css,ServiceHealthDot.test.tsx,index.ts}`, `dev/showcases/service-health-dot.tsx`; modify `src/index.ts`, `dev/main.tsx`, `COMPONENTS.md`, `CHANGELOG.md`.

**Interfaces:**
- Consumes: `HeartbeatSparkline` (`state: "connected"|"disconnected"|"error"`, `samples: number[]` 0..1 oldest-first, `width/height/pulse`).
- Produces: `ServiceHealthDot: Component<ServiceHealthDotProps>`:

```ts
export interface ServiceHealthDotProps {
  name: string;
  /** ms since last heartbeat; null/undefined = never seen (dead). */
  ageMs: number | null | undefined;
  /** Staleness horizon; alive iff ageMs < staleThresholdMs. Default 15_000. */
  staleThresholdMs?: number;
  /** 0..1 fraction-of-timeout samples for the hover sparkline (oldest first). */
  samples: number[];
}
```

**Behavior (port of ServiceDot, tokens swapped):** 6px dot + name; alive → success color with opacity decaying `1 → 0.15` as `ageMs/staleThresholdMs → 1`; dead → danger color, full opacity, 1s pulse animation. Hover reveals a popover: "`{name} — {age}s ago` | dead", a `HeartbeatSparkline` (`state={alive ? "connected" : "error"}`), and a "Xs ago / now" footer. The 1 Hz ticking/history accumulation stays in the CALLER (data-in, per the no-clock rule elsewhere in SUI) — the component is pure render of `ageMs` + `samples`.

**Steps (same TDD cycle as Tasks 1–2):** failing test (alive/dead class + opacity math via inline style assertion + popover appears on mouseenter), implement, pass, showcase with a fake ticking harness in the showcase file only, docs, gates, commit `feat(ServiceHealthDot): app-shell heartbeat dot with hover sparkline`.

Test skeleton:

```tsx
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { ServiceHealthDot } from "./ServiceHealthDot";

describe("ServiceHealthDot", () => {
  it("alive: success tone, opacity decays with age", () => {
    const { container } = render(() => (
      <ServiceHealthDot name="broker" ageMs={7_500} staleThresholdMs={15_000} samples={[0.1, 0.5]} />
    ));
    const root = container.querySelector(".sui-service-health-dot")!;
    expect(root.className).toMatch(/--alive/);
    const dot = container.querySelector(".sui-service-health-dot__dot") as HTMLElement;
    expect(parseFloat(dot.style.opacity)).toBeCloseTo(0.575, 2); // 1 - 0.5*0.85
  });
  it("dead: danger tone at full opacity", () => {
    const { container } = render(() => (
      <ServiceHealthDot name="broker" ageMs={null} samples={[]} />
    ));
    expect(container.querySelector(".sui-service-health-dot")!.className).toMatch(/--dead/);
  });
  it("hover reveals the sparkline popover", () => {
    const { container } = render(() => (
      <ServiceHealthDot name="broker" ageMs={1000} samples={[0.1, 0.2]} />
    ));
    fireEvent.mouseEnter(container.querySelector(".sui-service-health-dot")!);
    expect(container.querySelector(".sui-service-health-dot__popover")).toBeTruthy();
  });
});
```

---

### Task 4: Coverage closure for the already-shipped components

**Files:**
- Create: `dev/showcases/trend-sparkline.tsx` (TrendSparkline has NO showcase today)
- Modify: `dev/main.tsx` (register it)
- Modify: `COMPONENTS.md` (add the missing entries: **RingChart**, **WorkerCard**, **TrendSparkline**; verify ExtractionBoard/ThroughputChart/HeartbeatSparkline entries exist and are accurate — fix if stale)
- Modify: `CHANGELOG.md` [Unreleased] (`### Changed` — docs/showcase coverage)

**Interfaces:** consumes only existing public APIs; produces docs.

- [ ] **Step 1: TrendSparkline showcase** — values arrays for up/down/flat trends, a `yDomain` example, and a live-appending signal demo; `.component-section` idiom; register `{ id: "trend-sparkline", label: "TrendSparkline", component: TrendSparklineShowcase, tags: ["depth:1", "chart", "indicator"] }`.
- [ ] **Step 2: COMPONENTS.md entries.** Follow the StatusBadge one-liner format; APIs verbatim from the source files:
  - RingChart: `segments: {value, color, animate?}[]`, `total`, `label`, `sublabel?`, `size?` — radial donut gauge w/ auto-fitting bold center label.
  - WorkerCard: document the ACTUAL props from `src/components/WorkerCard/WorkerCard.tsx` (read the file; do not trust this plan for its API).
  - TrendSparkline: `values`, `trend` (+ exported `trendOf(initial, final)`), `width/height/capacity/yDomain`.
- [ ] **Step 3: Sanity-check the four existing showcases render** (gallery on :6006) — fix only breakage, no redesigns.
- [ ] **Step 4: Gates + commit** — `docs: close showcase/COMPONENTS.md coverage for chart/worker components`.

---

### Task 5: Release + rhinotools handoff note

- [ ] **Step 1:** Full gates: `npx tsc --noEmit && npm test && npm run build` — all green.
- [ ] **Step 2:** CHANGELOG: move `[Unreleased]` into `## 0.101.0` (minor — new components).
- [ ] **Step 3:** `npm version 0.101.0 --no-git-tag-version`; commit `chore: release 0.101.0`; `git tag v0.101.0`; push main + tag (CI publishes on the package.json change).
- [ ] **Step 4:** Confirm: `gh run list --workflow=publish.yml --limit 1` succeeds and `npm view @primestageprime/solid-ui-components version --registry=https://npm.pkg.github.com` → `0.101.0`.
- [ ] **Step 5:** Report the rhinotools follow-ups (separate repo, separate approval): (a) swap dep `github:primestageprime/solid-ui-components` → `@primestageprime/solid-ui-components@^0.101.0`; (b) replace local `GapCell.tsx` + `CensusView.tsx` + `censusAdapters.tsx`'s view half with the SUI imports (adapters stay); (c) if Task 3 shipped, replace AppNav's ServiceDot with `ServiceHealthDot` fed by the existing 1 Hz tick.

---

## Self-review notes

- Spec coverage: proposals #1 (sparkline) → covered by existing components + optional Task 3; #2 (ThroughputChart) → exists, Task 4 verifies docs; #3 (ExtractionBoard) → exists; #4 (WorkerCard) → exists, Task 4 docs; #5 (RingChart) → exists, Task 4 docs; #6 (GapCell) → Task 1; #7 (CensusView) → Task 2. Every proposal accounted for.
- Type consistency: `GapCellProps.remaining: number | null | undefined` matches CensusView's `<GapCell remaining={…}>` usage; `bucketOf`/`CENSUS_BUCKETS`/`CensusBucketId` names used consistently across Tasks 2 steps; Task 3 consumes HeartbeatSparkline's real props (`state/samples/width/height/pulse`).
- Known intentional looseness: Task 2 Step 7 says "adapt BaseTable's actual column/data prop names while implementing" — the Step 5 test is the binding contract; BaseTable's generic API was not captured verbatim by the scout.
