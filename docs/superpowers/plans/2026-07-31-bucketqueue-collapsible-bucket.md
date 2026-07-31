# BucketQueue Collapsible Bucket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a **populated** `BucketQueue` bucket render as a click-to-expand summary line, so a consumer can stage discarded items in a pile that stays out of the way but can be peeked into.

**Architecture:** Two additive `Bucket` fields (`collapsible`, `collapsedByDefault`) drive a component-owned, sticky toggle held in one `createSignal`. The decision of *which* buckets are collapsed right now is a new pure module (`collapse.ts`); the existing sizing core (`layout.ts`) gains an optional `collapsed` array so a manually collapsed bucket gets exactly the treatment an empty one already gets; the header is extracted to `BucketHeader.tsx` and becomes a `<button>` carrying a tone-coloured chevron in the tone dot's slot; and the motion seam learns to close the source gap and cue the destination when an arriving row has nowhere to render.

**Tech Stack:** SolidJS, TypeScript, Vitest + `@solidjs/testing-library`, plain CSS with `--sui-*` theme vars, the repo's `src/fn` data-last combinators.

**Spec:** `docs/superpowers/specs/2026-07-31-bucketqueue-collapsible-bucket-design.md`

## Global Constraints

- **500-line file limit.** `BucketQueue.tsx` is at 501 lines *before* this work. Task 3 extracts the header to bring it back under; do not grow it further.
- **`fn` combinators, not dot-chains.** `dotChains` is ratcheted at **7** and `collectionMethodCalls` at **31**. Use `map`/`filter`/`flatMap`/`find`/`some` from `../../fn` (data-last: `map(f, xs)`), never `xs.map(f)`. A `for...of` that only mutates an outer accumulator is the sanctioned shape — `fn` has no `forEach`.
- **The ratchet fails you for *improving* a metric too.** If `npm run health` reports any metric moved in either direction, run `npm run health -- --update-baseline` and commit the baseline **with** the change.
- **Stage only files you touched.** Shared checkout — never `git add -A`.
- **CI installs with `--ignore-scripts`, so there is no `dist/`.** Everything must work from source.
- **Never spawn subprocesses in the vitest suite.** Test pure logic directly.
- **`undocumentedComponents` is ratcheted at 0** — `COMPONENTS.md` must describe the new capability.
- **Public API is additive only.** `naturalHeights` and `allocateHeights` are exported from the package (`README.md:387`); every new parameter is optional and omitting it must reproduce today's behaviour exactly.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/components/BucketQueue/collapse.ts` | create | Pure: which buckets are *manually* collapsed right now, and the toggle transition |
| `src/components/BucketQueue/collapse.test.ts` | create | Tests for the above |
| `src/components/BucketQueue/BucketHeader.tsx` | create | One bucket's header line — plain `<div>`, or the disclosure `<button>` with the chevron |
| `src/components/BucketQueue/types.ts` | modify | The two new `Bucket` fields |
| `src/components/BucketQueue/layout.ts` | modify | Optional `collapsed` array in both exported sizing functions |
| `src/components/BucketQueue/layout.test.ts` | modify | Tests for the new parameter |
| `src/components/BucketQueue/motion.ts` | modify | `MotionContext.bucketEl`; source FLIP survives an empty arrival set; the destination count cue |
| `src/components/BucketQueue/motion.test.ts` | modify | Tests for the above |
| `src/components/BucketQueue/BucketQueue.tsx` | modify | The signal, the memos, the wiring, the `allKeys` fix; header extracted out |
| `src/components/BucketQueue/BucketQueue.css` | modify | Button reset, chevron slot, transformable count |
| `src/components/BucketQueue/testHelpers.tsx` | modify | Collapsible fixtures |
| `src/components/BucketQueue/BucketQueue.rendering.test.tsx` | modify | Collapsed render, toggle, empty-collapsible, inert `collapsedByDefault`, stickiness |
| `src/components/BucketQueue/BucketQueue.keyboard.test.tsx` | modify | The tab-stop regression |
| `src/components/BucketQueue/BucketQueue.selection.test.tsx` | modify | Collapsing over a selection fires nothing |
| `src/components/BucketQueue/README.md` | modify | The two fields + a "Collapsible buckets" section |
| `COMPONENTS.md` | modify | The capability in the BucketQueue entry |
| `dev/showcases/bucket-queue/discard.tsx` | create | Live demo of the discard-staging shape |
| `dev/showcases/bucket-queue/index.tsx` | modify | Register the new demo |

---

### Task 1: The collapse decision, as a pure module

**Files:**
- Create: `src/components/BucketQueue/collapse.ts`
- Create: `src/components/BucketQueue/collapse.test.ts`
- Modify: `src/components/BucketQueue/types.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `collapsedFlags({ buckets, counts, overrides }): boolean[]`, `toggleCollapse(overrides, bucketKey, currentlyCollapsed): CollapseOverrides`, `type CollapseOverrides = ReadonlyMap<string, boolean>`, `interface CollapsibleBucket { key: string; collapsible?: boolean; collapsedByDefault?: boolean }`. `Bucket` gains `collapsible?: boolean` and `collapsedByDefault?: boolean`.

- [ ] **Step 1: Add the two fields to `Bucket`**

In `src/components/BucketQueue/types.ts`, insert directly after the `emptyLabel` field (currently line 27):

```ts
  /** Let the user collapse this bucket to its summary line and expand it again.
   *  Its header takes a disclosure chevron IN PLACE OF the tone dot and becomes
   *  the toggle. Only meaningful while the bucket is POPULATED: an empty bucket
   *  already collapses to its summary line and has nothing to expand into, so
   *  it renders exactly as it does without this flag — no chevron, header
   *  inert. Default false. */
  collapsible?: boolean;
  /** Start collapsed rather than open. IGNORED without `collapsible` — on its
   *  own it would strand this bucket's items behind no affordance at all.
   *  This is only the state BEFORE the user touches the bucket; the first
   *  toggle pins their choice for the life of the component, including across
   *  the bucket draining to empty and refilling. Default false. */
  collapsedByDefault?: boolean;
```

- [ ] **Step 2: Write the failing test**

Create `src/components/BucketQueue/collapse.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { collapsedFlags, toggleCollapse, type CollapseOverrides } from "./collapse";

const NONE: CollapseOverrides = new Map();

describe("collapsedFlags — which buckets are MANUALLY collapsed", () => {
  it("collapses a populated collapsedByDefault bucket the user has not touched", () => {
    const buckets = [
      { key: "todo" },
      { key: "discard", collapsible: true, collapsedByDefault: true },
    ];
    expect(collapsedFlags({ buckets, counts: [3, 2], overrides: NONE })).toEqual([false, true]);
  });

  it("leaves a collapsible bucket open when it does not declare collapsedByDefault", () => {
    const buckets = [{ key: "discard", collapsible: true }];
    expect(collapsedFlags({ buckets, counts: [2], overrides: NONE })).toEqual([false]);
  });

  it("IGNORES collapsedByDefault without collapsible — it would strand the items", () => {
    const buckets = [{ key: "discard", collapsedByDefault: true }];
    expect(collapsedFlags({ buckets, counts: [2], overrides: NONE })).toEqual([false]);
  });

  it("reports an EMPTY bucket as not manually collapsed — the empty path owns that render", () => {
    // Both size identically (see ./layout), but an empty bucket shows its
    // emptyLabel and has no chevron, so the two must not be merged here.
    const buckets = [{ key: "discard", collapsible: true, collapsedByDefault: true }];
    expect(collapsedFlags({ buckets, counts: [0], overrides: NONE })).toEqual([false]);
  });

  it("lets the user's choice win over collapsedByDefault", () => {
    const buckets = [{ key: "discard", collapsible: true, collapsedByDefault: true }];
    const overrides = new Map([["discard", false]]);
    expect(collapsedFlags({ buckets, counts: [2], overrides })).toEqual([false]);
  });

  it("keeps the user's choice across the bucket draining and refilling", () => {
    // Sticky: if the user expanded the pile, they wanted it expanded. The
    // override survives the count going to 0 and back.
    const buckets = [{ key: "discard", collapsible: true, collapsedByDefault: true }];
    const overrides = new Map([["discard", false]]);
    expect(collapsedFlags({ buckets, counts: [0], overrides })).toEqual([false]);
    expect(collapsedFlags({ buckets, counts: [5], overrides })).toEqual([false]);
  });
});

