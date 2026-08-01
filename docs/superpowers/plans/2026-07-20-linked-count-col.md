# linkedCountCol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `linkedCountCol` field factory — an integer count that links into a drill-down href when positive and renders a plain cell (never a dead link) at zero/null — and collapse the bench's hand-rolled `bucketCol` onto it.

**Architecture:** The factory is a thin named composition, not a re-implementation: `withHref` over `intCol`, with the one new behavior (the positivity gate) as a named local reader. Spec: `docs/superpowers/specs/2026-07-20-linked-count-col-design.md` (approved 2026-07-20).

**Tech Stack:** SolidJS + vitest + @solidjs/testing-library, existing `src/components/Table/fields` module conventions.

## Global Constraints

- Named functions over method chains; named steps; derive-don't-duplicate (Peter's functional doctrine — ratchet-enforced).
- `href` is REQUIRED in opts — a linked count without a destination is just `intCol`.
- No `suffix` option (start-minimal; add on demand).
- Zero or null count → nullish href → `withHref`'s existing plain-cell path. Null still renders BLANK (inherited intCol ruling 2026-07-18).
- The shared git index is multi-agent: `git add` explicit paths only, commit in the same step, never leave changes staged. Do NOT touch `src/components/Placeholder/`, `src/index.ts`, `src/components/Layout/variants.ts`, `docs/agents/design-decision-tree.md`, or `scripts/health-history.json` — they belong to another session.
- Gates before claiming done: `npx tsc --noEmit` and `npx vitest run` (repo root `/Users/peter/Documents/clients/PrimeStage/platform/solid-ui-components`).

---

### Task 1: `linkedCountCol` factory

**Files:**
- Create: `src/components/Table/fields/linked-count.tsx`
- Create: `src/components/Table/fields/linked-count.test.tsx`
- Modify: `src/components/Table/fields/index.ts` (add export lines after the `intCol` exports, line 27)

**Interfaces:**
- Consumes: `intCol` + `IntColOpts` from `./int`; `withHref` from `./combinators`; `readerOf`, `FieldCol`, `ToneFn`, `ValueSource` from `./shared`.
- Produces: `linkedCountCol<T>(source: ValueSource<T, number | null | undefined>, opts: LinkedCountColOpts<T>): FieldCol<T>` and `interface LinkedCountColOpts<T> { href: (row: T) => string; header?: string; id?: string; tone?: ToneFn<T, number> }`, exported from the fields barrel. Task 2 imports `linkedCountCol` from `../../../../src/components/Table/fields`.

- [ ] **Step 1: Write the failing test**

Create `src/components/Table/fields/linked-count.test.tsx`:

```tsx
import type { JSX } from "solid-js";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { linkedCountCol } from "./linked-count";
import { geo } from "./int";
import type { FieldCol } from "./shared";

afterEach(cleanup);

interface Row {
  flow: number | null;
  asset: string;
}

const detailHref = (row: Row): string =>
  `/detail?asset=${row.asset}&bucket=flow`;

const renderCell = (col: FieldCol<Row>, row: Row) =>
  render(() => <>{(col.accessor as (row: Row) => JSX.Element)(row)}</>);

describe("linkedCountCol", () => {
  it("inherits intCol column shape: id, right-align, int geometry, numeric sortValue", () => {
    const col = linkedCountCol<Row>("flow", { href: detailHref });
    expect(col.id).toBe("flow");
    expect(col.align).toBe("right");
    expect(col.width).toBe(geo.css);
    expect(col.sortValue?.({ flow: 7, asset: "B-1" })).toBe(7);
  });

  it("a positive count renders the formatted value inside a drill-down link", () => {
    const col = linkedCountCol<Row>("flow", { href: detailHref });
    const { container } = renderCell(col, { flow: 22, asset: "B-14" });
    const link = container.querySelector("a.sui-field-link");
    expect(link?.getAttribute("href")).toBe("/detail?asset=B-14&bucket=flow");
    expect(link?.querySelector(".cell-int")?.textContent).toBe("22");
  });

  it("a zero count renders the plain cell — never a dead link", () => {
    const col = linkedCountCol<Row>("flow", { href: detailHref });
    const { container } = renderCell(col, { flow: 0, asset: "B-14" });
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector(".cell-int")?.textContent).toBe("0");
  });

  it("a null count renders blank with no link (inherited intCol ruling)", () => {
    const col = linkedCountCol<Row>("flow", { href: detailHref });
    const { container } = renderCell(col, { flow: null, asset: "B-14" });
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("tone applies inside the link", () => {
    const col = linkedCountCol<Row>("flow", {
      href: detailHref,
      tone: (value) => (value > 0 ? "danger" : "default"),
    });
    const { container } = renderCell(col, { flow: 3, asset: "B-14" });
    const link = container.querySelector("a.sui-field-link");
    expect(link?.querySelector(".sui-field-tone--danger")).not.toBeNull();
  });

  it("derived source names its id and gates on the derived value", () => {
    const col = linkedCountCol<Row>((row) => (row.flow ?? 0) * 2, {
      id: "flow_x2",
      header: "Flow ×2",
      href: detailHref,
    });
    expect(col.id).toBe("flow_x2");
    const { container } = renderCell(col, { flow: 0, asset: "B-14" });
    expect(container.querySelector("a")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Table/fields/linked-count.test.tsx`
