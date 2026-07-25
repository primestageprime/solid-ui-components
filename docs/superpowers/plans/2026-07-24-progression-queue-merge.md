# ProgressionQueue Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse `SplitQueueList` into `ProgressionQueue` so the library ships one queue component with the union of both feature sets and a smaller public surface than either.

**Architecture:** `ProgressionQueue` already models N sections via `sections` + `bucketOf`. This plan adds the capabilities `SplitQueueList` had — multi-select grouping, roving-focus keyboard nav, `scrollToKey`, and transfer animation — by (a) extracting a pure core that answers "what moved" as a map diff with no DOM, (b) putting the animation behind a one-interface choreographer seam so the shipped slot animation can later be swapped for a flying clone without touching the component, and (c) reducing `SplitQueueList` to a deprecated compile shim over the merged component.

**Tech Stack:** SolidJS, TypeScript, Vitest + `@solidjs/testing-library` (jsdom), Biome, Vite.

**Spec:** `docs/superpowers/specs/2026-07-24-progression-queue-merge-design.md` — read it before starting.

## Global Constraints

- **Never hardcode a color.** Every color is a `--sui-*` token from `src/themes/`. Must be correct in light and dark.
- **Role color is confined to the section dot.** Checks, focus rings, and selection cues use neutral/accent tokens — never success/danger/warning.
- **No new required props.** Every addition is optional.
- **There is no `selectMode` prop.** Select mode is on iff `checkedKeys` is present. An empty `Set` means "mode on, nothing checked".
- **500 lines is the repo's hard limit** (global CLAUDE.md, split by concern). The ~250 figure elsewhere in this plan is a target for *new* modules, not a per-task gate — `ProgressionQueue.tsx` legitimately accumulates across Tasks 2-7 and passing 250 is expected, not a violation to report. Two real thresholds: if `ProgressionQueue.tsx` approaches **350**, extract the row render into a sibling module; `ProgressionQueue.test.tsx` was **487 lines after Task 5** and MUST be split by concern before it crosses 500 (Task 7 owns that split).
- **Functional style:** pure functions, `const` arrow exports, prefer `fn` combinators (`src/fn`) or array methods over `for`/`while`. Local mutation inside a pure function is fine.
- **After every commit run:** `npx tsc --noEmit` (must be clean) and the SCOPED lint `npx biome lint src/components/ProgressionQueue src/components/SplitQueueList`.
- **Do NOT gate on `npx biome lint src`.** The repo baseline is **14 errors / 31 warnings** in files this work never touches; a whole-`src` gate can never go green and is not your job to fix. Verified 2026-07-24.
- **The scoped lint baseline is 4 errors**, all in `ProgressionQueue.tsx`: two `noAssignInExpressions` (the `ref={(el) => (cond ? (ref = el) : undefined)}` idiom) and two a11y errors on the row div (`useKeyWithClickEvents`, `noStaticElementInteractions`). Your task must never *increase* this count. Task 2 clears the two `noAssignInExpressions`; Task 4 clears the two a11y errors by giving rows `role="option"` and a keydown handler. **From Task 4 onward the scoped lint must report zero errors.**
- **Solid reactivity:** never destructure `props`. Read `props.x` at the point of use.
- **jsdom has no layout.** `getBoundingClientRect()` returns zeros and `Element.prototype.animate` is undefined. All motion code must feature-detect and short-circuit; visual verification happens in the dev showcase, not in tests.

---

### Task 1: The pure core — bucketing and transfer detection

Two DOM-free modules. `bucketItems` does one pass over `items` producing both the per-section row arrays and the key→section map; `diffTransfers` answers "what moved" as a map diff.

**Files:**
- Create: `src/components/ProgressionQueue/bucketing.ts`
- Create: `src/components/ProgressionQueue/bucketing.test.ts`
- Create: `src/components/ProgressionQueue/transfer.ts`
- Create: `src/components/ProgressionQueue/transfer.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `bucketItems<T>(items: readonly T[], sectionKeys: readonly string[], bucketOf: (item: T) => string, keyOf: (item: T) => string): Buckets<T>` where `Buckets<T> = { bySection: Map<string, T[]>; sectionOf: Map<string, string> }`
  - `diffTransfers(prev: ReadonlyMap<string, string>, next: ReadonlyMap<string, string>, sectionOrder: readonly string[]): Transfer[]` where `Transfer = { key: string; from: string; to: string; direction: 1 | -1 }`

- [ ] **Step 1: Write the failing bucketing test**

Create `src/components/ProgressionQueue/bucketing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { bucketItems } from "./bucketing";

interface Item {
  id: string;
  bucket: string;
}

const keyOf = (i: Item) => i.id;
const bucketOf = (i: Item) => i.bucket;
const SECTIONS = ["a", "b", "c"];