describe("toggleCollapse", () => {
  it("pins the opposite of the current state without mutating the input", () => {
    const before: CollapseOverrides = new Map();
    const after = toggleCollapse(before, "discard", true);
    expect(after.get("discard")).toBe(false);
    expect(before.size).toBe(0);
  });

  it("flips an already-pinned bucket back", () => {
    const after = toggleCollapse(new Map([["discard", false]]), "discard", false);
    expect(after.get("discard")).toBe(true);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/components/BucketQueue/collapse.test.ts`
Expected: FAIL — `Failed to resolve import "./collapse"`.

- [ ] **Step 4: Write the implementation**

Create `src/components/BucketQueue/collapse.ts`:

```ts
// BucketQueue — which buckets render as a collapsed summary line, and the
// user's toggle, as pure data.
//
// Collapse has TWO independent sources and this module deliberately reports
// only ONE of them. An EMPTY bucket collapses automatically and shows its
// `emptyLabel`; a `collapsible` bucket collapses because the user said so and
// shows nothing but its header. They size identically — see ./layout, where
// both are pinned to the summary line and kept out of the water-fill — but
// they RENDER differently, so merging them here would put a chevron on an
// empty bucket that has nothing to expand into.
import { map } from "../../fn";

/** The `Bucket` fields this module reads. Structural rather than `Bucket`
 *  itself so the decision stays testable without building whole buckets. */
export interface CollapsibleBucket {
  key: string;
  collapsible?: boolean;
  collapsedByDefault?: boolean;
}

/** The user's per-bucket choice, keyed by bucket key. A bucket ABSENT from
 *  this map is one the user has never toggled — which is not the same as one
 *  they toggled open, and is why this is a map rather than a set. */
export type CollapseOverrides = ReadonlyMap<string, boolean>;

export interface CollapseInput {
  buckets: readonly CollapsibleBucket[];
  /** Item count per bucket, index-aligned with `buckets`. */
  counts: readonly number[];
  overrides: CollapseOverrides;
}

/** Index-aligned with `buckets`: is this bucket rendering as a MANUALLY
 *  collapsed summary line right now?
 *
 *  `collapsedByDefault` is only the state before the user has touched the
 *  bucket — deliberately not "the value at mount". A bucket that is empty at
 *  mount and receives its first item later has still never been touched and
 *  must start collapsed, which a mount-time read would get wrong. */
export const collapsedFlags = ({
  buckets,
  counts,
  overrides,
}: CollapseInput): boolean[] =>
  map((bucket: CollapsibleBucket, i: number) => {
    if (bucket.collapsible !== true) return false;
    if ((counts[i] ?? 0) === 0) return false;
    return overrides.get(bucket.key) ?? bucket.collapsedByDefault === true;
  }, buckets);

/** Record the user's toggle. Their choice STICKS for the life of the
 *  component — including across the bucket draining to empty and refilling.
 *  If they expanded the pile, they wanted it expanded; the component does not
 *  undo user intent. */
export const toggleCollapse = (
  overrides: CollapseOverrides,
  bucketKey: string,
  currentlyCollapsed: boolean,
): CollapseOverrides => new Map(overrides).set(bucketKey, !currentlyCollapsed);
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/components/BucketQueue/collapse.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/BucketQueue/collapse.ts src/components/BucketQueue/collapse.test.ts src/components/BucketQueue/types.ts
git commit -m "feat(BucketQueue): collapse decision as a pure module

Adds Bucket.collapsible / Bucket.collapsedByDefault and collapse.ts, which
reports which buckets are MANUALLY collapsed. Empty buckets are deliberately
excluded: they size the same but render differently (emptyLabel, no chevron).
collapsedByDefault is inert without collapsible — alone it would strand the
bucket's items behind no affordance."
```

---

### Task 2: The sizing model learns a second way to be collapsed

**Files:**
- Modify: `src/components/BucketQueue/layout.ts`
- Modify: `src/components/BucketQueue/layout.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (deliberately — `layout.ts` takes plain arrays).
- Produces: `NaturalInput` and `AllocateInput` each gain an optional `collapsed?: boolean[]`. Omitting it reproduces today's behaviour exactly.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/BucketQueue/layout.test.ts`:

```ts
// A MANUALLY collapsed bucket (Bucket.collapsible, added 2026-07-31) is
// populated but rendering only its header. It gets exactly the treatment an
// empty bucket already gets — pinned to the summary line, out of the
// water-fill, never filling — which is why this is one new disjunct rather
// than a new sizing mode. Purely additive: omitting `collapsed` must
// reproduce every result above.
describe("collapsed — a populated bucket pinned to its header", () => {
  it("naturalHeights pins it to the header, with NO empty strip", () => {
    // It is populated, so `emptyLabel` is not showing even if declared.
    const out = naturalHeights({
      ...MIXED,
      counts: [2, 19],
      rowHeights: [31, 50],
      hasEmptyLabel: [false, true],
      emptyH: 21,
      collapsed: [false, true],
    });
    expect(out).toEqual([32 + 2 * 31 + 2, 32 + 2]);
  });

  it("naturalHeights ignores capRows for a collapsed bucket", () => {
    const out = naturalHeights({
      ...MIXED,
      counts: [2, 19],
      rowHeights: [31, 50],
      capRows: [null, 4],
      collapsed: [false, true],
    });
    expect(out[1]).toBe(32 + 2);
  });

  it("allocateHeights keeps a collapsed bucket out of the water-fill", () => {
    const counts = [8, 8];
    const natural = [34 + 8 * 54 + 2, 36]; // second one already pinned upstream
    const out = allocateHeights({
      natural, counts, weights: [1, 1], available: 300, gap: 8,
      collapsed: [false, true],
    });
    expect(out[1]).toBe(36); // pinned, not squeezed
    expect(out[0]).toBeCloseTo(300 - 8 - 36, 6); // the rest is Alpha's
  });

  it("a collapsed bucket never fills, even when it declares fill", () => {
    // Same rule as an empty one: stretching a header over half the pane is not
    // what filling is for.
    const counts = [4, 4];
    const natural = [252, 36];
    const out = allocateHeights({
      natural, counts, weights: [1, 1], available: 900, gap: 8,
      fills: [true, true], collapsed: [false, true],
    });
    expect(out[1]).toBe(36);
    expect(out[0] + out[1] + 8).toBeCloseTo(900, 6);
  });

  it("omitting `collapsed` is identical to an all-false `collapsed`", () => {
    const counts = [4, 3, 5];
    const args = { natural: natural(counts), counts, weights, available: 900, gap: 8 };
    expect(allocateHeights({ ...args, collapsed: [false, false, false] })).toEqual(
      allocateHeights(args),
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/BucketQueue/layout.test.ts`
Expected: FAIL — the `collapsed` results come back as if it were populated (e.g. `984` instead of `34`), and TS reports `collapsed` is not in `NaturalInput`.

- [ ] **Step 3: Add `collapsed` to `NaturalInput` and honour it**

In `src/components/BucketQueue/layout.ts`, add to `NaturalInput` after `hasEmptyLabel`:

```ts
  /** Whether each bucket is MANUALLY collapsed (`Bucket.collapsible` + the
   *  user's toggle — see ./collapse). A collapsed bucket is POPULATED but
   *  rendering only its header, so it is pinned to the summary line with no
   *  empty strip, and its `capRows` is moot. Omit for all-false. */
  collapsed?: boolean[];
```

Destructure it in `naturalHeights` and insert the branch **before** the `c === 0` branch:

```ts
export const naturalHeights = ({
  counts,
  rowHeights,
  capRows,
  hasEmptyLabel,
  headH,
  emptyH,
  rowFallback,
  collapsed,
}: NaturalInput): number[] => {
  const sampled = find((h: number | null) => h != null, rowHeights) ?? rowFallback;
  const rowH = (i: number): number => rowHeights[i] ?? sampled;
  return map((c: number, i: number) => {
    // MANUALLY collapsed: the header alone. No empty strip — the bucket is
    // populated, so `emptyLabel` is not what is showing; and `capRows` caps
    // a body that is not rendered.
    if (collapsed?.[i] === true) return headH + BORDERS;
    if (c === 0)
      return headH + (hasEmptyLabel[i] ? (emptyH ?? rowH(i)) : 0) + BORDERS;
    const cap = capRows[i];
    const rows = cap != null ? Math.min(c, Math.max(1, cap)) : c;
    return headH + rows * rowH(i) + BORDERS;
  }, counts);
};
```

- [ ] **Step 4: Add `collapsed` to `AllocateInput` and honour it**

Add to `AllocateInput` after `fills`:

```ts
  /** Whether each bucket is MANUALLY collapsed (see `NaturalInput.collapsed`).
   *  Treated exactly as an empty bucket is: fixed at its natural (summary
   *  line) height, kept out of the weighted share, and never filling. Omit for
   *  all-false. */
  collapsed?: boolean[];
```

Destructure `collapsed` in `allocateHeights`, then change the two predicates. The pinning loop:

```ts
  for (let i = 0; i < natural.length; i++) {
    // Empty OR manually collapsed: both are pinned to their summary line.
    if (counts[i] === 0 || collapsed?.[i] === true) pool -= natural[i];
    else {
      out[i] = 0;
      active.push(i);
    }
  }
```

and the `filling` filter:

```ts
  const filling = filter(
    (i: number) => fills?.[i] === true && counts[i] !== 0 && collapsed?.[i] !== true,
    active,
  );
```

> Note: a collapsed bucket is never in `active`, so the `collapsed` test in `filling` is belt-and-braces. Keep it — it documents the rule at the point the rule is stated, and it survives a future refactor of `active`.

- [ ] **Step 5: Update the module header comment**

Change the opening comment block's last sentence to name the new source of collapse:

```ts
// A bucket may opt out of shrink-wrapping with `fill` (added 2026-07-28), in
// which case it claims the height left over once everyone is at their natural.
// A bucket may also be MANUALLY collapsed (`collapsed`, added 2026-07-31),
// which pins it to its summary line exactly as being empty does.
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/components/BucketQueue/layout.test.ts`
Expected: PASS — the 5 new tests plus all 17 pre-existing ones (the additive contract).

- [ ] **Step 7: Commit**

```bash
git add src/components/BucketQueue/layout.ts src/components/BucketQueue/layout.test.ts
git commit -m "feat(BucketQueue): optional \`collapsed\` in the sizing core

naturalHeights and allocateHeights gain an optional collapsed[] — a populated
bucket rendering only its header is pinned to the summary line, kept out of
the weighted share and never fills, exactly as an empty bucket is. capRows and
fill therefore compose with no special-casing. Both functions are exported
public API, so the parameter is optional and omitting it is byte-identical."
```

---

### Task 3: `BucketHeader.tsx` — the chevron and the disclosure button

**Files:**
- Create: `src/components/BucketQueue/BucketHeader.tsx`
- Modify: `src/components/BucketQueue/BucketQueue.css`

**Interfaces:**
- Consumes: `Bucket` from `./types` (Task 1's fields).
- Produces: `BucketHeader(props: BucketHeaderProps)`, where

```ts
export interface BucketHeaderProps {
  bucket: Bucket;
  count: number;
  /** The bucket can be toggled RIGHT NOW — declared `collapsible` AND populated. */
  toggleable: boolean;
  collapsed: boolean;
  /** id of the body this header discloses, for `aria-controls`. */
  bodyId: string;
  onToggle: () => void;
  ref: (el: HTMLElement) => void;
}
```

This task ships the component and its styles; Task 4 mounts it.

- [ ] **Step 1: Create the component**

Create `src/components/BucketQueue/BucketHeader.tsx`:

```tsx
// BucketQueue — one bucket's header line. Extracted from BucketQueue.tsx
// (2026-07-31) when the collapsible bucket pushed that file past the repo's
// 500-line limit.
//
// A collapsible AND populated bucket renders its header as the disclosure
// button; every other bucket keeps the plain div it has always had, so nothing
// about a non-collapsible queue's markup changes. The chevron REPLACES the
// tone dot rather than joining it: the component allows exactly one
// role-coloured mark per bucket (chrome stays neutral — see types.ts), the
// chevron becomes that mark, and because it occupies the dot's exact 8px slot
// every bucket's label stays on the same left edge either way.
import { Show, type JSX } from "solid-js";
import type { Bucket } from "./types";

// A function, not a shared element: a single JSX expression evaluates to ONE
// DOM node, which rendering in several headers would move rather than copy.
const Chevron = (): JSX.Element => (
  <svg width="7" height="9" viewBox="0 0 7 9" fill="none" aria-hidden="true">
    <path
      d="M1 1l4 3.5L1 8"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export interface BucketHeaderProps {
  bucket: Bucket;
  count: number;
  /** The bucket can be toggled RIGHT NOW — declared `collapsible` AND
   *  populated. An empty bucket has nothing to expand into, so it renders as
   *  a plain header even when it declares `collapsible`. */
  toggleable: boolean;
  collapsed: boolean;
  /** id of the body this header discloses, for `aria-controls`. */
  bodyId: string;
  onToggle: () => void;
  ref: (el: HTMLElement) => void;
}

export function BucketHeader(props: BucketHeaderProps): JSX.Element {
  const Contents = (): JSX.Element => (
    <>
      <span class="bucket-queue__title">
        <Show
          when={props.toggleable}
          fallback={
            <span
              class={`bucket-queue__dot bucket-queue__dot--${props.bucket.tone}`}
            />
          }
        >
          <span
            class={`bucket-queue__chevron bucket-queue__chevron--${props.bucket.tone}`}
            classList={{ "bucket-queue__chevron--expanded": !props.collapsed }}
            aria-hidden="true"
          >
            <Chevron />
          </span>
        </Show>
        {props.bucket.label}
      </span>
      <span class="bucket-queue__count">{props.count}</span>
    </>
  );

  return (
    <Show
      when={props.toggleable}
      fallback={
        <div class="bucket-queue__header" ref={props.ref}>
          <Contents />
        </div>
      }
    >
      {/* `aria-controls` deliberately names an element that does not exist
          while collapsed: the body is UNMOUNTED, not hidden, because the
          sizing model measures live elements and a display:none body would
          still be found by revealRow's and the FLIP sweep's [data-bq-key]
          queries. A dangling aria-controls is well tolerated; rows lingering
          in the DOM is not. */}
      <button
        type="button"
        class="bucket-queue__header bucket-queue__header--toggle"
        aria-expanded={!props.collapsed}
        aria-controls={props.bodyId}
        onClick={() => props.onToggle()}
        ref={props.ref}
      >
        <Contents />
      </button>
    </Show>
  );
}
```

- [ ] **Step 2: Make `.bucket-queue__count` transformable**

Task 5's arrival cue scales this element, and `transform` has no effect on a non-replaced inline box. In `src/components/BucketQueue/BucketQueue.css`, change the `.bucket-queue__count` rule to:

```css
.bucket-queue__count {
  /* inline-block so it is transformable: a row arriving in a COLLAPSED bucket
     has no slot to open, so the count is what acknowledges it (see ./motion). */
  display: inline-block;
  font-variant-numeric: tabular-nums;
  font-size: 0.95rem;
}
```

- [ ] **Step 3: Add the button reset and the chevron slot**

Append to `src/components/BucketQueue/BucketQueue.css`, after the `.bucket-queue__dot--muted, .bucket-queue__dot--default` rule:

```css
/* A collapsible, populated bucket's header IS the toggle. The UA button box is
   reset completely and deliberately: `headH` is measured from bucket 0's
   header ALONE (see BucketQueue.tsx) and applied to every bucket, so a
   button's default font-family, padding, margin or border leaking in would
   mis-size the entire bar — not just this header. `font-family`/`line-height`
   are named individually rather than via the `font` shorthand, which would
   also wipe the weight, size and letter-spacing the base rule sets. */
.bucket-queue__header--toggle {
  appearance: none;
  -webkit-appearance: none;
  margin: 0;
  background: none;
  border: none;
  border-bottom: 1px solid var(--sui-border);
  border-radius: 0;
  color: inherit;
  font-family: inherit;
  line-height: inherit;
  width: 100%;
  text-align: left;
  cursor: pointer;
}
.bucket-queue__header--toggle:hover {
  background: var(--sui-bg-hover, rgba(127, 127, 127, 0.08));
}
.bucket-queue__header--toggle:focus-visible {
  outline: 1px solid var(--sui-border-focus);
  outline-offset: -1px;
}

/* The disclosure chevron occupies EXACTLY the tone dot's 8px slot, and
   replaces it — one role-coloured mark per bucket, same place, so a
   collapsible bucket's label sits on the same left edge as every other. */
.bucket-queue__chevron {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 8px;
  height: 8px;
  color: var(--sui-text-muted);
  transition: transform 150ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.bucket-queue__chevron--expanded {
  transform: rotate(90deg);
}
.bucket-queue__chevron--success {
  color: var(--sui-success);
}
.bucket-queue__chevron--danger {
  color: var(--sui-danger);
}
.bucket-queue__chevron--warning {
  color: var(--sui-warning);
}
.bucket-queue__chevron--accent {
  color: var(--sui-accent);
}
.bucket-queue__chevron--muted,
.bucket-queue__chevron--default {
  color: var(--sui-text-muted);
}
@media (prefers-reduced-motion: reduce) {
  .bucket-queue__chevron {
    transition: none;
  }
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: clean. If Biome flags the `<button>`, read the message — a `type="button"` with an `onClick` and no nested interactive content should pass its a11y rules.

- [ ] **Step 5: Commit**

```bash
git add src/components/BucketQueue/BucketHeader.tsx src/components/BucketQueue/BucketQueue.css
git commit -m "feat(BucketQueue): BucketHeader with the disclosure chevron

Extracts the header from BucketQueue.tsx (which sat at 501 lines) and gives a
collapsible, populated bucket a <button> header carrying a tone-coloured
chevron in the tone dot's exact 8px slot. Every other bucket keeps the plain
div, so non-collapsible markup is unchanged. The UA button box is fully reset
because headH is measured from bucket 0's header and applied to all of them.
Count is now inline-block so Task 5's arrival cue can transform it."
```

---

### Task 4: Wire it into the component

**Files:**
- Modify: `src/components/BucketQueue/BucketQueue.tsx`
- Modify: `src/components/BucketQueue/testHelpers.tsx`
- Modify: `src/components/BucketQueue/BucketQueue.rendering.test.tsx`
- Modify: `src/components/BucketQueue/BucketQueue.keyboard.test.tsx`
- Modify: `src/components/BucketQueue/BucketQueue.selection.test.tsx`

**Interfaces:**
- Consumes: `collapsedFlags`, `toggleCollapse`, `CollapseOverrides` (Task 1); `naturalHeights`/`allocateHeights`'s `collapsed` (Task 2); `BucketHeader` (Task 3).
- Produces: the finished rendering behaviour. No new public exports.

- [ ] **Step 1: Add the collapsible fixtures**

Append to `src/components/BucketQueue/testHelpers.tsx`:

```tsx
export const COLLAPSIBLE: Bucket[] = [
  { key: "a", label: "Alpha", tone: "success" },
  {
    key: "b",
    label: "Discard",
    tone: "muted",
    collapsible: true,
    collapsedByDefault: true,
    emptyLabel: "Nothing discarded",
  },
];

export const renderBuckets = (
  buckets: Bucket[],
  items: Item[],
  extra: Record<string, unknown> = {},
) =>
  render(() => (
    <BucketQueue<Item>
      buckets={buckets}
      items={items}
      bucketOf={(i) => i.bucket}
      keyOf={(i) => i.id}
      renderItem={(i) => <span>{i.id}</span>}
      height={600}
      {...extra}
    />
  ));

/** The disclosure button of the (single) collapsible bucket on screen. */
export const toggleButton = (container: HTMLElement) =>
  container.querySelector(".bucket-queue__header--toggle") as HTMLButtonElement | null;
```

- [ ] **Step 2: Write the failing rendering tests**

Append inside the top-level `describe("BucketQueue — rendering & sizing", ...)` block in `src/components/BucketQueue/BucketQueue.rendering.test.tsx` (and add `COLLAPSIBLE`, `renderBuckets`, `toggleButton` to the import from `./testHelpers`, plus `createSignal` from `solid-js` and `fireEvent` from `@solidjs/testing-library`):

```tsx
  // A POPULATED bucket rendered as a click-to-expand summary line
  // (Bucket.collapsible, 2026-07-31). Distinct from the empty-bucket collapse
  // above: this one has items, shows a chevron instead of its tone dot, and
  // shows no emptyLabel.
  describe("collapsible buckets", () => {
    const ITEMS: Item[] = [
      { id: "keep", bucket: "a" },
      { id: "d1", bucket: "b" },
      { id: "d2", bucket: "b" },
    ];

    it("renders a collapsedByDefault bucket as its header alone, with its count", () => {
      const { container } = renderBuckets(COLLAPSIBLE, ITEMS);
      const buckets = container.querySelectorAll(".bucket-queue__bucket");
      expect(buckets[1].querySelectorAll(".bucket-queue__row")).toHaveLength(0);
      expect(buckets[1].querySelector(".bucket-queue__count")?.textContent).toBe("2");
      expect(bucketHeights(container)[1]).toBe("36px"); // header 34 + 2 border
    });

    it("shows no empty strip while collapsed — it is populated, not empty", () => {
      const { container } = renderBuckets(COLLAPSIBLE, ITEMS);
      expect(container.querySelector(".bucket-queue__empty")).toBeNull();
    });

    it("replaces the tone dot with a tone-coloured chevron", () => {
      const { container } = renderBuckets(COLLAPSIBLE, ITEMS);
      const discard = container.querySelectorAll(".bucket-queue__bucket")[1];
      expect(discard.querySelector(".bucket-queue__dot")).toBeNull();
      expect(discard.querySelector(".bucket-queue__chevron--muted")).toBeTruthy();
      // The other bucket is untouched — still a dot.
      const alpha = container.querySelectorAll(".bucket-queue__bucket")[0];
      expect(alpha.querySelector(".bucket-queue__dot--success")).toBeTruthy();
    });

    it("expands on click, and re-collapses on a second click", () => {
      const { container } = renderBuckets(COLLAPSIBLE, ITEMS);
      const button = toggleButton(container)!;
      expect(button.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(button);
      expect(container.querySelectorAll(".bucket-queue__row")).toHaveLength(3);
      expect(toggleButton(container)!.getAttribute("aria-expanded")).toBe("true");

      fireEvent.click(toggleButton(container)!);
      expect(container.querySelectorAll(".bucket-queue__row")).toHaveLength(1);
    });

    it("renders an EMPTY collapsible bucket exactly as it did before the flag", () => {
      // Nothing to expand into: no chevron, no button, and its emptyLabel shows.
      const { container } = renderBuckets(COLLAPSIBLE, [{ id: "keep", bucket: "a" }]);
      expect(toggleButton(container)).toBeNull();
      expect(container.querySelector(".bucket-queue__chevron")).toBeNull();
      expect(container.querySelector(".bucket-queue__dot--muted")).toBeTruthy();
      expect(container.querySelector(".bucket-queue__empty")?.textContent).toBe(
        "Nothing discarded",
      );
    });

    it("IGNORES collapsedByDefault when the bucket is not collapsible", () => {
      const buckets: Bucket[] = [
        { key: "a", label: "Alpha", tone: "success" },
        { key: "b", label: "Discard", tone: "muted", collapsedByDefault: true },
      ];
      const { container } = renderBuckets(buckets, ITEMS);
      expect(container.querySelectorAll(".bucket-queue__row")).toHaveLength(3);
      expect(toggleButton(container)).toBeNull();
    });

    it("keeps the user's expansion across the bucket draining and refilling", () => {
      // Sticky by design: if the user opened the pile, they wanted it open, and
      // the consumer's "Empty N discards" button must not silently re-close it.
      const [items, setItems] = createSignal<Item[]>(ITEMS);
      const { container } = render(() => (
        <BucketQueue<Item>
          buckets={COLLAPSIBLE}
          items={items()}
          bucketOf={(i) => i.bucket}
          keyOf={(i) => i.id}
          renderItem={(i) => <span>{i.id}</span>}
          height={600}
        />
      ));

      fireEvent.click(toggleButton(container)!);
      expect(container.querySelectorAll(".bucket-queue__row")).toHaveLength(3);

      setItems([{ id: "keep", bucket: "a" }]); // "Empty 2 discards"
      expect(container.querySelector(".bucket-queue__empty")).toBeTruthy();

      setItems([{ id: "keep", bucket: "a" }, { id: "d3", bucket: "b" }]);
      expect(container.querySelectorAll(".bucket-queue__row")).toHaveLength(2);
      expect(toggleButton(container)!.getAttribute("aria-expanded")).toBe("true");
    });
  });
```

- [ ] **Step 3: Write the failing keyboard test**

Append to the main `describe` in `src/components/BucketQueue/BucketQueue.keyboard.test.tsx` (importing `COLLAPSIBLE` and `renderBuckets` from `./testHelpers`):

```tsx
  // REGRESSION: `allKeys` is built from the ITEMS, not the DOM. A collapsed
  // bucket's rows would otherwise stay in the roving sequence while absent
  // from the page, the single tab stop would be assigned to a row that renders
  // nowhere, and NO row would carry tabindex="0" — the whole queue silently
  // leaves the tab order.
  it("keeps a tab stop on a rendered row when a bucket is collapsed", () => {
    const buckets: Bucket[] = [
      {
        key: "a",
        label: "Discard",
        tone: "muted",
        collapsible: true,
        collapsedByDefault: true,
      },
      { key: "b", label: "Beta", tone: "accent" },
    ];
    const { container } = renderBuckets(
      buckets,
      [
        { id: "hidden-1", bucket: "a" },
        { id: "hidden-2", bucket: "a" },
        { id: "visible-1", bucket: "b" },
        { id: "visible-2", bucket: "b" },
      ],
      { onSelect: () => {} },
    );

    const tabbable = container.querySelector('[data-bq-key][tabindex="0"]');
    expect(tabbable).not.toBeNull();
    expect((tabbable as HTMLElement).dataset.bqKey).toBe("visible-1");
  });

  it("exposes the toggle as a real button, so Enter/Space activate it natively", () => {
    const { container } = renderBuckets(COLLAPSIBLE, [
      { id: "keep", bucket: "a" },
      { id: "d1", bucket: "b" },
    ]);
    const button = toggleButton(container)!;
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
  });
```

- [ ] **Step 4: Write the failing selection test**

Append to the main `describe` in `src/components/BucketQueue/BucketQueue.selection.test.tsx`:

```tsx
  // Collapsing hides rows; it does not move the selection. Firing onSelect(null)
  // here would break the contract that `null` ONLY ever comes from the triage
  // advance (see README), and whether a hidden selection still merits a detail
  // panel is the consumer's call.
  it("fires nothing when a bucket holding the selection is collapsed", () => {
    const calls: (string | null)[] = [];
    const buckets: Bucket[] = [
      { key: "a", label: "Alpha", tone: "success" },
      { key: "b", label: "Discard", tone: "muted", collapsible: true },
    ];
    const { container } = renderBuckets(
      buckets,
      [
        { id: "keep", bucket: "a" },
        { id: "sel", bucket: "b" },
      ],
      { selectedKey: "sel", onSelect: (k: string | null) => calls.push(k) },
    );

    fireEvent.click(toggleButton(container)!); // collapse it
    expect(container.querySelector('[data-bq-key="sel"]')).toBeNull();
    expect(calls).toEqual([]);
  });
```

- [ ] **Step 5: Run all three to verify they fail**

Run: `npx vitest run src/components/BucketQueue/`
Expected: FAIL — the collapsible bucket renders its rows, `toggleButton` returns `null`, and the keyboard test finds no tabbable row.

- [ ] **Step 6: Import the new modules**

In `src/components/BucketQueue/BucketQueue.tsx`, add `createUniqueId` to the `solid-js` import, add `filter` and `pipe` to the `../../fn` import, and add:

```ts
import { BucketHeader } from "./BucketHeader";
import { collapsedFlags, toggleCollapse, type CollapseOverrides } from "./collapse";
```

- [ ] **Step 7: Widen the measured-element types from `HTMLDivElement` to `HTMLElement`**

The header is now a `<button>` on some buckets. In `BucketQueue.tsx`, change `let headRef: HTMLDivElement | undefined;` to `let headRef: HTMLElement | undefined;`, and change the element type in `observeSlot`, `tracker`, and `trackHead`'s setter from `HTMLDivElement` to `HTMLElement`. Leave `rootRef`, `emptyRef`, `rowRefs` and `trackRow` as `HTMLDivElement` — those are still divs.

- [ ] **Step 8: Add the signal and the memos**

Insert directly after the `counts` memo (currently line 72):

```ts
  // Expand/collapse is pure UI chrome — it never needs to survive outside this
  // component or round-trip to a server — so it is component-owned rather than
  // a controlled prop pair. The controlled surface (`selectedKey`,
  // `checkedKeys`) stays reserved for state that genuinely needs external
  // ownership. The map holds only buckets the user has TOUCHED; see ./collapse
  // for why an absent entry is not the same as one toggled open.
  const [collapseOverrides, setCollapseOverrides] =
    createSignal<CollapseOverrides>(new Map());
  const collapsed = createMemo(() =>
    collapsedFlags({
      buckets: props.buckets,
      counts: counts(),
      overrides: collapseOverrides(),
    }),
  );
  // The same decision keyed by bucket, for the keyboard sequence below, which
  // has a bucket in hand rather than an index.
  const collapsedKeys = createMemo(() => {
    const flags = collapsed();
    return new Set(
      pipe(
        props.buckets,
        map((s: Bucket, i: number) => (flags[i] === true ? s.key : null)),
        filter((k): k is string => k !== null),
      ),
    );
  });
```

- [ ] **Step 9: Feed `collapsed` to the sizing**

Add `collapsed: collapsed(),` to both the `naturalHeights({...})` call and the `allocateHeights({...})` call.

- [ ] **Step 10: Fix the roving-tabindex sequence**

Change the `allKeys` deps entry in the `createRowKeyboard({...})` call to:

```ts
    allKeys: () =>
      flatMap(
        (s) =>
          // A collapsed bucket's rows are NOT on the page. Leaving them here
          // lets the single tab stop be assigned to a row that renders
          // nowhere, which puts NO row in the tab order at all.
          interactiveIn(s) && !collapsedKeys().has(s.key)
            ? map((it) => props.keyOf(it), itemsIn(s.key))
            : [],
        props.buckets,
      ),
```

- [ ] **Step 11: Render through `BucketHeader` and gate the body**

Replace the body of the `<For each={props.buckets}>` callback (currently lines 399-497) with:

```tsx
        {(bucket, i) => {
          const count = () => counts()[i()];
          const isCollapsed = () => collapsed()[i()] === true;
          // Declared collapsible AND populated — an empty bucket has nothing
          // to expand into, so it renders as a plain header.
          const toggleable = () => bucket.collapsible === true && count() > 0;
          const bodyId = createUniqueId();
          return (
            <div
              class="bucket-queue__bucket"
              data-bq-bucket={bucket.key}
              style={{ height: `${Math.round(heights()[i()] ?? 0)}px` }}
            >
              <BucketHeader
                bucket={bucket}
                count={count()}
                toggleable={toggleable()}
                collapsed={isCollapsed()}
                bodyId={bodyId}
                onToggle={() =>
                  setCollapseOverrides((prev) =>
                    toggleCollapse(prev, bucket.key, isCollapsed()),
                  )
                }
                ref={(el) => {
                  if (i() === 0) trackHead(el);
                }}
              />
              <Show
                when={count() > 0 && !isCollapsed()}
                fallback={
                  // `count() === 0` guard: a COLLAPSED bucket is populated, so
                  // it must never show the "nothing here" strip.
                  <Show when={count() === 0 && bucket.emptyLabel != null}>
                    <div
                      class="bucket-queue__empty"
                      ref={(el) => { if (i() === firstEmptyLabelled()) trackEmpty(el); }}
                    >
                      {bucket.emptyLabel}
                    </div>
                  </Show>
                }
              >
                <div
                  class="bucket-queue__body"
                  id={bodyId}
                  role="listbox"
                  aria-label={bucket.label}
                >
                  {/* …the existing <For each={itemsIn(bucket.key)}> row block,
                      unchanged, moves here verbatim… */}
                </div>
              </Show>
            </div>
          );
        }}
```

> Keep the row `<For>` exactly as it is — only its surroundings change.

- [ ] **Step 12: Update the file header comment**

In the `Sizing (ruled 2026-07-22)` paragraph at the top of `BucketQueue.tsx`, add after the `fill` sentence:

```
// A bucket may also declare `collapsible`, which lets the user collapse it to
// that same summary line while it still HAS items, and expand it again; that
// choice is this component's own state and sticks once made (see ./collapse).
```

- [ ] **Step 13: Run the whole BucketQueue suite**

Run: `npx vitest run src/components/BucketQueue/`
Expected: PASS — all new tests plus every pre-existing one.

- [ ] **Step 14: Typecheck, lint, and check the line count**

Run: `npm run typecheck && npm run lint && wc -l src/components/BucketQueue/BucketQueue.tsx`
Expected: clean, and `BucketQueue.tsx` under 500 lines.

- [ ] **Step 15: Commit**

```bash
git add src/components/BucketQueue/BucketQueue.tsx src/components/BucketQueue/testHelpers.tsx src/components/BucketQueue/BucketQueue.rendering.test.tsx src/components/BucketQueue/BucketQueue.keyboard.test.tsx src/components/BucketQueue/BucketQueue.selection.test.tsx
git commit -m "feat(BucketQueue): render and toggle the collapsible bucket

Mounts BucketHeader, feeds collapsed[] to the sizing, and gates the body. The
toggle is component-owned and sticky — it survives the bucket draining and
refilling, because if the user opened the pile they wanted it open.

Also fixes a tab-order regression the feature would otherwise introduce:
allKeys is built from the items, not the DOM, so a collapsed bucket's rows
stayed in the roving sequence while absent from the page and the single tab
stop could be assigned to a row rendering nowhere — leaving NO row with
tabindex=0 and dropping the queue out of the tab order entirely."
```

---

### Task 5: Motion — the source gap still closes, and the pile acknowledges the arrival

**Files:**
- Modify: `src/components/BucketQueue/motion.ts`
- Modify: `src/components/BucketQueue/motion.test.ts`
- Modify: `src/components/BucketQueue/BucketQueue.tsx`

**Interfaces:**
- Consumes: `Transfer.to` (already exists), the `[data-bq-bucket]` marker (already exists).
- Produces: `MotionContext` gains `bucketEl: (bucketKey: string) => HTMLElement | undefined`.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/BucketQueue/motion.test.ts`:

```ts
// A row moving into a COLLAPSED bucket has no destination element — the
// bucket renders only its header. Two things must still happen: the vacated
// slot in the SOURCE bucket must close (nothing else moves those rows, since
// the departing element is already gone from the DOM), and the pile must be
// seen receiving the row rather than the row simply vanishing.
const stubAnimate = (el: HTMLElement, recorded: Recorded[]) => {
  (el as unknown as { animate: unknown }).animate = (keyframes: Keyframe[]) => {
    recorded.push({ el, keyframes });
    return { finished: Promise.resolve(), cancel: () => {} };
  };
};

const buildCollapsedDestination = (recorded: Recorded[]) => {
  const root = document.createElement("div");

  const source = document.createElement("div");
  source.dataset.bqBucket = "todo";
  const moved = document.createElement("div");
  moved.dataset.bqKey = "t1";
  const stayer = document.createElement("div");
  stayer.dataset.bqKey = "t2";
  stubAnimate(stayer, recorded);
  source.append(moved, stayer);

  const destination = document.createElement("div");
  destination.dataset.bqBucket = "discard";
  const count = document.createElement("span");
  count.className = "bucket-queue__count";
  count.textContent = "1";
  stubAnimate(count, recorded);
  destination.append(count); // collapsed: a header count, no rows

  root.append(source, destination);

  // jsdom reports every rect as zero, so the row that stays behind is given a
  // top that CHANGES between the snapshot and the play — which is exactly what
  // the closing gap does to it.
  let stayerTop = 100;
  stayer.getBoundingClientRect = () =>
    ({ top: stayerTop, height: 54 }) as DOMRect;
  const closeTheGap = () => {
    moved.remove();
    stayerTop = 46;
  };

  const ctx = {
    root,
    rowEl: () => undefined, // the destination row does not exist
    bucketEl: (key: string) =>
      (root.querySelector(`[data-bq-bucket="${key}"]`) as HTMLElement) ?? undefined,
    reducedMotion: false,
  };

  return { root, ctx, count, stayer, closeTheGap };
};

describe("createSlotMotion — a destination that cannot render the arriving row", () => {
  it("still FLIPs the rows the departure displaced", async () => {
    const recorded: Recorded[] = [];
    const { root, ctx, stayer, closeTheGap } = buildCollapsedDestination(recorded);
    const motion = createSlotMotion();

    motion.capture(root);
    closeTheGap();
    await motion.play([TRANSFER_TO_DISCARD], ctx);

    const flip = recorded.find((r) => r.el === stayer);
    expect(flip).toBeDefined();
    expect(flip!.keyframes[0].transform).toBe("translateY(54px)");
  });

  it("cues the collapsed bucket's count so the row is seen being received", async () => {
    const recorded: Recorded[] = [];
    const { root, ctx, count, closeTheGap } = buildCollapsedDestination(recorded);
    const motion = createSlotMotion();

    motion.capture(root);
    closeTheGap();
    await motion.play([TRANSFER_TO_DISCARD], ctx);

    const cue = recorded.find((r) => r.el === count);
    expect(cue).toBeDefined();
    expect(cue!.keyframes.map((k) => k.transform)).toEqual([
      "scale(1)",
      "scale(1.15)",
      "scale(1)",
    ]);
  });

  it("still animates nothing under prefers-reduced-motion", async () => {
    const recorded: Recorded[] = [];
    const { root, ctx, closeTheGap } = buildCollapsedDestination(recorded);
    const motion = createSlotMotion();

    motion.capture(root);
    closeTheGap();
    await motion.play([TRANSFER_TO_DISCARD], { ...ctx, reducedMotion: true });

    expect(recorded).toEqual([]);
  });
});
```

Add the transfer constant next to the existing `TRANSFER`:

```ts
const TRANSFER_TO_DISCARD: Transfer = {
  key: "t1",
  from: "todo",
  to: "discard",
  direction: 1,
};
```

And add `bucketEl: () => undefined,` to the `ctx` object literal in each of the two pre-existing tests, so they still satisfy `MotionContext`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/BucketQueue/motion.test.ts`
Expected: FAIL — `bucketEl` is not on `MotionContext`, and both the FLIP and the cue are missing because `play` returns at the `arrivals.length === 0` guard.

- [ ] **Step 3: Add `bucketEl` to `MotionContext`**

In `src/components/BucketQueue/motion.ts`:

```ts
export interface MotionContext {
  root: HTMLElement;
  rowEl: (key: string) => HTMLElement | undefined;
  /** The bucket box for a bucket key. Needed because a row arriving in a
   *  COLLAPSED bucket has no element of its own to animate — the bucket
   *  renders only its header — so the destination is cued instead. */
  bucketEl: (bucketKey: string) => HTMLElement | undefined;
  reducedMotion: boolean;
}
```

- [ ] **Step 4: Collect the cues and stop bailing on the whole batch**

In `motion.ts`, add above `createSlotMotion`:

```ts
// The count in a bucket's header — what a collapsed bucket has instead of a
// slot for the arriving row.
const countElOf = (bucket: HTMLElement | undefined): HTMLElement | null =>
  bucket?.querySelector<HTMLElement>(".bucket-queue__count") ?? null;
```

Then replace this, in `play`:

```ts
      if (arrivals.length === 0) return;
```

with:

```ts
      // Destinations that could not render the arriving row — a COLLAPSED
      // bucket. The row has nowhere to open, but the pile must still be seen
      // receiving it. A Set because two rows landing in the same collapsed
      // bucket are one cue, not two competing animations on one element.
      // (A for…of over an accumulator rather than a combinator: `fn` has no
      // forEach, and this is pure side-effecting iteration.)
      const cueEls = new Set<HTMLElement>();
      for (const { transfer, el } of candidates) {
        if (el != null) continue;
        const countEl = countElOf(ctx.bucketEl(transfer.to));
        if (countEl && canAnimate(countEl)) cueEls.add(countEl);
      }
      // NO blanket early return on an empty `arrivals`. A transfer with no
      // destination element still has a SOURCE bucket whose vacated slot must
      // close — the departing element is already gone from the DOM, so the
      // FLIP pass below is the only thing that moves those rows. Bailing here
      // made every row under a discarded one jump.
```

- [ ] **Step 5: Animate the cues**

In the `animations` array in the write phase, append a third spread after the `flipPlans` one:

```ts
        ...map(
          (el: HTMLElement) =>
            el.animate(
              [
                { transform: "scale(1)" },
                { transform: "scale(1.15)" },
                { transform: "scale(1)" },
              ],
              { duration: DURATION_MS, easing: EASING },
            ),
          [...cueEls],
        ),
```

- [ ] **Step 6: Update the module header comment**

In `motion.ts`'s opening block, after the sentence describing the shipped implementation, add:

```
 * A transfer whose destination cannot render the arriving row — a COLLAPSED
 * bucket — still closes the vacated slot in its source bucket, and cues the
 * destination's count so the row is seen being received rather than vanishing.
```

- [ ] **Step 7: Supply `bucketEl` from the component**

In `src/components/BucketQueue/BucketQueue.tsx`, inside the `queueMicrotask` block, add to the `ctx` object:

```ts
        bucketEl: (bucketKey: string) =>
          find((n) => n.dataset.bqBucket === bucketKey, [
            ...root.querySelectorAll<HTMLElement>("[data-bq-bucket]"),
          ]),
```

- [ ] **Step 8: Run the tests**

Run: `npx vitest run src/components/BucketQueue/`
Expected: PASS — 5 motion tests plus everything else.

- [ ] **Step 9: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add src/components/BucketQueue/motion.ts src/components/BucketQueue/motion.test.ts src/components/BucketQueue/BucketQueue.tsx
git commit -m "fix(BucketQueue): animate a transfer into a bucket that renders no rows

play() narrowed a batch to transfers with a live destination row and then
bailed on the WHOLE batch if none survived — so a row discarded into a
collapsed bucket suppressed the source bucket's gap-closing FLIP too, and
every row under it jumped. The FLIP pass is independent of arrivals; only the
arrival animation needs one.

MotionContext gains bucketEl so the choreographer can cue the collapsed
destination's count, which is what a bucket with no slot to open has instead."
```

---

### Task 6: Docs, showcase, and the ratchet

**Files:**
- Modify: `src/components/BucketQueue/README.md`
- Modify: `COMPONENTS.md`
- Create: `dev/showcases/bucket-queue/discard.tsx`
- Modify: `dev/showcases/bucket-queue/index.tsx`

**Interfaces:**
- Consumes: everything above. Produces: no code.

- [ ] **Step 1: Add the two fields to the README's `Bucket` table**

In `src/components/BucketQueue/README.md`, add two rows after the `capRows` row:

```markdown
| `collapsible?` | `boolean` | The user can collapse this bucket to its summary line and expand it again. Its header becomes a button and takes a chevron in place of its tone dot. Only applies while the bucket is populated. Default false. |
| `collapsedByDefault?` | `boolean` | Start collapsed. **Ignored without `collapsible`.** Only the state before the user first toggles the bucket. Default false. |
```

- [ ] **Step 2: Add a "Collapsible buckets" section**

Insert into `src/components/BucketQueue/README.md` immediately before the `## Motion` section:

```markdown
## Collapsible buckets

A bucket collapses to its summary line automatically when it is **empty**. A
`collapsible` bucket can also be collapsed while it still **has items** — a
staging pile that shouldn't dominate the queue, but that the user can open to
see what's in it and pull rows back out.

```tsx
const buckets: Bucket[] = [
  { key: "todo", label: "Suggestions", tone: "accent" },
  { key: "done", label: "Categorized", tone: "success" },
  // Starts as a one-line summary even holding 20 rows. Click to open.
  { key: "discard", label: "Discard", tone: "muted",
    collapsible: true, collapsedByDefault: true,
    emptyLabel: "Nothing discarded" },
];
```

- **The header is the toggle.** It renders as a `<button>` carrying
  `aria-expanded`, so Enter and Space work with no extra wiring. The
  disclosure chevron **replaces** the tone dot in the same 8px slot, so
  labels stay on one left edge and the bucket still has exactly one
  role-coloured mark.
- **It applies only while the bucket is populated.** An empty `collapsible`
  bucket renders exactly as any other empty bucket — its `emptyLabel`, its
  dot, and no toggle, because there is nothing to expand into.
- **`collapsedByDefault` needs `collapsible`.** On its own it is ignored; it
  would otherwise start the bucket collapsed with no way to open it.
- **The state is the component's, and it sticks.** There is no
  `expandedKeys`/`onToggleExpand` pair — expand/collapse never needs to leave
  the component. `collapsedByDefault` is only the state *before the user
  touches the bucket*; once they toggle it, their choice holds for the life of
  the component, **including across the bucket draining to empty and
  refilling**. If the user opened the pile, they wanted it open, and emptying
  it elsewhere in your UI does not re-close it.
- **A collapsed bucket sizes exactly like an empty one** — pinned to its
  summary line, out of the weighted share, and never `fill`ing. `capRows` is
  moot while collapsed.
- **The selection is not moved by a collapse.** If `selectedKey` names a row
  in a bucket the user collapses, the row hides and nothing fires; `onSelect`
  still only ever emits `null` from the triage advance.
- **A row moving into a collapsed bucket** cannot animate into a slot that
  isn't rendered, so the vacated slot in its source bucket closes as usual and
  the collapsed bucket's count pulses to show it was received.
```

- [ ] **Step 3: Update `COMPONENTS.md`**

Find the `BucketQueue` entry and add the capability to its description, matching the surrounding entries' voice — e.g. append to its summary sentence:

```
A bucket may also be marked `collapsible` (with `collapsedByDefault`) to render
as a click-to-expand summary line while still holding items.
```

- [ ] **Step 4: Build the showcase**

Create `dev/showcases/bucket-queue/discard.tsx`:

```tsx
// The discard-staging shape: everything you reject piles into a collapsed
// bucket instead of disappearing, and one button commits the pile. Demonstrates
// `collapsible` + `collapsedByDefault`, and that the pile stays open once
// opened — including after it is emptied and refills.
import { createSignal } from "solid-js";
import { BucketQueue, type Bucket } from "../../../src/components/BucketQueue";
import { map, filter } from "../../../src/fn";

interface Suggestion {
  id: string;
  label: string;
  bucket: string;
}

const BUCKETS: Bucket[] = [
  { key: "todo", label: "Suggestions", tone: "accent" },
  { key: "kept", label: "Accepted", tone: "success", emptyLabel: "Nothing accepted yet" },
  {
    key: "discard",
    label: "Discard",
    tone: "muted",
    collapsible: true,
    collapsedByDefault: true,
    emptyLabel: "Nothing discarded",
  },
];

const SEED: Suggestion[] = map(
  (n: number) => ({ id: `s${n}`, label: `Suggestion ${n}`, bucket: "todo" }),
  [1, 2, 3, 4, 5, 6, 7, 8],
);

export function DiscardStagingShowcase() {
  const [items, setItems] = createSignal<Suggestion[]>(SEED);
  const [selected, setSelected] = createSignal<string | undefined>("s1");

  const moveTo = (bucket: string) => (id: string) =>
    setItems((rows) =>
      map((r: Suggestion) => (r.id === id ? { ...r, bucket } : r), rows),
    );
  const discardCount = () =>
    filter((r: Suggestion) => r.bucket === "discard", items()).length;
  const emptyDiscards = () =>
    setItems((rows) => filter((r: Suggestion) => r.bucket !== "discard", rows));

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "12px", height: "560px" }}>
      <div style={{ height: "480px" }}>
        <BucketQueue<Suggestion>
          buckets={BUCKETS}
          items={items()}
          bucketOf={(s) => s.bucket}
          keyOf={(s) => s.id}
          renderItem={(s) => <span>{s.label}</span>}
          selectedKey={selected()}
          onSelect={(key) => setSelected(key ?? undefined)}
        />
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" disabled={!selected()} onClick={() => moveTo("kept")(selected()!)}>
          Accept selected
        </button>
        <button type="button" disabled={!selected()} onClick={() => moveTo("discard")(selected()!)}>
          Discard selected
        </button>
        <button type="button" disabled={discardCount() === 0} onClick={emptyDiscards}>
          Empty {discardCount()} discards
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Register the showcase**

In `dev/showcases/bucket-queue/index.tsx`, import `DiscardStagingShowcase` and add it to the exported list, following exactly the pattern the existing `triage` / `fill` / `pipeline` entries use in that file.

- [ ] **Step 6: Verify the showcase runs**

Run: `npm run dev` and open the BucketQueue → discard showcase on port 6006. Check by hand:
1. The Discard bucket starts as a one-line summary with a chevron.
2. "Discard selected" closes the gap in Suggestions smoothly and pulses the Discard count.
3. Clicking the Discard header opens it; the chevron rotates.
4. "Empty N discards" empties it, and the next discard leaves it **open**.

Stop the dev server when done.

- [ ] **Step 7: Run everything**

Run: `npm run typecheck && npm run lint && npx vitest run && npm run build && npm run health`
Expected: all green. If `health` reports any metric moved **in either direction**, run `npm run health -- --update-baseline` and include the baseline in the commit — the ratchet fails a PR that improves a metric without tightening the ceiling.

- [ ] **Step 8: Commit**

```bash
git add src/components/BucketQueue/README.md COMPONENTS.md dev/showcases/bucket-queue/discard.tsx dev/showcases/bucket-queue/index.tsx
# plus scripts/health-baseline.json if health moved a metric
git commit -m "docs(BucketQueue): collapsible buckets + discard-staging showcase

Documents the two new Bucket fields and the rules that are not obvious from
the types: the flag applies only while populated, collapsedByDefault needs
collapsible, the toggle is sticky across a drain-and-refill, and a collapsed
bucket sizes exactly like an empty one."
```

---

### Task 7: Release

**Files:** `package.json`, `CHANGELOG.md`

- [ ] **Step 1: Bump the minor version**

This is an additive feature: `0.127.0` → `0.128.0` in `package.json`.

- [ ] **Step 2: Write the CHANGELOG entry**

Add a `0.128.0` section to `CHANGELOG.md` matching the format of the entries above it. Cover: the two new `Bucket` fields; the sticky, component-owned toggle; that a collapsed bucket sizes like an empty one; and — separately, because it is a fix a consumer might hit without using the feature — that a transfer whose destination row cannot render no longer suppresses the source bucket's FLIP.

- [ ] **Step 3: Commit, tag, and push**

```bash
git add package.json CHANGELOG.md
git commit -m "chore(release): 0.128.0 — BucketQueue collapsible buckets"
git tag v0.128.0
git push && git push --tags
```

- [ ] **Step 4: Tell the user the consumer still needs a pin bump**

`thorcasting-ui` pins SUI by GitHub tag, so merging to `main` does **not** deliver this. Report the tag and that the consumer's `package.json` pin needs bumping to `v0.128.0` — that is a separate change in a separate repo, outside this plan.

---

## Self-Review

**Spec coverage.** Every section maps to a task: the two fields → Task 1; uncontrolled+sticky → Tasks 1 and 4; the chevron affordance and click target → Task 3; the sizing rule and `capRows`/`fill` composition → Task 2; the `allKeys` tab-order fix → Task 4; the selection rule → Task 4; the motion behaviour and the `MotionContext` extension → Task 5; the button UA reset → Task 3; the `BucketHeader` extraction for the 500-line limit → Task 3; docs/showcase/ratchet → Task 6; version, tag, and consumer pin → Task 7. The spec's note that `aria-controls` intentionally dangles is carried as a comment in Task 3's code.

**Placeholder scan.** One deliberate ellipsis, in Task 4 Step 11, marking the existing row `<For>` block that moves verbatim rather than being retyped; the step says so explicitly. Two steps reference "the pattern the existing entries use" (Task 6 Steps 3 and 5) because those files' formats are local conventions best read in place rather than guessed here.

**Type consistency.** `CollapseOverrides` is `ReadonlyMap<string, boolean>` in Tasks 1 and 4. `toggleCollapse(overrides, bucketKey, currentlyCollapsed)` takes a **key string**, not a bucket — matching Task 4 Step 11's call. `collapsedFlags` takes `{ buckets, counts, overrides }` in both. `BucketHeaderProps.toggleable` is the name in Task 3's interface and Task 4's call site. `MotionContext.bucketEl` returns `HTMLElement | undefined` in Task 5's interface, its test double, and the component's `ctx`. `layout.ts`'s new field is `collapsed?: boolean[]` on both inputs.