Expected: FAIL — cannot resolve `./linked-count`.

- [ ] **Step 3: Write the implementation**

Create `src/components/Table/fields/linked-count.tsx`:

```tsx
// Table field — linked count (Depth 1: composes intCol + withHref).
// An integer count that drills into a worklist: a POSITIVE count links via
// `href`; zero or null renders the plain cell, never a dead link. The gate is
// a count SEMANTIC — a zero count has no destination — which is why this is a
// factory and not a per-call-site ternary (scoped exception to the 2026-07-20
// combinator-first ruling; spec: docs/superpowers/specs/
// 2026-07-20-linked-count-col-design.md).
// Everything else — geometry, IntCell formatting, numeric sort, null-blank,
// tone — is intCol's, untouched.
import { intCol } from "./int";
import { withHref } from "./combinators";
import {
  readerOf,
  type FieldCol,
  type ToneFn,
  type ValueSource,
} from "./shared";

export interface LinkedCountColOpts<T> {
  /** Drill-down destination for a POSITIVE count — required: a linked count
   *  without a destination is just intCol. */
  href: (row: T) => string;
  /** Header label (default: humanized id). */
  header?: string;
  /** Column id — REQUIRED when the source is a derived function. */
  id?: string;
  /** Configure-time treatment: (value, row) → Tone. */
  tone?: ToneFn<T, number>;
}

/** A whole-number drill-down column: count > 0 links via `href`; zero/null
 *  takes withHref's plain-cell path. */
export const linkedCountCol = <T,>(
  source: ValueSource<T, number | null | undefined>,
  opts: LinkedCountColOpts<T>,
): FieldCol<T> => {
  const read = readerOf(source);
  const drillHref = (row: T): string | null => {
    const value = read(row);
    return value != null && value > 0 ? opts.href(row) : null;
  };
  return withHref(
    drillHref,
    intCol(source, { header: opts.header, id: opts.id, tone: opts.tone }),
  );
};
```

Then add to `src/components/Table/fields/index.ts`, directly after the `IntColOpts` export (line 27):