describe("bucketItems", () => {
  it("returns an entry for every section, including empty ones", () => {
    const { bySection } = bucketItems([{ id: "1", bucket: "a" }], SECTIONS, bucketOf, keyOf);
    expect([...bySection.keys()]).toEqual(["a", "b", "c"]);
    expect(bySection.get("b")).toEqual([]);
  });

  it("preserves `items` order within a section", () => {
    const items = [
      { id: "1", bucket: "a" },
      { id: "2", bucket: "b" },
      { id: "3", bucket: "a" },
    ];
    const { bySection } = bucketItems(items, SECTIONS, bucketOf, keyOf);
    expect(bySection.get("a")?.map(keyOf)).toEqual(["1", "3"]);
  });

  it("maps each item key to the section it landed in", () => {
    const items = [
      { id: "1", bucket: "a" },
      { id: "2", bucket: "c" },
    ];
    const { sectionOf } = bucketItems(items, SECTIONS, bucketOf, keyOf);
    expect(sectionOf.get("1")).toBe("a");
    expect(sectionOf.get("2")).toBe("c");
  });

  it("drops an item whose bucket matches no section, and omits it from sectionOf", () => {
    const items = [
      { id: "1", bucket: "a" },
      { id: "ghost", bucket: "nope" },
    ];
    const { bySection, sectionOf } = bucketItems(items, SECTIONS, bucketOf, keyOf);
    expect([...bySection.values()].flat().map(keyOf)).toEqual(["1"]);
    expect(sectionOf.has("ghost")).toBe(false);
  });

  it("returns empty structures for empty input", () => {
    const { bySection, sectionOf } = bucketItems([], SECTIONS, bucketOf, keyOf);
    expect([...bySection.values()].flat()).toEqual([]);
    expect(sectionOf.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/ProgressionQueue/bucketing.test.ts`
Expected: FAIL — `Failed to resolve import "./bucketing"`.

- [ ] **Step 3: Implement `bucketing.ts`**

Create `src/components/ProgressionQueue/bucketing.ts`:

```ts
// ProgressionQueue — bucketing. ONE pass over `items` produces BOTH the
// per-section row arrays the render needs AND the key → section map the
// transfer diff needs, so the two can never disagree about where an item is.
// (The accumulator is mutated locally; the function itself is pure.)

export interface Buckets<T> {
  /** Section key → its items in `items` order. Every section key is present. */
  bySection: Map<string, T[]>;
  /** Item key → the section key it landed in. Unknown buckets are omitted. */
  sectionOf: Map<string, string>;
}

export const bucketItems = <T>(
  items: readonly T[],
  sectionKeys: readonly string[],
  bucketOf: (item: T) => string,
  keyOf: (item: T) => string,
): Buckets<T> =>
  items.reduce<Buckets<T>>(
    (acc, item) => {
      // An item whose bucket matches no declared section renders nowhere.
      const rows = acc.bySection.get(bucketOf(item));
      if (!rows) return acc;
      rows.push(item);
      acc.sectionOf.set(keyOf(item), bucketOf(item));
      return acc;
    },
    {
      bySection: new Map(sectionKeys.map((k) => [k, [] as T[]])),
      sectionOf: new Map(),
    },
  );
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/components/ProgressionQueue/bucketing.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Write the failing transfer test**

Create `src/components/ProgressionQueue/transfer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { diffTransfers } from "./transfer";

const ORDER = ["done", "todo", "hold"];
const m = (pairs: [string, string][]) => new Map(pairs);

describe("diffTransfers", () => {
  it("reports nothing when no item changed section", () => {
    const prev = m([["1", "todo"]]);
    expect(diffTransfers(prev, m([["1", "todo"]]), ORDER)).toEqual([]);
  });

  it("reports a move UP the section order with direction -1", () => {
    const moves = diffTransfers(m([["1", "todo"]]), m([["1", "done"]]), ORDER);
    expect(moves).toEqual([{ key: "1", from: "todo", to: "done", direction: -1 }]);
  });

  it("reports a move DOWN the section order with direction 1", () => {
    const moves = diffTransfers(m([["1", "done"]]), m([["1", "todo"]]), ORDER);
    expect(moves).toEqual([{ key: "1", from: "done", to: "todo", direction: 1 }]);
  });

  it("reports a non-adjacent move in one hop", () => {
    const moves = diffTransfers(m([["1", "hold"]]), m([["1", "done"]]), ORDER);
    expect(moves).toEqual([{ key: "1", from: "hold", to: "done", direction: -1 }]);
  });

  it("reports every move when several change at once", () => {
    const prev = m([["1", "todo"], ["2", "todo"], ["3", "done"]]);
    const next = m([["1", "done"], ["2", "hold"], ["3", "done"]]);
    const moves = diffTransfers(prev, next, ORDER);
    expect(moves.map((t) => t.key).sort()).toEqual(["1", "2"]);
  });

  it("does not report an item that is newly present (an add is not a move)", () => {
    expect(diffTransfers(m([]), m([["1", "todo"]]), ORDER)).toEqual([]);
  });

  it("does not report an item that disappeared (a remove is not a move)", () => {
    expect(diffTransfers(m([["1", "todo"]]), m([]), ORDER)).toEqual([]);
  });

  it("does not report a reorder inside one section", () => {
    const prev = m([["1", "todo"], ["2", "todo"]]);
    const next = m([["2", "todo"], ["1", "todo"]]);
    expect(diffTransfers(prev, next, ORDER)).toEqual([]);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/components/ProgressionQueue/transfer.test.ts`
Expected: FAIL — `Failed to resolve import "./transfer"`.

- [ ] **Step 7: Implement `transfer.ts`**

Create `src/components/ProgressionQueue/transfer.ts`:

```ts
// ProgressionQueue — "what moved", as a pure map diff. An item MOVED iff it was
// present before and its section changed; adds, removes and intra-section
// reorders are not moves. Because a move is one atomic mutation of `items`,
// there is no intermediate state where an item belongs to no section — the
// whole class of two-array-diff bugs SplitQueueList defended against cannot
// arise here.

export interface Transfer {
  key: string;
  /** Section key it left. */
  from: string;
  /** Section key it landed in. */
  to: string;
  /** +1 = moved DOWN the section order, -1 = moved UP. */
  direction: 1 | -1;
}

export const diffTransfers = (
  prev: ReadonlyMap<string, string>,
  next: ReadonlyMap<string, string>,
  sectionOrder: readonly string[],
): Transfer[] =>
  [...next].flatMap(([key, to]) => {
    const from = prev.get(key);
    if (from === undefined || from === to) return [];
    const delta = sectionOrder.indexOf(to) - sectionOrder.indexOf(from);
    if (delta === 0) return [];
    return [{ key, from, to, direction: delta > 0 ? 1 : -1 } as Transfer];
  });
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npx vitest run src/components/ProgressionQueue/transfer.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 9: Verify the whole suite and the type/lint gates**

Run: `npx vitest run src/components/ProgressionQueue && npx tsc --noEmit && npx biome lint src/components/ProgressionQueue src/components/SplitQueueList`
Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add src/components/ProgressionQueue/bucketing.ts src/components/ProgressionQueue/bucketing.test.ts src/components/ProgressionQueue/transfer.ts src/components/ProgressionQueue/transfer.test.ts
git commit -m "feat(progression-queue): add pure bucketing + transfer-diff core"
```

---

### Task 2: New public types, and adopt bucketing in the shell

Replace the props interface with the merged 14-prop surface and rewire the component to the memoized bucketing. Behavior visible in this task: `section.emptyLabel` renders in an empty section's collapsed strip.

**Files:**
- Modify: `src/components/ProgressionQueue/types.ts` (full rewrite)
- Modify: `src/components/ProgressionQueue/ProgressionQueue.tsx:32-130`
- Modify: `src/components/ProgressionQueue/ProgressionQueue.css` (append the empty-strip rule)
- Modify: `src/components/ProgressionQueue/ProgressionQueue.test.tsx` (append)

**Interfaces:**
- Consumes: `bucketItems` from Task 1.
- Produces: `ProgressionQueueProps<T>` and `ProgressionSection` with the fields listed below — every later task adds behavior against these exact names.

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe("ProgressionQueue", …)` block in `src/components/ProgressionQueue/ProgressionQueue.test.tsx`:

```tsx
  it("renders a section's emptyLabel when it has no items", () => {
    const sections: ProgressionSection[] = [
      { key: "a", label: "Alpha", tone: "success" },
      { key: "b", label: "Beta", tone: "accent", emptyLabel: "All clear" },
    ];
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={sections}
        items={[{ id: "1", bucket: "a" }]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    expect(container.querySelector(".prog-queue__empty")?.textContent).toBe("All clear");
  });

  it("omits the empty strip when a section declares no emptyLabel", () => {
    const { container } = renderQueue([{ id: "1", bucket: "a" }]);
    expect(container.querySelector(".prog-queue__empty")).toBeNull();
  });

  it("renders nothing for an item whose bucket matches no section", () => {
    const { container } = renderQueue([
      { id: "real", bucket: "a" },
      { id: "ghost", bucket: "nowhere" },
    ]);
    expect(container.textContent).toContain("real");
    expect(container.textContent).not.toContain("ghost");
  });

  // Sizing is deterministic in jsdom: measurement returns 0, so the component
  // keeps its fallbacks (header 34, row 54, +2 border). With height=600 and
  // three sections at gap 8, the two empty sections take 36 each, leaving
  // ample pool — so each populated section gets exactly its natural height.
  const FIVE_IN_A: Item[] = [1, 2, 3, 4, 5].map((n) => ({
    id: String(n),
    bucket: "a",
  }));

  const sectionHeights = (container: HTMLElement) =>
    [...container.querySelectorAll(".prog-queue__section")].map(
      (s) => (s as HTMLElement).style.height,
    );

  it("shrink-wraps a section to its content when it declares no capRows", () => {
    const { container } = renderQueue(FIVE_IN_A);
    expect(sectionHeights(container)[0]).toBe("306px"); // 34 + 5*54 + 2
  });

  it("caps a section at capRows and keeps every row mounted so the body scrolls", () => {
    const capped: ProgressionSection[] = [
      { key: "a", label: "Alpha", tone: "success", capRows: 2 },
      { key: "b", label: "Beta", tone: "danger" },
      { key: "c", label: "Gamma", tone: "accent" },
    ];
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={capped}
        items={FIVE_IN_A}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    expect(sectionHeights(container)[0]).toBe("144px"); // 34 + 2*54 + 2
    // Capping is a viewport, not a filter — all five rows stay in the DOM.
    expect(container.querySelectorAll(".prog-queue__row")).toHaveLength(5);
  });

  it("ignores capRows larger than the row count", () => {
    const capped: ProgressionSection[] = [
      { key: "a", label: "Alpha", tone: "success", capRows: 99 },
      { key: "b", label: "Beta", tone: "danger" },
      { key: "c", label: "Gamma", tone: "accent" },
    ];
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={capped}
        items={FIVE_IN_A}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    expect(sectionHeights(container)[0]).toBe("306px"); // still content-driven
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/ProgressionQueue/ProgressionQueue.test.tsx`
Expected: FAIL — `emptyLabel` is not a known property, and `.prog-queue__empty` is null.

- [ ] **Step 3: Rewrite `types.ts`**

Replace the whole of `src/components/ProgressionQueue/types.ts`:

```ts
// ProgressionQueue — public props. One queue component: N always-present
// sections, a flat `items` list bucketed by `bucketOf`, controlled selection /
// focus / checking, and a transfer animation played whenever an item's bucket
// changes. Supersedes SplitQueueList (see
// docs/superpowers/specs/2026-07-24-progression-queue-merge-design.md).
import type { JSX } from "solid-js";
import type { Tone } from "../../types";

/** One section of the progression bar. */
export interface ProgressionSection {
  /** Stable key; `bucketOf` returns one of these. */
  key: string;
  /** Header label. */
  label: string;
  /** Dot color beside the label — the ONLY role color (chrome stays neutral). */
  tone: Tone;
  /** Relative share of the height when the populated sections overflow their
   *  content. Default 1. */
  weight?: number;
  /** When the queue is in select mode (`checkedKeys` present), rows in THIS
   *  section render the check affordance and a click toggles the check instead
   *  of selecting. Sections without it keep selecting on click even in select
   *  mode. Default false. */
  selectable?: boolean;
  /** Copy for the collapsed strip when this section has no items. Omit for the
   *  bare summary line (label + count). */
  emptyLabel?: JSX.Element;
  /** Soft cap in rows: the section stops growing past this many rows and its
   *  body scrolls. Omit to shrink-wrap to content. Succeeds SplitQueueList's
   *  `topCapRows`. Unlike that pane, a capped section never grows past its cap
   *  to absorb slack from a short neighbour. */
  capRows?: number;
}

export interface ProgressionQueueProps<T> {
  /** Sections top → bottom. Every section is always shown, with its count. */
  sections: ProgressionSection[];
  /** All items; each is bucketed into a section by `bucketOf`. An item whose
   *  bucket matches no section renders nowhere. */
  items: T[];
  /** Item → the `key` of the section it belongs in. Changing an item's bucket
   *  is what plays the transfer animation. */
  bucketOf: (item: T) => string;
  /** Stable identity for an item (selection, list keys, transfer tracking). */
  keyOf: (item: T) => string;
  /** Render an item's row content. */
  renderItem: (item: T) => JSX.Element;

  /** Selected item key (controlled) — its row gets the selected treatment. */
  selectedKey?: string;
  /** Fires with an item's key when its row is activated by click or Enter/Space
   *  outside select mode. */
  onSelect?: (key: string) => void;

  /** Key of the keyboard-focused row (controlled roving focus). When omitted or
   *  stale, no row is painted focused, but the single tab stop still lands on a
   *  sensible row. */
  focusedKey?: string;
  /** Fires when keyboard focus moves. */
  onFocusChange?: (key: string | null) => void;

  /** PRESENCE turns select mode on — an empty Set means "mode on, nothing
   *  checked". Rows in `selectable` sections then render the check affordance
   *  and reflect membership in this set. Omit for the plain click-to-select
   *  baseline. */
  checkedKeys?: ReadonlySet<string>;
  /** Fires when a checkable row is activated while select mode is on, carrying
   *  the modifiers (shift = range, meta/ctrl = toggle). The consumer owns
   *  range/anchor semantics. Never fires outside select mode or for a
   *  non-selectable section. */
  onToggleCheck?: (key: string, modifiers: { shift: boolean; meta: boolean }) => void;

  /** Set to a key present in any section to scroll that row into view. Reacts
   *  on CHANGE: set it (or bump it) to request a scroll, then clear it. No-op
   *  when undefined or when no row carries the key. */
  scrollToKey?: string;

  /** Total height in px. Omit to fill the parent (the root is `height:100%`,
   *  so it stretches to a definite-height flex / `height:100%` ancestor). */
  height?: number;
  class?: string;
}
```

- [ ] **Step 4: Rewire the component to bucketing and render the empty strip**

In `src/components/ProgressionQueue/ProgressionQueue.tsx`, replace the import of `filter, map` and the `itemsIn` / `counts` definitions at lines 20-36 with:

```tsx
import { allocateHeights } from "./layout";
import { bucketItems } from "./bucketing";
import { map } from "../../fn";
import type { ProgressionQueueProps } from "./types";
import "./ProgressionQueue.css";

export type { ProgressionQueueProps, ProgressionSection } from "./types";

// Pre-measure fallbacks (jsdom / first paint) — real values are measured.
const HEADER_FALLBACK = 34;
const ROW_FALLBACK = 54;
const GAP = 8;

export function ProgressionQueue<T>(props: ProgressionQueueProps<T>): JSX.Element {
  const sectionKeys = createMemo(() => map((s) => s.key, props.sections));
  // ONE pass per items change: the per-section rows AND the key → section map.
  const buckets = createMemo(() =>
    bucketItems(props.items, sectionKeys(), props.bucketOf, props.keyOf),
  );
  const itemsIn = (key: string): T[] => buckets().bySection.get(key) ?? [];
  const counts = createMemo(() => map((s) => itemsIn(s.key).length, props.sections));
```

Then in the JSX, replace the `<Show when={count() > 0}>` block (lines 100-123) with:

```tsx
              <Show
                when={count() > 0}
                fallback={
                  <Show when={section.emptyLabel != null}>
                    <div class="prog-queue__empty">{section.emptyLabel}</div>
                  </Show>
                }
              >
                <div class="prog-queue__body">
                  <For each={itemsIn(section.key)}>
                    {(it, ri) => {
                      const key = props.keyOf(it);
                      const interactive = () => props.onSelect != null;
                      const selected = () => props.selectedKey != null && props.selectedKey === key;
                      return (
                        <div
                          ref={(el) => (i() === 0 && ri() === 0 ? (rowRef = el) : undefined)}
                          class={
                            "prog-queue__row" +
                            (interactive() ? " prog-queue__row--interactive" : "") +
                            (selected() ? " prog-queue__row--selected" : "")
                          }
                          onClick={interactive() ? () => props.onSelect?.(key) : undefined}
                        >
                          {props.renderItem(it)}
                        </div>
                      );
                    }}
                  </For>
                </div>
              </Show>
```

Note: `filter` is no longer imported. `<For>` is correct here — the per-section arrays hold the consumer's own item objects, so element references survive a rebuild and rows do not remount (`STYLE_GUIDE.md` › *List Identity*).

While you are rewriting these exact lines, clear the two pre-existing `noAssignInExpressions` lint errors by replacing the ternary-assignment `ref` idiom with a statement body. Both the header probe and the row probe change:

```tsx
              <div class="prog-queue__header" ref={(el) => { if (i() === 0) headRef = el; }}>
```

```tsx
                          ref={(el) => { if (i() === 0 && ri() === 0) rowRef = el; }}
```

These are measurement probes: the component measures the FIRST section's header and the FIRST row to learn real heights, so only index 0 assigns.

Also update the natural-height memo for the two new section fields — an
`emptyLabel` reserves one line, and `capRows` caps the section's natural height
so the water-fill logic itself stays untouched. Replace the `natural` memo with:

```tsx
  const natural = createMemo(() =>
    map((c: number, idx: number) => {
      const section = props.sections[idx];
      // Empty: the summary line, plus one line for the empty copy if declared.
      if (c === 0) return headH() + (section?.emptyLabel != null ? rowH() : 0) + 2;
      // `capRows` caps the section's NATURAL height, so it holds at the cap and
      // its body scrolls; the weighted water-fill below is unchanged.
      const rows =
        section?.capRows != null ? Math.min(c, Math.max(1, section.capRows)) : c;
      return headH() + rows * rowH() + 2;
    }, counts()),
  );
```

`map` from `src/fn` passes `(value, index)` to its callback (see `src/fn/map.ts`), so the index form above is correct as written.

- [ ] **Step 5: Add the empty-strip style**

Append to `src/components/ProgressionQueue/ProgressionQueue.css`:

```css
/* Collapsed strip shown in a section with no items (opt-in via
   `section.emptyLabel`). Muted, one line, never a big empty box. */
.prog-queue__empty {
  padding: 6px 12px;
  color: var(--sui-text-muted);
  font-size: 0.85rem;
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/components/ProgressionQueue`
Expected: PASS — the three new tests plus the six existing ones.

- [ ] **Step 7: Verify the gates**

Run: `npx tsc --noEmit && npx biome lint src/components/ProgressionQueue src/components/SplitQueueList`
Expected: both pass. `tsc` will flag any consumer of the removed props — there should be none inside `src/` yet.

- [ ] **Step 8: Commit**

```bash
git add src/components/ProgressionQueue/
git commit -m "feat(progression-queue): merged props surface + memoized bucketing + section emptyLabel"
```

---

### Task 3: Select mode — `checkedKeys`, `onToggleCheck`, `section.selectable`

**Files:**
- Modify: `src/components/ProgressionQueue/ProgressionQueue.tsx` (the row render)
- Modify: `src/components/ProgressionQueue/ProgressionQueue.css`
- Modify: `src/components/ProgressionQueue/ProgressionQueue.test.tsx`

**Interfaces:**
- Consumes: `ProgressionQueueProps.checkedKeys`, `.onToggleCheck`, `ProgressionSection.selectable` from Task 2.
- Produces: `activate(key: string, section: ProgressionSection, modifiers: { shift: boolean; meta: boolean }): void` — the single select-vs-toggle branch, reused by Task 4's keyboard handler. Row markup gains `data-pq-key={key}`, relied on by Tasks 4, 5 and 7.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/ProgressionQueue/ProgressionQueue.test.tsx`:

```tsx
  const SELECTABLE: ProgressionSection[] = [
    { key: "a", label: "Alpha", tone: "success" },
    { key: "b", label: "Beta", tone: "accent", selectable: true },
  ];

  const renderSelectable = (extra: Record<string, unknown>) =>
    render(() => (
      <ProgressionQueue<Item>
        sections={SELECTABLE}
        items={[
          { id: "plain", bucket: "a" },
          { id: "check", bucket: "b" },
        ]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
        {...extra}
      />
    ));

  const rowFor = (container: HTMLElement, key: string) =>
    container.querySelector(`[data-pq-key="${key}"]`) as HTMLElement;

  it("renders no check affordance when checkedKeys is absent", () => {
    const { container } = renderSelectable({ onSelect: () => {} });
    expect(container.querySelector(".prog-queue__checkbox")).toBeNull();
  });

  it("renders the check affordance only in selectable sections when checkedKeys is present", () => {
    const { container } = renderSelectable({
      onSelect: () => {},
      checkedKeys: new Set<string>(),
      onToggleCheck: () => {},
    });
    expect(rowFor(container, "check").querySelector(".prog-queue__checkbox")).toBeTruthy();
    expect(rowFor(container, "plain").querySelector(".prog-queue__checkbox")).toBeNull();
  });

  it("marks a row checked when its key is in checkedKeys", () => {
    const { container } = renderSelectable({
      onSelect: () => {},
      checkedKeys: new Set(["check"]),
      onToggleCheck: () => {},
    });
    expect(rowFor(container, "check").classList.contains("prog-queue__row--checked")).toBe(true);
  });

  it("toggles instead of selecting when a selectable row is clicked in select mode", () => {
    let selected: string | undefined;
    let toggled: [string, { shift: boolean; meta: boolean }] | undefined;
    const { container } = renderSelectable({
      onSelect: (k: string) => (selected = k),
      checkedKeys: new Set<string>(),
      onToggleCheck: (k: string, mods: { shift: boolean; meta: boolean }) => (toggled = [k, mods]),
    });
    fireEvent.click(rowFor(container, "check"), { shiftKey: true, metaKey: false });
    expect(toggled?.[0]).toBe("check");
    expect(toggled?.[1]).toEqual({ shift: true, meta: false });
    expect(selected).toBeUndefined();
  });

  it("still selects a NON-selectable section's row while select mode is on", () => {
    let selected: string | undefined;
    let toggled: string | undefined;
    const { container } = renderSelectable({
      onSelect: (k: string) => (selected = k),
      checkedKeys: new Set<string>(),
      onToggleCheck: (k: string) => (toggled = k),
    });
    fireEvent.click(rowFor(container, "plain"));
    expect(selected).toBe("plain");
    expect(toggled).toBeUndefined();
  });

  it("treats ctrl-click as meta", () => {
    let mods: { shift: boolean; meta: boolean } | undefined;
    const { container } = renderSelectable({
      onSelect: () => {},
      checkedKeys: new Set<string>(),
      onToggleCheck: (_k: string, m: { shift: boolean; meta: boolean }) => (mods = m),
    });
    fireEvent.click(rowFor(container, "check"), { ctrlKey: true });
    expect(mods).toEqual({ shift: false, meta: true });
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/components/ProgressionQueue/ProgressionQueue.test.tsx`
Expected: FAIL — `rowFor` returns null (`data-pq-key` doesn't exist yet).

- [ ] **Step 3: Implement the row branch**

In `src/components/ProgressionQueue/ProgressionQueue.tsx`, add above the `return` of the component:

```tsx
  // Select mode is on iff the consumer is managing a checked set. An empty Set
  // means "mode on, nothing checked" — the state select mode starts in.
  const selectModeOn = () => props.checkedKeys != null;
  const checkableIn = (section: ProgressionSection) =>
    selectModeOn() && section.selectable === true;

  // The single activation branch — shared by click (here) and Enter/Space (the
  // keyboard module). A row either toggles its check or selects; never both.
  const activate = (
    key: string,
    section: ProgressionSection,
    modifiers: { shift: boolean; meta: boolean },
  ) => {
    if (checkableIn(section)) props.onToggleCheck?.(key, modifiers);
    else props.onSelect?.(key);
  };
```

`ProgressionSection` must be imported as a type in the component:

```tsx
import type { ProgressionQueueProps, ProgressionSection } from "./types";
```

Replace the row element from Task 2 with:

```tsx
                        <div
                          ref={(el) => (i() === 0 && ri() === 0 ? (rowRef = el) : undefined)}
                          data-pq-key={key}
                          class={
                            "prog-queue__row" +
                            (interactive() ? " prog-queue__row--interactive" : "") +
                            (selected() ? " prog-queue__row--selected" : "")
                          }
                          classList={{
                            "prog-queue__row--checked":
                              checkableIn(section) && props.checkedKeys?.has(key) === true,
                          }}
                          onClick={
                            interactive()
                              ? (e: MouseEvent) =>
                                  activate(key, section, {
                                    shift: e.shiftKey,
                                    meta: e.metaKey || e.ctrlKey,
                                  })
                              : undefined
                          }
                        >
                          <Show when={checkableIn(section)}>
                            <span
                              class="prog-queue__checkbox"
                              classList={{
                                "prog-queue__checkbox--checked":
                                  props.checkedKeys?.has(key) === true,
                              }}
                              aria-hidden="true"
                            >
                              {props.checkedKeys?.has(key) === true ? "✓" : ""}
                            </span>
                          </Show>
                          {props.renderItem(it)}
                        </div>
```

Also widen `interactive()` so a checkable row is clickable even when the consumer passed no `onSelect`:

```tsx
                      const interactive = () =>
                        props.onSelect != null || checkableIn(section);
```

- [ ] **Step 4: Add the select-mode styles**

Append to `src/components/ProgressionQueue/ProgressionQueue.css`:

```css
/* SELECT MODE (bag-of-stuff grouping): a checked row gets a neutral accent
   tint, and a small box that fills with a check. The whole row is the click
   target, so the box is a non-interactive indicator, not an <input>. */
.prog-queue__row--checked {
  background: var(--sui-accent-dim);
}
.prog-queue__checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-right: 8px;
  box-sizing: border-box;
  border: 1px solid var(--sui-border-bright);
  border-radius: var(--sui-radius-sm);
  font-size: 0.625rem;
  line-height: 1;
  background: var(--sui-bg-secondary);
  vertical-align: middle;
}
.prog-queue__checkbox--checked {
  background: var(--sui-accent);
  border-color: var(--sui-accent);
  color: var(--sui-bg-secondary);
}
```

The `display: inline-flex; align-items: center` on the checkbox is intrinsic element styling — a self-contained indicator centering its own single glyph — which `STYLE_GUIDE.md` › *Child arrangement vs intrinsic element styling* explicitly leaves in place.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/components/ProgressionQueue`
Expected: PASS — six new tests plus all previous.

- [ ] **Step 6: Verify the gates**

Run: `npx tsc --noEmit && npx biome lint src/components/ProgressionQueue src/components/SplitQueueList`
Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/ProgressionQueue/
git commit -m "feat(progression-queue): select mode scoped to selectable sections"
```

---

### Task 4: Keyboard navigation and roving focus

**Files:**
- Create: `src/components/ProgressionQueue/keyboard.ts`
- Modify: `src/components/ProgressionQueue/ProgressionQueue.tsx`
- Modify: `src/components/ProgressionQueue/ProgressionQueue.css`
- Modify: `src/components/ProgressionQueue/ProgressionQueue.test.tsx`

**Interfaces:**
- Consumes: `activate` and `data-pq-key` from Task 3.
- Produces: `createRowKeyboard(deps: RowKeyboardDeps): RowKeyboard` where `RowKeyboard = { tabbableKey: () => string | null; setActiveKey: (key: string | null) => void; onRowKeyDown: (e: KeyboardEvent, key: string) => void }`.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/ProgressionQueue/ProgressionQueue.test.tsx`:

```tsx
  const rows = (container: HTMLElement) =>
    [...container.querySelectorAll("[data-pq-key]")] as HTMLElement[];

  it("gives exactly one row the tab stop", () => {
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {} },
    );
    const tabbable = rows(container).filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
  });

  it("prefers focusedKey for the tab stop", () => {
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {}, focusedKey: "2" },
    );
    expect(rowFor(container, "2").getAttribute("tabindex")).toBe("0");
    expect(rowFor(container, "1").getAttribute("tabindex")).toBe("-1");
  });

  it("moves focus DOWN across a section boundary and reports it", () => {
    const moved: (string | null)[] = [];
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {}, onFocusChange: (k: string | null) => moved.push(k) },
    );
    fireEvent.keyDown(rowFor(container, "1"), { key: "ArrowDown" });
    expect(moved).toEqual(["2"]);
  });

  it("does not wrap at either end", () => {
    const moved: (string | null)[] = [];
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {}, onFocusChange: (k: string | null) => moved.push(k) },
    );
    fireEvent.keyDown(rowFor(container, "1"), { key: "ArrowUp" });
    fireEvent.keyDown(rowFor(container, "2"), { key: "ArrowDown" });
    expect(moved).toEqual(["1", "2"]);
  });

  it("Home and End jump to the first and last row", () => {
    const moved: (string | null)[] = [];
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
        { id: "3", bucket: "c" },
      ],
      { onSelect: () => {}, onFocusChange: (k: string | null) => moved.push(k) },
    );
    fireEvent.keyDown(rowFor(container, "1"), { key: "End" });
    fireEvent.keyDown(rowFor(container, "3"), { key: "Home" });
    expect(moved).toEqual(["3", "1"]);
  });

  it("Enter selects the focused row", () => {
    let selected: string | undefined;
    const { container } = renderQueue([{ id: "1", bucket: "a" }], {
      onSelect: (k: string) => (selected = k),
    });
    fireEvent.keyDown(rowFor(container, "1"), { key: "Enter" });
    expect(selected).toBe("1");
  });

  it("Space toggles the check on a selectable row in select mode", () => {
    let toggled: string | undefined;
    let selected: string | undefined;
    const { container } = renderSelectable({
      onSelect: (k: string) => (selected = k),
      checkedKeys: new Set<string>(),
      onToggleCheck: (k: string) => (toggled = k),
    });
    fireEvent.keyDown(rowFor(container, "check"), { key: " " });
    expect(toggled).toBe("check");
    expect(selected).toBeUndefined();
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/components/ProgressionQueue/ProgressionQueue.test.tsx`
Expected: FAIL — rows carry no `tabindex` and ignore keydown.

- [ ] **Step 3: Create `keyboard.ts`**

Create `src/components/ProgressionQueue/keyboard.ts`:

```ts
/* ProgressionQueue — keyboard navigation & roving tabindex.
 *
 * Sections are exposed as `role="listbox"`es of `role="option"` rows so
 * assistive tech announces each as a selectable list. Rows are reachable via a
 * ROVING TABINDEX: exactly one row is in the tab order (tabindex 0), the rest
 * are -1. Arrow/Home/End move DOM focus, treating every section as one
 * top→bottom sequence, and DO NOT WRAP (movement clamps at both ends).
 * Enter/Space activate the row through the shell's select-vs-toggle branch.
 *
 * Ported from SplitQueueList/keyboard.ts with its behavior intact; the two
 * additions are `onFocusChange` emission and the injected `onActivate`. */
import { createMemo, createSignal } from "solid-js";
import { clamp } from "../../internal/math/clamp";

export interface RowKeyboardDeps {
  /** The component root the rows are queried within (may be undefined pre-mount). */
  getRootEl: () => HTMLElement | undefined;
  /** All row keys in render order, top section first. */
  allKeys: () => string[];
  /** The controlled focus, if any. */
  focusedKey: () => string | undefined;
  /** The controlled selection, if any. */
  selectedKey: () => string | undefined;
  /** Activate a row (mirrors a click — selects, or toggles in select mode). */
  onActivate: (key: string) => void;
  /** Report that keyboard focus moved. */
  onFocusChange: (key: string | null) => void;
}

export interface RowKeyboard {
  /** Which row currently holds the tab stop (tabindex 0). */
  tabbableKey: () => string | null;
  /** Record the row the user focused (e.g. from the row's onFocus). */
  setActiveKey: (key: string | null) => void;
  /** keydown handler for a row, bound to its key. */
  onRowKeyDown: (e: KeyboardEvent, key: string) => void;
}

export function createRowKeyboard(deps: RowKeyboardDeps): RowKeyboard {
  const [activeKey, setActiveKey] = createSignal<string | null>(null);

  // Exactly one tab stop, chosen by precedence: the row the user last focused,
  // then the controlled selection, then the controlled focus, then the first
  // row. A stale key that is no longer rendered is skipped.
  const tabbableKey = createMemo(() => {
    const allKeys = deps.allKeys();
    const active = activeKey();
    if (active && allKeys.includes(active)) return active;
    const fk = deps.focusedKey();
    if (fk && allKeys.includes(fk)) return fk;
    const sel = deps.selectedKey();
    if (sel && allKeys.includes(sel)) return sel;
    return allKeys[0] ?? null;
  });

  // Move DOM focus across ALL sections as one sequence, driven off live DOM
  // order so it tracks the rendered rows without threading indices through
  // state. Clamped — the queue does not wrap.
  const moveFocus = (fromKey: string, dir: 1 | -1 | "home" | "end") => {
    const rootEl = deps.getRootEl();
    if (!rootEl) return;
    const rows = [...rootEl.querySelectorAll<HTMLElement>("[data-pq-key]")];
    if (rows.length === 0) return;
    const idx = rows.findIndex((r) => r.dataset.pqKey === fromKey);
    const target =
      dir === "home"
        ? rows[0]
        : dir === "end"
          ? rows[rows.length - 1]
          : rows[clamp(idx + dir, 0, rows.length - 1)];
    if (!target) return;
    const key = target.dataset.pqKey ?? null;
    setActiveKey(key);
    target.focus();
    deps.onFocusChange(key);
  };

  const onRowKeyDown = (e: KeyboardEvent, key: string) => {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault(); // Space would otherwise scroll the section body
        deps.onActivate(key);
        break;
      case "ArrowDown":
        e.preventDefault();
        moveFocus(key, 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(key, -1);
        break;
      case "Home":
        e.preventDefault();
        moveFocus(key, "home");
        break;
      case "End":
        e.preventDefault();
        moveFocus(key, "end");
        break;
    }
  };

  return { tabbableKey, setActiveKey, onRowKeyDown };
}
```

Note the tab-stop precedence puts `focusedKey` **above** `selectedKey`, unlike `SplitQueueList` (whose `focusedKey` was a bottom-pane-only concept). `focusedKey` is now the explicit roving-focus prop, so it wins.

- [ ] **Step 4: Wire the keyboard into the component**

In `src/components/ProgressionQueue/ProgressionQueue.tsx`, add the import:

```tsx
import { createRowKeyboard } from "./keyboard";
```

Add after the `activate` helper:

```tsx
  // The section a row lives in, for the activation branch (keyboard has only
  // the key; click has the section in scope).
  const sectionForKey = (key: string): ProgressionSection | undefined => {
    const sectionKey = buckets().sectionOf.get(key);
    return props.sections.find((s) => s.key === sectionKey);
  };

  const keyboard = createRowKeyboard({
    getRootEl: () => rootRef,
    allKeys: () =>
      props.sections.flatMap((s) => itemsIn(s.key).map((it) => props.keyOf(it))),
    focusedKey: () => props.focusedKey,
    selectedKey: () => props.selectedKey,
    onActivate: (key) => {
      const section = sectionForKey(key);
      if (section) activate(key, section, { shift: false, meta: false });
    },
    onFocusChange: (key) => props.onFocusChange?.(key),
  });
```

Give the section body the listbox role and the row the option role plus the roving tabindex. The body element becomes:

```tsx
                <div
                  class="prog-queue__body"
                  // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: intentional ARIA <listbox/option> pattern — the listbox role belongs on the element owning the option rows.
                  role="listbox"
                  aria-label={section.label}
                >
```

and the row element gains, alongside its existing attributes:

```tsx
                          // biome-ignore lint/a11y/useFocusableInteractive: option rows carry a roving tabindex (0/-1) driven by createRowKeyboard; they are focusable.
                          role="option"
                          aria-selected={selected()}
                          tabindex={
                            interactive() && keyboard.tabbableKey() === key ? 0 : -1
                          }
                          classList={{
                            "prog-queue__row--checked":
                              checkableIn(section) && props.checkedKeys?.has(key) === true,
                            "prog-queue__row--focused": props.focusedKey === key,
                          }}
                          onKeyDown={(e: KeyboardEvent) => keyboard.onRowKeyDown(e, key)}
                          onFocus={() => keyboard.setActiveKey(key)}
```

- [ ] **Step 5: Add the focus style**

Append to `src/components/ProgressionQueue/ProgressionQueue.css`:

```css
/* FOCUS — a ring only. No background fill: a persistent fill behind row text is
   exactly the readability problem the selected-row treatment was fixed for, and
   a marker glyph that appears only on focus would shift the row's content. */
.prog-queue__row--focused,
.prog-queue__row:focus-visible {
  outline: 1px solid var(--sui-border-focus);
  outline-offset: -1px;
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/components/ProgressionQueue`
Expected: PASS — seven new tests plus all previous.

- [ ] **Step 7: Verify the gates**

Run: `npx tsc --noEmit && npx biome lint src/components/ProgressionQueue src/components/SplitQueueList`
Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/ProgressionQueue/
git commit -m "feat(progression-queue): roving-focus keyboard nav across sections"
```

---

### Task 5: `scrollToKey` and the shared reveal helper

**Files:**
- Modify: `src/components/ProgressionQueue/ProgressionQueue.tsx`
- Modify: `src/components/ProgressionQueue/ProgressionQueue.test.tsx`

**Interfaces:**
- Consumes: `data-pq-key` from Task 3.
- Produces: `revealRow(key: string): void` — used by `scrollToKey` here and by Task 7's arrival reveal.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/ProgressionQueue/ProgressionQueue.test.tsx`. `scrollIntoView` does not exist in jsdom, so stub it:

```tsx
  it("scrolls the matching row into view when scrollToKey changes", async () => {
    const calls: string[] = [];
    // jsdom has no scrollIntoView; record the row it is called on.
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
      function (this: Element) {
        calls.push((this as HTMLElement).dataset.pqKey ?? "");
      };
    const [key, setKey] = createSignal<string | undefined>(undefined);
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={SECTIONS}
        items={[
          { id: "1", bucket: "a" },
          { id: "2", bucket: "b" },
        ]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
        scrollToKey={key()}
      />
    ));
    expect(container).toBeTruthy();
    setKey("2");
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(calls).toEqual(["2"]);
  });

  it("is a no-op when scrollToKey matches no row", async () => {
    const calls: string[] = [];
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
      function (this: Element) {
        calls.push((this as HTMLElement).dataset.pqKey ?? "");
      };
    const [key, setKey] = createSignal<string | undefined>(undefined);
    render(() => (
      <ProgressionQueue<Item>
        sections={SECTIONS}
        items={[{ id: "1", bucket: "a" }]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
        scrollToKey={key()}
      />
    ));
    setKey("nope");
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(calls).toEqual([]);
  });
```

Add `createSignal` to the file's Solid import:

```tsx
import { createSignal } from "solid-js";
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/components/ProgressionQueue/ProgressionQueue.test.tsx`
Expected: FAIL — `calls` is empty; nothing reacts to `scrollToKey`.

- [ ] **Step 3: Implement the reveal**

In `src/components/ProgressionQueue/ProgressionQueue.tsx`, add `createEffect` to the Solid import and add after the keyboard wiring:

```tsx
  // Bring a row into view inside its section body. Matched by dataset rather
  // than a `[data-pq-key="…"]` selector so arbitrary key strings (colons,
  // quotes) need no escaping. Deferred one frame so a row that was just added
  // or moved has laid out first.
  const revealRow = (key: string) => {
    requestAnimationFrame(() => {
      const candidates = rootRef?.querySelectorAll<HTMLElement>("[data-pq-key]");
      const match = candidates && [...candidates].find((n) => n.dataset.pqKey === key);
      match?.scrollIntoView?.({ block: "nearest" });
    });
  };

  // Reacts on CHANGE of `scrollToKey`, so a consumer can re-request the same
  // key by clearing then re-setting it. No-op when undefined or unmatched.
  createEffect(() => {
    const key = props.scrollToKey;
    if (!key) return;
    revealRow(key);
  });
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/ProgressionQueue`
Expected: PASS — two new tests plus all previous.

- [ ] **Step 5: Verify the gates**

Run: `npx tsc --noEmit && npx biome lint src/components/ProgressionQueue src/components/SplitQueueList`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/ProgressionQueue/
git commit -m "feat(progression-queue): scrollToKey reveals a row on change"
```

---

### Task 6: The selected-row contrast fix

The selected row must have **no background fill** when unhovered. Because jsdom does not apply imported stylesheets, the guard is a test that reads the CSS file and asserts the rule's content — a real regression gate, unlike an assertion on computed style that would pass vacuously.

**Files:**
- Modify: `src/components/ProgressionQueue/ProgressionQueue.css:60-63`
- Create: `src/components/ProgressionQueue/styling.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

Create `src/components/ProgressionQueue/styling.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// jsdom does not apply imported stylesheets, so a computed-style assertion here
// would pass no matter what the CSS says. Reading the rule is the honest gate.
const css = readFileSync(
  fileURLToPath(new URL("./ProgressionQueue.css", import.meta.url)),
  "utf8",
);

const ruleBody = (selector: string): string => {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`rule not found: ${selector}`);
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("}", open));
};

describe("ProgressionQueue styling contract", () => {
  it("gives a selected row NO background fill — only the accent bar", () => {
    const body = ruleBody(".prog-queue__row--selected");
    expect(body).not.toMatch(/(^|[^-])background\s*:/);
    expect(body).toContain("inset 2px 0 0 var(--sui-accent)");
  });

  it("keeps the hover fill so hover still owns the background", () => {
    expect(ruleBody(".prog-queue__row--interactive:hover")).toMatch(/background\s*:/);
  });

  it("hardcodes no colors — every color is a --sui-* token", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/ProgressionQueue/styling.test.ts`
Expected: FAIL on the first test — the current rule sets `background: var(--sui-bg-selected, rgba(0, 212, 255, 0.1))`.

- [ ] **Step 3: Apply the fix**

In `src/components/ProgressionQueue/ProgressionQueue.css`, replace the `.prog-queue__row--selected` rule:

```css
/* SELECTED — the accent bar ONLY, never a fill. A persistent background behind
   row text reads at too low a contrast once the pointer leaves, and because a
   consumer typically auto-selects a row, that state is almost always on screen.
   Hover owns the fill, exactly as it does for an unselected row. */
.prog-queue__row--selected {
  box-shadow: inset 2px 0 0 var(--sui-accent);
}
```

If the third test fails, replace any literal hex color elsewhere in the file with the matching `--sui-*` token.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/ProgressionQueue`
Expected: PASS — all three styling tests plus everything prior.

- [ ] **Step 5: Verify the gates**

Run: `npx tsc --noEmit && npx biome lint src/components/ProgressionQueue src/components/SplitQueueList`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/ProgressionQueue/
git commit -m "fix(progression-queue): selected row keeps the accent bar, drops the fill"
```

---

### Task 7: The motion seam and the slot animation

The animation goes behind one interface so the deferred flying-clone implementation is a drop-in swap. Only the reduced-motion and arrival-reveal paths are testable in jsdom; the motion itself is verified in the showcase (Task 9).

**Files:**
- Create: `src/components/ProgressionQueue/motion.ts`
- Modify: `src/components/ProgressionQueue/ProgressionQueue.tsx`
- Modify: `src/components/ProgressionQueue/ProgressionQueue.test.tsx`

**Interfaces:**
- Consumes: `Transfer` (Task 1), `revealRow` (Task 5), `data-pq-key` (Task 3).
- Produces: `createSlotMotion(): TransferChoreographer`, `TransferChoreographer`, `MotionContext`.

- [ ] **Step 1: Write the failing test**

Append to `src/components/ProgressionQueue/ProgressionQueue.test.tsx`:

```tsx
  it("reveals the arriving row after an item changes bucket", async () => {
    const calls: string[] = [];
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
      function (this: Element) {
        calls.push((this as HTMLElement).dataset.pqKey ?? "");
      };
    const [items, setItems] = createSignal<Item[]>([
      { id: "1", bucket: "b" },
      { id: "2", bucket: "b" },
    ]);
    render(() => (
      <ProgressionQueue<Item>
        sections={SECTIONS}
        items={items()}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    calls.length = 0;
    setItems([
      { id: "1", bucket: "a" }, // moved b → a
      { id: "2", bucket: "b" },
    ]);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(calls).toContain("1");
  });

  it("does not reveal anything when no item changed bucket", async () => {
    const calls: string[] = [];
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
      function (this: Element) {
        calls.push((this as HTMLElement).dataset.pqKey ?? "");
      };
    const [items, setItems] = createSignal<Item[]>([{ id: "1", bucket: "a" }]);
    render(() => (
      <ProgressionQueue<Item>
        sections={SECTIONS}
        items={items()}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    calls.length = 0;
    setItems([{ id: "1", bucket: "a" }, { id: "2", bucket: "a" }]); // an add, not a move
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(calls).toEqual([]);
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/components/ProgressionQueue/ProgressionQueue.test.tsx`
Expected: FAIL on the first — nothing detects the bucket change yet.

- [ ] **Step 3: Create `motion.ts`**

Create `src/components/ProgressionQueue/motion.ts`:

```ts
/* ProgressionQueue — the transfer choreographer seam.
 *
 * The component knows only this interface. `createSlotMotion` is the shipped
 * implementation: the vacated slot closes, the arriving row opens from zero,
 * and every row whose position changed FLIP-slides to its new spot. The
 * deferred alternative — a clone flying over the bar from source rect to
 * destination rect, cross-fading its treatment en route — implements the SAME
 * interface, so trying it is one new file and one changed identifier in
 * ProgressionQueue.tsx. See docs/adr/0004-one-queue-component-and-the-motion-seam.md.
 *
 * All DOM work is feature-detected: without `Element.animate` (jsdom) or under
 * `prefers-reduced-motion`, every path degrades to instant placement. */
import type { Transfer } from "./transfer";

export interface MotionContext {
  root: HTMLElement;
  rowEl: (key: string) => HTMLElement | undefined;
  durationMs: number;
  reducedMotion: boolean;
}

export interface TransferChoreographer {
  /** Snapshot row rects. Call after every paint so a detected transfer always
   *  has the PREVIOUS frame's geometry to animate from. */
  capture(root: HTMLElement): void;
  /** Play one move. Resolves when the motion has settled. */
  play(transfer: Transfer, ctx: MotionContext): Promise<void>;
}

const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

const canAnimate = (el: Element): boolean =>
  typeof (el as HTMLElement).animate === "function";

export const createSlotMotion = (): TransferChoreographer => {
  // Rects of every keyed row as of the last paint — the "First" in FLIP.
  const prevRects = new Map<string, DOMRect>();

  return {
    capture(root) {
      prevRects.clear();
      for (const el of root.querySelectorAll<HTMLElement>("[data-pq-key]")) {
        const key = el.dataset.pqKey;
        if (key) prevRects.set(key, el.getBoundingClientRect());
      }
    },

    async play(transfer, ctx) {
      if (ctx.reducedMotion) return;
      const arriving = ctx.rowEl(transfer.key);
      if (!arriving || !canAnimate(arriving)) return;

      const animations: Animation[] = [];

      // The arriving row opens from zero height. Its old element was removed
      // from the source section by Solid, so the vacated slot closes for free
      // as its former siblings FLIP into place below.
      const target = arriving.getBoundingClientRect();
      animations.push(
        arriving.animate(
          [
            { height: "0px", opacity: 0, overflow: "hidden" },
            { height: `${target.height}px`, opacity: 1, overflow: "hidden" },
          ],
          { duration: ctx.durationMs, easing: EASING },
        ),
      );

      // Every other row that shifted slides from where it was to where it is.
      for (const el of ctx.root.querySelectorAll<HTMLElement>("[data-pq-key]")) {
        const key = el.dataset.pqKey;
        if (!key || key === transfer.key || !canAnimate(el)) continue;
        const before = prevRects.get(key);
        if (!before) continue;
        const after = el.getBoundingClientRect();
        const dy = before.top - after.top;
        if (Math.abs(dy) < 1) continue;
        animations.push(
          el.animate(
            [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }],
            { duration: ctx.durationMs, easing: EASING },
          ),
        );
      }

      await Promise.all(animations.map((a) => a.finished.catch(() => undefined)));
    },
  };
};
```

- [ ] **Step 4: Wire it into the component**

In `src/components/ProgressionQueue/ProgressionQueue.tsx` add the imports:

```tsx
import { createSlotMotion } from "./motion";
import { diffTransfers } from "./transfer";
```

and add after `revealRow`:

```tsx
  // Motion is CURRIED, not a prop (STYLE_GUIDE › Ambient Motion): the queue
  // animates its own transfers with no call-site specification. Swap
  // `createSlotMotion` for a different TransferChoreographer to change the feel.
  const motion = createSlotMotion();
  const DURATION_MS = 260;

  const reducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  // Re-snapshot after every paint so a transfer detected on the next change has
  // the previous frame's geometry to animate from.
  createEffect(() => {
    buckets();
    requestAnimationFrame(() => {
      if (rootRef) motion.capture(rootRef);
    });
  });

  // A move is an item whose bucket changed — one atomic `items` mutation, so
  // there is no intermediate frame in which it belongs nowhere.
  let prevSectionOf: ReadonlyMap<string, string> = new Map();
  createEffect(() => {
    const next = buckets().sectionOf;
    const moves = diffTransfers(prevSectionOf, next, sectionKeys());
    prevSectionOf = next;
    if (moves.length === 0) return;
    queueMicrotask(async () => {
      const root = rootRef;
      if (!root) return;
      const ctx = {
        root,
        rowEl: (key: string) =>
          [...root.querySelectorAll<HTMLElement>("[data-pq-key]")].find(
            (n) => n.dataset.pqKey === key,
          ),
        durationMs: DURATION_MS,
        reducedMotion: reducedMotion(),
      };
      await Promise.all(moves.map((t) => motion.play(t, ctx)));
      // Arrival reveal — the general form of SplitQueueList's scroll-pin: you
      // always see where the last-moved row landed.
      revealRow(moves[moves.length - 1].key);
    });
  });
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/components/ProgressionQueue`
Expected: PASS — two new tests plus all previous.

- [ ] **Step 6: Verify the gates**

Run: `npx tsc --noEmit && npx biome lint src/components/ProgressionQueue src/components/SplitQueueList`
Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/ProgressionQueue/
git commit -m "feat(progression-queue): transfer animation behind a choreographer seam"
```

---

### Task 8: Reduce `SplitQueueList` to a deprecated shim

The animated machinery is deleted and `SplitQueueList` becomes a compile shim mapping the old two-array contract onto the merged component. `StaticSplitLayout` and its CSS are untouched — `dside-ui` depends on the `static` path.

**Files:**
- Modify: `src/components/SplitQueueList/SplitQueueList.tsx` (full rewrite)
- Modify: `src/components/SplitQueueList/types.ts` (trim to the shim's surface)
- Modify: `src/components/SplitQueueList/SplitQueueList.test.tsx` (full rewrite)
- Delete: `src/components/SplitQueueList/{animation,arrival,flight,flip,play,layout,keyboard}.ts`
- Delete: `src/components/SplitQueueList/layout.test.ts`
- Modify: `src/components/SplitQueueList/index.ts` if it exports a deleted module

**Interfaces:**
- Consumes: `ProgressionQueue`, `ProgressionSection` (Tasks 2-7).
- Produces: `SplitQueueList<T>(props: SplitQueueListProps<T>)` — unchanged call signature for both existing consumers.

- [ ] **Step 1: Write the failing shim test**

Replace the whole of `src/components/SplitQueueList/SplitQueueList.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { SplitQueueList } from "./SplitQueueList";

afterEach(cleanup);

interface Txn {
  id: string;
  label: string;
}

const renderQueue = (
  resolved: Txn[],
  unresolved: Txn[],
  extra: Record<string, unknown> = {},
) =>
  render(() => (
    <SplitQueueList<Txn>
      resolved={resolved}
      unresolved={unresolved}
      keyOf={(t) => t.id}
      renderItem={(t) => <span>{t.label}</span>}
      resolvedLabel="Categorized"
      unresolvedLabel="Suggestions"
      allClearLabel="All clear"
      {...extra}
    />
  ));

describe("SplitQueueList (deprecated shim over ProgressionQueue)", () => {
  it("renders both lists with their labels and counts", () => {
    const { container } = renderQueue(
      [{ id: "1", label: "done-1" }],
      [
        { id: "2", label: "todo-1" },
        { id: "3", label: "todo-2" },
      ],
    );
    expect(container.textContent).toContain("Categorized");
    expect(container.textContent).toContain("Suggestions");
    const counts = [...container.querySelectorAll(".prog-queue__count")].map((c) => c.textContent);
    expect(counts).toEqual(["1", "2"]);
  });

  it("puts resolved items in the top section and unresolved in the bottom", () => {
    const { container } = renderQueue(
      [{ id: "1", label: "done-1" }],
      [{ id: "2", label: "todo-1" }],
    );
    const sections = container.querySelectorAll(".prog-queue__section");
    expect(sections[0].textContent).toContain("done-1");
    expect(sections[1].textContent).toContain("todo-1");
  });

  it("fires onSelect from either list", () => {
    let picked: string | undefined;
    const { container } = renderQueue(
      [{ id: "1", label: "done-1" }],
      [{ id: "2", label: "todo-1" }],
      { onSelect: (k: string) => (picked = k) },
    );
    fireEvent.click(container.querySelector('[data-pq-key="1"]') as HTMLElement);
    expect(picked).toBe("1");
  });

  it("shows allClearLabel when the unresolved list is empty", () => {
    const { container } = renderQueue([{ id: "1", label: "done-1" }], []);
    expect(container.textContent).toContain("All clear");
  });

  it("toggles checks on unresolved rows in select mode", () => {
    let toggled: string | undefined;
    const { container } = renderQueue([], [{ id: "2", label: "todo-1" }], {
      checkedKeys: new Set<string>(),
      onToggleCheck: (k: string) => (toggled = k),
    });
    fireEvent.click(container.querySelector('[data-pq-key="2"]') as HTMLElement);
    expect(toggled).toBe("2");
  });

  it("still delegates `static` mode to StaticSplitLayout", () => {
    const { container } = render(() => (
      <SplitQueueList<Txn>
        static
        topItems={[{ id: "1", label: "recent" }]}
        renderTop={(t) => <span>{t.label}</span>}
        keyOf={(t) => t.id}
        label="done · today"
        bottomContent={<div>bottom block</div>}
      />
    ));
    expect(container.querySelector(".sui-sql")).toBeTruthy();
    expect(container.textContent).toContain("bottom block");
  });
});
```

`StaticSplitLayoutProps` does have a `label` prop (`src/components/SplitQueueList/types.ts:124`), so this call site is correct as written.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/SplitQueueList/SplitQueueList.test.tsx`
Expected: FAIL — the old component renders `.sui-sql__*`, not `.prog-queue__*`.

- [ ] **Step 3: Rewrite the shim**

Replace the whole of `src/components/SplitQueueList/SplitQueueList.tsx`:

```tsx
// SplitQueueList — DEPRECATED. A compile shim over ProgressionQueue, kept for
// one release so existing call sites keep working; removed in the next major.
//
// This is NOT a pixel-identical shim: the merged component draws its own
// chrome, so the rendered result is ProgressionQueue's, not the old two-pane
// seam. Migrate to ProgressionQueue directly — declare your sections and bucket
// your items — rather than relying on this mapping.
//
// `static` mode is a separate concern (no queue, no animation) and still
// delegates to StaticSplitLayout, which is NOT deprecated.
import type { JSX } from "solid-js";
import { ProgressionQueue } from "../ProgressionQueue/ProgressionQueue";
import type { ProgressionSection } from "../ProgressionQueue/types";
import { StaticSplitLayout } from "./StaticSplitLayout";
import type { SplitQueueListProps } from "./types";

export type { SplitQueueListProps } from "./types";

const RESOLVED = "resolved";
const UNRESOLVED = "unresolved";

/** @deprecated Use {@link ProgressionQueue}. Removed in the next major. */
export function SplitQueueList<T>(props: SplitQueueListProps<T>): JSX.Element {
  if (props.static)
    return StaticSplitLayout({
      items: props.topItems ?? props.resolved,
      renderItem: props.renderTop ?? props.renderItem,
      bottomContent: props.bottomContent,
      label: props.resolvedLabel,
      emptyLabel: props.allClearLabel,
      capRows: props.topCapRows,
      rowHeight: props.rowHeight,
      height: props.height,
      class: props.class,
    });

  const keyOf = (item: T): string => (props.keyOf ?? ((x) => String(x)))(item);
  const resolvedKeys = () => new Set((props.resolved ?? []).map(keyOf));

  const sections = (): ProgressionSection[] => [
    {
      key: RESOLVED,
      label: props.resolvedLabel ?? "Resolved",
      tone: "success",
      // The old top pane capped at 3 rows and scrolled; `capRows` is its
      // successor, so this maps rather than being dropped.
      capRows: props.topCapRows ?? 3,
    },
    {
      key: UNRESOLVED,
      label: props.unresolvedLabel ?? "Unresolved",
      tone: "accent",
      selectable: true,
      emptyLabel: props.allClearLabel ?? "All clear — nothing to process",
    },
  ];

  return (
    <ProgressionQueue<T>
      sections={sections()}
      items={[...(props.resolved ?? []), ...(props.unresolved ?? [])]}
      bucketOf={(item) => (resolvedKeys().has(keyOf(item)) ? RESOLVED : UNRESOLVED)}
      keyOf={keyOf}
      renderItem={(item) => (props.renderItem ?? (() => null))(item)}
      selectedKey={props.selectedKey}
      onSelect={(k) => props.onSelect?.(k)}
      focusedKey={props.focusedKey}
      onFocusChange={(k) => props.onFocusChange?.(k)}
      checkedKeys={props.selectMode === false ? undefined : props.checkedKeys}
      onToggleCheck={props.onToggleCheck}
      scrollToKey={props.scrollToKey}
      height={props.height}
      class={props.class}
    />
  );
}
```

- [ ] **Step 4: Trim `types.ts`**

In `src/components/SplitQueueList/types.ts`, keep `SplitQueueListProps<T>` and `StaticSplitLayoutProps<T>` intact so both consumers still compile, and add above `SplitQueueListProps`:

```ts
/**
 * @deprecated Use `ProgressionQueueProps` — `SplitQueueList` is now a shim over
 * {@link ProgressionQueue} and is removed in the next major. `topCapRows` maps
 * to the resolved section's `capRows`; `topOnly`, `topFloorRows`, `animationMs`
 * and `rowHeight` are accepted but IGNORED (the merged component measures rows,
 * collapses empty sections, and owns its own motion). `static` mode is
 * unaffected — it still delegates to StaticSplitLayout, which is not
 * deprecated.
 */
```

- [ ] **Step 5: Delete the machinery**

```bash
git rm src/components/SplitQueueList/animation.ts \
       src/components/SplitQueueList/arrival.ts \
       src/components/SplitQueueList/flight.ts \
       src/components/SplitQueueList/flip.ts \
       src/components/SplitQueueList/play.ts \
       src/components/SplitQueueList/layout.ts \
       src/components/SplitQueueList/layout.test.ts \
       src/components/SplitQueueList/keyboard.ts
```

Then open `src/components/SplitQueueList/index.ts` and remove any export of a deleted module. Keep the `SplitQueueList`, `StaticSplitLayout` and type exports.

`SplitQueueList.css` stays. `StaticSplitLayout.tsx:21` imports it directly, so deleting the old animated component does not orphan the static layout's styling — leave both files alone.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS. Any failure naming a deleted module means something still imports it — fix the import.

- [ ] **Step 7: Verify the gates**

Run: `npx tsc --noEmit && npx biome lint src/components/ProgressionQueue src/components/SplitQueueList`
Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add -A src/components/SplitQueueList/
git commit -m "refactor(split-queue-list)!: reduce to a deprecated shim over ProgressionQueue"
```

---

### Task 9: Docs, showcase, ADR, and the rules-compliance edits

Everything the library requires of a component that changed shape: the manifest entry, the showcase, the exemption list, the ADR, the changelog, the rubric.

**Files:**
- Create: `src/components/ProgressionQueue/README.md`
- Create: `dev/showcases/progression-queue.tsx`
- Create: `docs/adr/0004-one-queue-component-and-the-motion-seam.md`
- Modify: `dev/main.tsx`
- Modify: `STYLE_GUIDE.md:75-81`
- Modify: `COMPONENTS.md:874-910`
- Modify: `CHANGELOG.md`
- Modify: `scripts/style-rubric.json`
- Modify: `src/components/ProgressionQueue/index.ts`

**Interfaces:**
- Consumes: everything from Tasks 1-8.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Export the new modules**

Replace `src/components/ProgressionQueue/index.ts`:

```ts
export { ProgressionQueue } from "./ProgressionQueue";
export type { ProgressionQueueProps, ProgressionSection } from "./types";
export { allocateHeights } from "./layout";
export type { AllocateInput } from "./layout";
```

`bucketing`, `transfer`, `motion` and `keyboard` stay internal — they are implementation detail, not public API.

- [ ] **Step 2: Build the showcase**

Create `dev/showcases/progression-queue.tsx`. It must cover: three sections with a live transfer, select mode scoped to one section, and the selected-row readability case.

```tsx
import { createSignal, For } from "solid-js";
import { ProgressionQueue, type ProgressionSection } from "../../src/components/ProgressionQueue";

interface Row {
  id: string;
  label: string;
  bucket: string;
}

const SECTIONS: ProgressionSection[] = [
  { key: "done", label: "Categorized", tone: "success" },
  { key: "todo", label: "Suggestions", tone: "accent", selectable: true, emptyLabel: "All clear" },
  { key: "hold", label: "In progress", tone: "muted", emptyLabel: "Nothing parked" },
];

const SEED: Row[] = [
  { id: "a", label: "Coffee — Blue Bottle", bucket: "todo" },
  { id: "b", label: "Rent — April", bucket: "todo" },
  { id: "c", label: "Payroll — ACH", bucket: "todo" },
  { id: "d", label: "AWS — us-east-1", bucket: "done" },
];

export function ProgressionQueueShowcase() {
  const [items, setItems] = createSignal<Row[]>(SEED);
  const [selected, setSelected] = createSignal<string | undefined>("a");
  const [focused, setFocused] = createSignal<string | undefined>(undefined);
  const [selectMode, setSelectMode] = createSignal(false);
  const [checked, setChecked] = createSignal<ReadonlySet<string>>(new Set());

  const moveTo = (bucket: string) => {
    const key = selected();
    if (!key) return;
    setItems((rows) => rows.map((r) => (r.id === key ? { ...r, bucket } : r)));
  };

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div>
      <h2>ProgressionQueue</h2>
      <p>
        One queue component: N sections, controlled selection / focus / checking, and a
        transfer animation played whenever an item's bucket changes. Select a row, then
        move it — the queue animates the transfer and reveals where it landed.
      </p>

      <div>
        <button type="button" onClick={() => moveTo("done")}>Move to Categorized</button>
        <button type="button" onClick={() => moveTo("todo")}>Move to Suggestions</button>
        <button type="button" onClick={() => moveTo("hold")}>Move to In progress</button>
        <button type="button" onClick={() => setSelectMode((v) => !v)}>
          {selectMode() ? "Leave select mode" : "Enter select mode"}
        </button>
      </div>

      <p>
        Selected: <strong>{selected() ?? "none"}</strong> — its row shows the accent bar
        and <em>no background fill</em>. Move the pointer away: the text stays fully
        readable.
      </p>

      <div style={{ height: "420px", width: "360px" }}>
        <ProgressionQueue<Row>
          sections={SECTIONS}
          items={items()}
          bucketOf={(r) => r.bucket}
          keyOf={(r) => r.id}
          renderItem={(r) => <span>{r.label}</span>}
          selectedKey={selected()}
          onSelect={setSelected}
          focusedKey={focused()}
          onFocusChange={(k) => setFocused(k ?? undefined)}
          checkedKeys={selectMode() ? checked() : undefined}
          onToggleCheck={(k) => toggle(k)}
        />
      </div>

      <h3>Checked</h3>
      <ul>
        <For each={[...checked()]}>{(k) => <li>{k}</li>}</For>
      </ul>
    </div>
  );
}
```

Match the surrounding showcases' section conventions (`dev/showcases/split-queue-list.tsx` is the closest sibling) — read it first and follow its heading/wrapper idiom rather than the bare markup above if it differs.

- [ ] **Step 3: Register the showcase**

In `dev/main.tsx`, add the import beside the others:

```tsx
import { ProgressionQueueShowcase } from "./showcases/progression-queue";
```

and the entry beside `split-queue-list`:

```tsx
  {
    id: "progression-queue",
    label: "ProgressionQueue",
    component: ProgressionQueueShowcase,
    tags: ["depth:1", "list", "navigation", "container"],
  },
```

Leave the `split-queue-list` entry in place; relabel it `SplitQueueList (deprecated)`.

- [ ] **Step 4: Verify it renders**

Run: `npm run dev` and open `http://localhost:6006`, then the ProgressionQueue entry.

Check, and fix anything that fails:
1. A selected, **unhovered** row is fully readable and shows only the accent bar.
2. Moving a selected row between sections animates: the slot opens, siblings slide, the arriving row is revealed.
3. Select mode shows checkboxes **only** in Suggestions; clicking a Categorized row still selects.
4. Arrow keys walk every row across all three sections and stop at both ends.
5. Toggle the OS "reduce motion" setting: rows place instantly, nothing else changes.

Stop the dev server when done.

- [ ] **Step 5: Write the component README**

Create `src/components/ProgressionQueue/README.md` covering: the mental model (one flat list + `bucketOf`; a move is one atomic mutation), a quick-start with the three-section example, the full prop table, select mode (presence of `checkedKeys`), keyboard behavior (**including that only INTERACTIVE rows are keyboard-reachable — a row in a section that is neither selectable nor served by `onSelect` is skipped by arrows and never takes the tab stop**), the sizing model (weighted water-fill, plus per-section `capRows` and its one difference from `SplitQueueList` — no slack absorption past the cap), and a "Motion" section stating that the choreographer seam is the swap point for a flying-clone implementation, pointing at the ADR. Model its structure on `src/components/SplitQueueList/README.md`.

- [ ] **Step 6: Write the ADR**

Create `docs/adr/0004-one-queue-component-and-the-motion-seam.md` in the format of the existing ADRs (read `docs/adr/0003-inline-style-rubric-and-series-tokens.md` first). It must record:
- **Context:** two overlapping queue components; the animated `SplitQueueList` had one consumer, and that consumer was migrating.
- **Decision:** collapse into `ProgressionQueue`; `SplitQueueList` becomes a deprecated shim; a move is a bucket change; motion lives behind `TransferChoreographer`.
- **Considered and deferred:** `flightMotion` — a clone flying over the bar, cross-fading source→destination treatment; the N-section successor to the two-clipped-clone seam repaint. Deferred for simplicity on the explicit condition that adopting it stays a one-file, one-identifier change. **This is the note to act on if the slot animation disappoints in use.**
- **Also rejected:** adjacent-sections-only cloning (inconsistent behavior between adjacent and non-adjacent moves).
- **Consequences:** the eye no longer tracks a card across the gap; a capped section no longer absorbs slack from a short neighbour the way `SplitQueueList`'s top pane did; the two-array diff bug class is gone.

- [ ] **Step 7: Update the Layout Purity exemption list**

In `STYLE_GUIDE.md`, in the `layout`-tagged exemption list (§ *Exemptions*, item 1), replace `SplitQueueList` with `ProgressionQueue`, **and add `StaticSplitLayout`** — it rode `SplitQueueList`'s entry implicitly and would otherwise be orphaned. The list becomes:

```
   components **plus** `ThreePanelLayout`, `Page`, `ScrollRegion`,
   `ProgressionQueue`, `StaticSplitLayout`, `Section`, `CollapsiblePanel`,
   `Modal`, `BottomSheet`, and `ButtonGroup` (the last DEPRECATED-as-such — see
   ruling 5 below).
```

- [ ] **Step 8: Fix the component's own classification comment**

The header comment in `ProgressionQueue.tsx` currently claims "Composite (Depth 2)" while the component owns a CSS file, which `CONTEXT.md` defines as impossible. Replace the first two lines with:

```tsx
// ProgressionQueue — layout-tagged Primitive (EXEMPT-AS-LAYOUT, STYLE_GUIDE §
// Layout Purity). Owns ProgressionQueue.css: the weighted water-fill sizes each
// section in JS, which no CSS rule can express. N always-present sections stacked
// as one full-height progression bar, bucketing items by `bucketOf`.
```

Make the same correction to the first line of `ProgressionQueue.css`.

- [ ] **Step 9: Update the manifest**

In `COMPONENTS.md`:
1. Rewrite the `ProgressionQueue` entry (line ~903) to document the merged component: `sections` (with `selectable` and `emptyLabel`), the flat `items` + `bucketOf` model, the transfer animation on bucket change, select mode via `checkedKeys` presence (**no `selectMode` prop**), keyboard nav, `scrollToKey`, the selected-row treatment (accent bar, no fill), and the full 14-prop list. Point at `src/components/ProgressionQueue/README.md`.
2. Mark the `SplitQueueList` entry (line ~874) deprecated: one paragraph saying it is a compile shim over `ProgressionQueue`, is **not** pixel-identical, is removed next major, that `topCapRows` maps to the resolved section's `capRows`, and that `topOnly` / `topFloorRows` / `animationMs` / `rowHeight` are accepted but ignored. Keep the `StaticSplitLayout` sub-entry as-is and note it is **not** deprecated.
3. Delete the stale claims in the old `SplitQueueList` entry about a checkbox-click that `stopPropagation`s and a modifier-click that selects — the code never did that, and the merged component's contract is "a click on a checkable row toggles".

- [ ] **Step 10: Update the changelog and the rubric**

Add a `CHANGELOG.md` entry under a new version heading:

```markdown
### Changed
- **`ProgressionQueue` is now the library's single queue component.** It gains
  multi-select grouping (`checkedKeys` / `onToggleCheck`, scoped to sections
  marked `selectable`), roving-focus keyboard navigation
  (`focusedKey` / `onFocusChange`), `scrollToKey`, per-section `emptyLabel`, and
  a transfer animation played whenever an item's `bucketOf` result changes.
- **A selected row no longer paints a background fill** — it keeps only the inset
  accent bar, and hover owns the fill. The previous persistent fill sat behind
  row text at too low a contrast.

### Deprecated
- **`SplitQueueList` is a compile shim over `ProgressionQueue`** and is removed in
  the next major. It is **not** pixel-identical — the merged component draws its
  own chrome. `topCapRows` maps to the resolved section's `capRows`;
  `topOnly`, `topFloorRows`, `animationMs` and `rowHeight` are accepted but
  ignored. `static` mode still delegates to
  `StaticSplitLayout`, which is **not** deprecated.

### Removed
- `SplitQueueList`'s two-pane animation engine (`flight`, `play`, `flip`,
  `arrival`, `animation`, its `layout` and `keyboard` modules) — ~2,700 lines.

### Migration
Replace `resolved` / `unresolved` with one `items` array plus `bucketOf`:

\`\`\`tsx
<ProgressionQueue<T>
  sections={[
    { key: "done", label: "Categorized", tone: "success" },
    { key: "todo", label: "Suggestions", tone: "accent", selectable: true },
  ]}
  items={[...resolved, ...unresolved]}
  bucketOf={(i) => (isDone(i) ? "done" : "todo")}
  keyOf={(i) => i.key}
  renderItem={renderRow}
/>
\`\`\`

There is no `selectMode` prop — pass `checkedKeys` to turn select mode on.
\`\`\`
```

Then run `npm run style-rubric` and update `scripts/style-rubric.json` for the new and deleted files as the script directs.

- [ ] **Step 11: Full verification**

Run each and confirm all pass:

```bash
npx vitest run
npx tsc --noEmit
npx biome lint src/components/ProgressionQueue src/components/SplitQueueList
npm run build
```

The scoped lint must now report **zero** errors. `npx biome lint src` will still report the repo's 14-error / 31-warning baseline in untouched files — that is expected and not this work's concern.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "docs(progression-queue): manifest, README, showcase, ADR, exemption list, changelog"
```

---

## Post-implementation: verify against the real consumer

Not a code task — the acceptance gate before a release tag.

- [ ] Link SUI into thorcasting-ui: `cd ~/gits/primestage/solid-ui-components && npm link`, then `cd ~/gits/primestage/thorcasting-workspace/thorcasting-ui && npm link @primestageprime/solid-ui-components`. **Restart the consumer dev server** — `app.config.ts` evaluates the source-mode switch at config load.
- [ ] Confirm the Configure screen still renders through the shim, then hand the consumer migration (three sections, hold persistence, auto-select effect) to the thorcasting agent — it is explicitly out of scope here.
- [ ] Only then cut the SUI release tag and bump the consumer pin (tag SHA must equal lock SHA).

## Decisions already taken (do not re-litigate)

- **Rule #2 expansion approved by Adlai, 2026-07-24** for all three new `ProgressionSection` fields: `selectable`, `emptyLabel`, `capRows`. Peter's separate blessing was offered and not taken. Do not pause execution to re-ask.
- **`capRows` ships in this pass**, so `topCapRows` keeps an exact successor and there is no sizing regression to accept. The one deliberate difference from `SplitQueueList`: a capped section never grows past its cap to absorb slack from a short neighbour.