```ts
export { linkedCountCol } from "./linked-count";
export type { LinkedCountColOpts } from "./linked-count";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Table/fields/linked-count.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck and full-suite gate**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc silent; all test files pass (2218+ tests, +6 new).

- [ ] **Step 6: Commit**

```bash
git add src/components/Table/fields/linked-count.tsx src/components/Table/fields/linked-count.test.tsx src/components/Table/fields/index.ts
git commit -m "feat(fields): linkedCountCol — drill-down count, plain cell at zero" -- src/components/Table/fields/linked-count.tsx src/components/Table/fields/linked-count.test.tsx src/components/Table/fields/index.ts
```

---

### Task 2: Collapse the bench's `bucketCol` onto `linkedCountCol`

**Files:**
- Modify: `dev/showcases/workshop/jtf-tables/triage.tsx:99-115` (the `bucketCol` helper) and its import block (lines 23-32).

**Interfaces:**
- Consumes: `linkedCountCol` from `../../../../src/components/Table/fields` (Task 1).
- Produces: no new interfaces — `TRIAGE_REGISTRY` keeps the same field ids; the rendered table must be visually identical (same links, same zeros-unlinked, same danger tone on Escalated).

- [ ] **Step 1: Rewrite `bucketCol` over linkedCountCol**

In `dev/showcases/workshop/jtf-tables/triage.tsx`, add `linkedCountCol` to the existing fields import (keep `withHref` only if still used elsewhere in the file — it is not; remove it):

```tsx
import {
  SortableFieldTable,
  intCol,
  floatCol,
  statusCol,
  identityLinkCol,
  linkedCountCol,
  withHint,
  type StatusColMapping,
} from "../../../../src/components/Table/fields";
```

Replace the `bucketCol` helper (lines 99-115) with:

```tsx
// A bucket column: the linked COUNT under a tooltip header —
// withHint(linkedCountCol). The zero-has-no-destination gate lives in the
// factory now (spec 2026-07-20); the old "P% (N)" composite collapses to the
// count (ruled 2026-07-20). Escalated wears a danger tone.
const bucketCol = (
  key: "flow" | "pressure" | "thc" | "nh3" | "escalated" | "explained" | "good_to_go",
  header: string,
  hint: string,
  danger = false,
) =>
  withHint(
    hint,
    linkedCountCol<TriageAsset>(key, {
      href: (a) => detailHref(a, key),
      header,
      tone: danger ? (v) => (v > 0 ? "danger" : "default") : undefined,
    }),
  );
```

- [ ] **Step 2: Typecheck and test gate**

Run: `npx tsc --noEmit && npm run typecheck:dev && npx vitest run`
Expected: both tsc runs silent (ignore any `src/components/Placeholder/` noise from the other session — but do NOT ignore triage.tsx errors); full suite passes.

- [ ] **Step 3: Visual check on the bench**

With the dev gallery on port 6006, open
`http://localhost:6006/#/workshop:jtf-tables?t=qa-qc-asset-triage` and confirm:
non-zero bucket counts are accent links, zero counts are plain unlinked cells,
Escalated positives are danger-toned. (Screenshot for the record.)

- [ ] **Step 4: Commit**

```bash
git add dev/showcases/workshop/jtf-tables/triage.tsx
git commit -m "refactor(bench,QaqcTriage): bucketCol onto linkedCountCol" -- dev/showcases/workshop/jtf-tables/triage.tsx
```

---

### Task 3: Field-type catalog entry

**Files:**
- Modify: `docs/superpowers/plans/2026-07-17-field-type-catalog.md` (append to the catalog's factory list, following the doc's existing entry format — read the doc first and match it).

**Interfaces:**
- Consumes: nothing from other tasks (documentation only).
- Produces: nothing — later readers rely on the catalog naming `linkedCountCol` and its ruling.

- [ ] **Step 1: Add the catalog entry**

Append an entry (matching the doc's established format for shipped field types) covering:

- `linkedCountCol(source, { href, header?, id?, tone? })` — integer drill-down count; positive links via `href`, zero/null renders the plain cell, never a dead link.
- Ruling recorded: scoped exception to the 2026-07-20 combinator-first ruling — zero-has-no-destination is a count *semantic*, not a decoration. `withHrefWhen` combinator considered and rejected (no second caller; start-minimal).
- Spec pointer: `docs/superpowers/specs/2026-07-20-linked-count-col-design.md`.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-07-17-field-type-catalog.md
git commit -m "docs(field-type-catalog): record linkedCountCol + scoped factory ruling" -- docs/superpowers/plans/2026-07-17-field-type-catalog.md
```

---

## Out of scope

jtf-ui's `QaqcAssetTriage.tsx` gets the same collapse as a follow-up in that
repo once SUI publishes (its commits ride the same unpushed batch — see the
open push-authorization question).
