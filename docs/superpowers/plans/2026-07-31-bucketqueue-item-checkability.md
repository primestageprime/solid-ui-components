# BucketQueue Per-Item Checkability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a `BucketQueue` consumer refuse specific items from being checked in select mode, so an invalid multi-select becomes unselectable up front rather than silently failing on commit.

**Architecture:** Two new optional, fail-open props on `BucketQueueProps<T>` — a per-item predicate `isCheckable` and a per-item tooltip string `uncheckableReason`. The predicate is consulted only inside the existing bucket-level `checkableIn` gate, so it can never disable a row outside select mode. A refused row becomes inert at the single shared `activate` branch (so pointer and keyboard are guarded by one rule), and renders dimmed in place while **staying** in the roving-tabindex sequence with `aria-disabled="true"`.

**Tech Stack:** SolidJS, TypeScript, Vitest + `@solidjs/testing-library` + jsdom, plain CSS with `--sui-*` theme tokens.

**Spec:** `docs/superpowers/specs/2026-07-31-bucketqueue-item-checkability-design.md`

## Global Constraints

- **Fail open.** Omitting `isCheckable` (or returning `true`) must leave the component byte-identical to today. A missing predicate never blocks anything.
- **Scope guard.** `isCheckable` is consulted **only** when `checkableIn(bucket)` is already true — i.e. select mode is on **and** the bucket declares `selectable: true`. Never outside that.
- **No fall-through.** A refused row fires **neither** `onToggleCheck` nor `onSelect`. It is inert.
- **`keyboard.ts` must not be modified.** Both activation paths already funnel through `activate`; the guard belongs there. `allKeys()` stays bucket-level — anything that removes rows from it strands the single tab stop on a row that renders nowhere and drops the whole queue out of the tab order (`docs/handoffs/open-work.md:97-101`, pinned by a test in `BucketQueue.keyboard.test.tsx`).
- **No `.map()`/`.filter()`/`.reduce()`/`.find()` on collections in `src/`.** `collectionMethodCalls` and `dotChains` are ratcheted metrics. Use the combinators in `src/fn` (`find`, `map`, `filter`, `pipe`), imported from `"../../fn"`. This does **not** apply to `dev/` — `scripts/health.mjs` only walks `src/`.
- **No hardcoded colors in `BucketQueue.css`.** `styling.test.ts` asserts `css` matches no `#rrggbb`. Use `--sui-*` tokens or unitless values (`opacity`).
- **No inline `style={{}}` in `dev/showcases/`.** `showcaseStyleRubricViolations` is ratcheted at 0. Demo geometry goes in `dev/main.css` as a `.<component>-demo` class.
- **Stage only files you touched.** Shared checkout — never `git add -A`.
- **Commit `scripts/health-history.json` and the baseline** alongside health-affecting work.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/components/BucketQueue/types.ts` | Declare the two new props with their doc comments | 1 |
| `src/components/BucketQueue/BucketQueue.tsx` | `blockedIn` helper; `activate` guard; `rowForKey`; per-row `focusable`/`activatable` split; a11y attributes | 1, 2 |
| `src/components/BucketQueue/BucketQueue.css` | `--uncheckable` row and `--disabled` checkbox rules | 2 |
| `src/components/BucketQueue/testHelpers.tsx` | `renderVeto` fixture — two rows in one selectable bucket | 1 |
| `src/components/BucketQueue/BucketQueue.selection.test.tsx` | Activation behavior of a refused row | 1 |
| `src/components/BucketQueue/BucketQueue.rendering.test.tsx` | Classes and a11y attributes of a refused row | 2 |
| `src/components/BucketQueue/BucketQueue.keyboard.test.tsx` | A refused row stays focusable and arrow-reachable | 2 |
| `src/components/BucketQueue/styling.test.ts` | CSS contract for the new rules | 2 |
| `src/components/BucketQueue/README.md` | Usage guide section | 3 |
| `COMPONENTS.md` | Catalogue entry; prop count 14 → 16 | 3 |
| `CHANGELOG.md` | Release note | 3 |
| `dev/showcases/bucket-queue/triage.tsx` | `side` field + the demo predicate | 3 |
| `dev/showcases/bucket-queue/index.tsx` | Prose explaining the veto | 3 |

`keyboard.ts`, `selection.ts`, `layout.ts`, `motion.ts`, `collapse.ts`, `bucketing.ts` and `measurement.ts` are **not** touched.

---

### Task 1: Props and the activation guard

Behavior only — a refused row stops toggling, but still looks normal. Task 2 adds the visual treatment.

**Files:**
- Modify: `src/components/BucketQueue/types.ts:110` (after `onToggleCheck`)
- Modify: `src/components/BucketQueue/BucketQueue.tsx:160-208`
- Modify: `src/components/BucketQueue/BucketQueue.tsx:400-408` (the row's `onClick`)
- Modify: `src/components/BucketQueue/testHelpers.tsx` (append)
- Test: `src/components/BucketQueue/BucketQueue.selection.test.tsx`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `BucketQueueProps<T>.isCheckable?: (item: T) => boolean`
  - `BucketQueueProps<T>.uncheckableReason?: (item: T) => string | undefined` (declared here, consumed in Task 2)
  - `blockedIn(item: T, bucket: Bucket) => boolean` — module-local to `BucketQueue.tsx`, used by Task 2's rendering
  - `activate(key: string, item: T, bucket: Bucket, modifiers: { shift: boolean; meta: boolean }) => void` — note the **new second parameter**
  - `rowForKey(key: string) => { item: T; bucket: Bucket } | undefined` — replaces `bucketForKey`
  - `renderVeto(extra: Record<string, unknown>)` in `testHelpers.tsx`

---

- [ ] **Step 1: Add the two props to `types.ts`**

Insert immediately after the `onToggleCheck` declaration (currently `types.ts:110`), before the `scrollToKey` block:

```ts
  /** Per-item veto on checking, consulted ONLY for rows in a `selectable`
   *  bucket while select mode is on. Return false and the row renders inert
   *  and dimmed: no check toggle, and NO fall-through to selection — a refused
   *  row does nothing at all, because falling through would swap the consumer's
   *  detail pane in response to a click the user meant as a check.
   *
   *  Omit — or return true — and every row in a selectable bucket is checkable,
   *  exactly as before. The predicate is fail-OPEN by design: a positive
   *  "these are checkable" set would have to be exhaustive, and any item the
   *  consumer forgot would silently become unselectable.
   *
   *  Typically derived from `checkedKeys`: close over the checked set and
   *  refuse items incompatible with what is already checked. With NOTHING
   *  checked the predicate should return true for everything, which is what
   *  makes unchecking back to zero restore full checkability with no special
   *  case in this component. */
  isCheckable?: (item: T) => boolean;
  /** Hover / assistive-tech explanation for a row `isCheckable` refused — e.g.
   *  "different side than your current selection". Rendered as the ROW's
   *  `title`, which is why this is a prop rather than the consumer's job:
   *  `renderItem`'s output only occupies the content span and does not cover
   *  the check affordance, so a consumer-side tooltip goes silent on exactly
   *  the hover that matters. Consulted only for refused rows. */
  uncheckableReason?: (item: T) => string | undefined;
```

- [ ] **Step 2: Add the `renderVeto` fixture**

Append to `src/components/BucketQueue/testHelpers.tsx`. It reuses the existing `SELECTABLE` buckets (`a` plain, `b` selectable) but puts **two** rows in the selectable bucket, so a per-item veto can refuse one while leaving its neighbour checkable:

```tsx
// Two rows in the SELECTABLE bucket, so a per-item veto can refuse one while
// its neighbour stays checkable — the exact shape `isCheckable` exists for.
// `plain` lives in the NON-selectable bucket and must be untouched by the veto.
export const renderVeto = (extra: Record<string, unknown>) =>
  render(() => (
    <BucketQueue<Item>
      buckets={SELECTABLE}
      items={[
        { id: "plain", bucket: "a" },
        { id: "ok", bucket: "b" },
        { id: "veto", bucket: "b" },
      ]}
      bucketOf={(i) => i.bucket}
      keyOf={(i) => i.id}
      renderItem={(i) => <span>{i.id}</span>}
      height={600}
      {...extra}
    />
  ));

/** Refuses exactly the item keyed "veto"; everything else stays checkable. */
export const vetoOne = (i: Item) => i.id !== "veto";
```

- [ ] **Step 3: Write the failing tests**

Append this `describe` block to `src/components/BucketQueue/BucketQueue.selection.test.tsx`. It needs these imports added to the file's existing ones:

```tsx
import { createSignal } from "solid-js";
import { render } from "@solidjs/testing-library";          // alongside cleanup, fireEvent
import { BucketQueue } from "./BucketQueue";                // alongside `type Bucket`
import { renderVeto, vetoOne, SELECTABLE, type Item } from "./testHelpers";
```

`Item` is already exported from `testHelpers.tsx`; `SELECTABLE` too.

```tsx
describe("BucketQueue — per-item checkability", () => {
  const selectModeProps = (extra: Record<string, unknown> = {}) => ({
    checkedKeys: new Set<string>(),
    ...extra,
  });

  it("fires NOTHING when a refused row is clicked — no toggle, no fall-through", () => {
    let selected: string | undefined;
    let toggled: string | undefined;
    const { container } = renderVeto(
      selectModeProps({
        onSelect: (k: string) => (selected = k),
        onToggleCheck: (k: string) => (toggled = k),
        isCheckable: vetoOne,
      }),
    );
    fireEvent.click(rowFor(container, "veto"));
    expect(toggled).toBeUndefined();
    // The important half: falling through to onSelect would swap the
    // consumer's detail pane on a click the user meant as a check.
    expect(selected).toBeUndefined();
  });

  it("fires nothing on Enter or Space either — one guard covers both paths", () => {
    const calls: string[] = [];
    const { container } = renderVeto(
      selectModeProps({
        onSelect: (k: string) => calls.push(`select:${k}`),
        onToggleCheck: (k: string) => calls.push(`toggle:${k}`),
        isCheckable: vetoOne,
      }),
    );
    fireEvent.keyDown(rowFor(container, "veto"), { key: "Enter" });
    fireEvent.keyDown(rowFor(container, "veto"), { key: " " });
    expect(calls).toEqual([]);
  });

  it("leaves the refused row's NEIGHBOUR checkable", () => {
    let toggled: string | undefined;
    const { container } = renderVeto(
      selectModeProps({
        onSelect: () => {},
        onToggleCheck: (k: string) => (toggled = k),
        isCheckable: vetoOne,
      }),
    );
    fireEvent.click(rowFor(container, "ok"));
    expect(toggled).toBe("ok");
  });

  it("is NOT consulted for a non-selectable bucket's row", () => {
    let selected: string | undefined;
    const { container } = renderVeto(
      selectModeProps({
        onSelect: (k: string) => (selected = k),
        onToggleCheck: () => {},
        isCheckable: () => false, // refuses everything it is asked about
      }),
    );
    fireEvent.click(rowFor(container, "plain"));
    expect(selected).toBe("plain");
  });

  it("is NOT consulted outside select mode", () => {
    let selected: string | undefined;
    // No checkedKeys ⇒ select mode off ⇒ the veto must be inert.
    const { container } = renderVeto({
      onSelect: (k: string) => (selected = k),
      isCheckable: () => false,
    });
    fireEvent.click(rowFor(container, "veto"));
    expect(selected).toBe("veto");
  });

  it("checks every row when isCheckable is omitted (fail-open regression guard)", () => {
    const toggled: string[] = [];
    const { container } = renderVeto(
      selectModeProps({
        onSelect: () => {},
        onToggleCheck: (k: string) => toggled.push(k),
      }),
    );
    fireEvent.click(rowFor(container, "ok"));
    fireEvent.click(rowFor(container, "veto"));
    expect(toggled).toEqual(["ok", "veto"]);
  });

  // Rendered inline rather than through renderVeto: the reset is a TRANSITION,
  // and a plain props object is evaluated once, so the veto would never change.
  // The signal is what makes the predicate re-run when the checked set changes.
  it("restores checkability when the checked set drains back to empty (the RESET path)", () => {
    const toggled: string[] = [];
    const [checked, setChecked] = createSignal<ReadonlySet<string>>(new Set());
    const { container } = render(() => (
      <BucketQueue<Item>
        buckets={SELECTABLE}
        items={[
          { id: "ok", bucket: "b" },
          { id: "veto", bucket: "b" },
        ]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
        checkedKeys={checked()}
        onToggleCheck={(k: string) => toggled.push(k)}
        // Stands in for a consumer whose rule only bites once something is
        // checked. Nothing checked ⇒ no constraint at all.
        isCheckable={(i) => checked().size === 0 || i.id !== "veto"}
      />
    ));

    // Something checked ⇒ "veto" is refused.
    setChecked(new Set(["ok"]));
    fireEvent.click(rowFor(container, "veto"));
    expect(toggled).toEqual([]);

    // Drained back to empty ⇒ checkable again, with nothing in the component
    // special-casing the empty set.
    setChecked(new Set());
    fireEvent.click(rowFor(container, "veto"));
    expect(toggled).toEqual(["veto"]);
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

```bash
npx vitest run src/components/BucketQueue/BucketQueue.selection.test.tsx --testTimeout=10000
```

Expected: the new `describe` block fails. The first test fails with `toggled` equal to `"veto"` (the veto is not yet honoured); the existing tests in the file still pass.

- [ ] **Step 5: Add the `blockedIn` helper**

In `src/components/BucketQueue/BucketQueue.tsx`, immediately after `checkableIn` (currently lines 160-161):

```ts
  // A PER-ITEM veto on checking, consulted only where the bucket already allows
  // it. Nesting it inside `checkableIn` is what keeps this from becoming a
  // general row-disable: it can never make a row that would have SELECTED
  // inert, and it is never consulted outside select mode. An absent predicate
  // blocks nothing — the prop is deliberately fail-OPEN (see types.ts).
  const blockedIn = (item: T, bucket: Bucket) =>
    checkableIn(bucket) && props.isCheckable?.(item) === false;
```

- [ ] **Step 6: Guard `activate` and widen it to take the item**

Replace `activate` (currently lines 165-172) with:

```ts
  // The single activation branch — shared by click (the row below) and
  // Enter/Space (the keyboard module). A row either toggles its check,
  // selects, or — when the consumer's per-item veto refused it — does NOTHING.
  // Both paths funnel through here, which is why the veto needs no change in
  // ./keyboard at all.
  const activate = (
    key: string,
    item: T,
    bucket: Bucket,
    modifiers: { shift: boolean; meta: boolean },
  ) => {
    if (checkableIn(bucket)) {
      // Deliberately no fall-through to onSelect for a refused row: that would
      // swap the consumer's detail pane in response to a click the user meant
      // as a check. In select mode a selectable bucket's rows toggle or do
      // nothing — never a third, unrequested action.
      if (!blockedIn(item, bucket)) props.onToggleCheck?.(key, modifiers);
    } else props.onSelect?.(key);
  };
```

- [ ] **Step 7: Replace `bucketForKey` with `rowForKey`**

`activate` now needs the item, and the keyboard path has only the key. Replace `bucketForKey` (currently lines 176-179) with:

```ts
  // The item AND bucket a row belongs to, for the activation branch — the
  // keyboard has only the key in hand, where a click has both in scope.
  const rowForKey = (key: string): { item: T; bucket: Bucket } | undefined => {
    const bucketKey = buckets().bucketByKey.get(key);
    if (bucketKey == null) return undefined;
    const bucket = find((s) => s.key === bucketKey, props.buckets);
    if (bucket === undefined) return undefined;
    const item = find((it) => props.keyOf(it) === key, itemsIn(bucketKey));
    return item === undefined ? undefined : { item, bucket };
  };
```

`find` is already imported from `"../../fn"` at the top of the file — do not add a `.find()` call, which the `collectionMethodCalls` ratchet counts.

- [ ] **Step 8: Update the keyboard's `onActivate` call site**

In the `createRowKeyboard` config (currently lines 203-206), replace the `onActivate` entry:

```ts
    onActivate: (key) => {
      const row = rowForKey(key);
      if (row) activate(key, row.item, row.bucket, { shift: false, meta: false });
    },
```

- [ ] **Step 9: Update the click call site**

In the row's `onClick` (currently lines 400-408), pass the item:

```tsx
                          onClick={
                            interactive()
                              ? (e: MouseEvent) =>
                                  activate(key, it, bucket, {
                                    shift: e.shiftKey,
                                    meta: e.metaKey || e.ctrlKey,
                                  })
                              : undefined
                          }
```

- [ ] **Step 10: Run the tests to verify they pass**

```bash
npx vitest run src/components/BucketQueue/ --testTimeout=10000
```

Expected: PASS — the new block plus every pre-existing BucketQueue test.

- [ ] **Step 11: Typecheck**

```bash
npm run typecheck
```

Expected: clean. If `find`'s callback parameter fails to infer, name the intermediate array as its own `const` first — TS cannot contextually type an `fn` callback when the array argument is a nested call expression (`docs/handoffs/open-work.md`).

- [ ] **Step 12: Commit**

```bash
git add src/components/BucketQueue/types.ts \
        src/components/BucketQueue/BucketQueue.tsx \
        src/components/BucketQueue/testHelpers.tsx \
        src/components/BucketQueue/BucketQueue.selection.test.tsx
git commit -m "feat(BucketQueue): per-item checkability veto in select mode

isCheckable/uncheckableReason declared; a refused row is inert at the shared
activate branch — no toggle and deliberately no fall-through to onSelect.
Nested inside checkableIn so it can never disable a selecting row. Fail-open:
omitting the predicate leaves behavior unchanged."
```

---

### Task 2: Rendering, CSS and accessibility

**Files:**
- Modify: `src/components/BucketQueue/BucketQueue.tsx:371-426` (the row-rendering block)
- Modify: `src/components/BucketQueue/BucketQueue.css` (append near the select-mode section)
- Test: `src/components/BucketQueue/BucketQueue.rendering.test.tsx`
- Test: `src/components/BucketQueue/BucketQueue.keyboard.test.tsx`
- Test: `src/components/BucketQueue/styling.test.ts`

**Interfaces:**
- Consumes: `blockedIn(item, bucket)`, `props.uncheckableReason`, `renderVeto`, `vetoOne` from Task 1.
- Produces: CSS classes `bucket-queue__row--uncheckable` and `bucket-queue__checkbox--disabled`; the `aria-disabled` / `title` attributes on a refused row.

---

- [ ] **Step 1: Write the failing rendering tests**

Append to `src/components/BucketQueue/BucketQueue.rendering.test.tsx`, adding `renderVeto` and `vetoOne` to its import from `"./testHelpers"` (and `rowFor` if not already imported):

```tsx
describe("BucketQueue — refused row rendering", () => {
  const veto = () =>
    renderVeto({
      checkedKeys: new Set<string>(),
      onSelect: () => {},
      onToggleCheck: () => {},
      isCheckable: vetoOne,
      uncheckableReason: () => "different side than your current selection",
    });

  it("dims the refused row IN PLACE and drops its clickable affordance", () => {
    const { container } = veto();
    const row = rowFor(container, "veto");
    expect(row.classList.contains("bucket-queue__row--uncheckable")).toBe(true);
    // Dropping --interactive is what removes cursor:pointer and the hover fill.
    expect(row.classList.contains("bucket-queue__row--interactive")).toBe(false);
  });

  it("leaves the refused row IN the bucket — dimming, not filtering", () => {
    const { container } = veto();
    // The header count and the row itself both stay, which is half of why
    // dimming beat filtering: the count must not lie about the bucket.
    expect(rowFor(container, "veto")).toBeTruthy();
    expect(container.querySelectorAll('[data-bq-bucket="b"] [data-bq-key]')).toHaveLength(2);
  });

  it("marks the refused row aria-disabled and titles it with the reason", () => {
    const { container } = veto();
    const row = rowFor(container, "veto");
    expect(row.getAttribute("aria-disabled")).toBe("true");
    expect(row.getAttribute("title")).toBe("different side than your current selection");
  });

  it("dashes the refused row's checkbox", () => {
    const { container } = veto();
    const box = rowFor(container, "veto").querySelector(".bucket-queue__checkbox");
    expect(box?.classList.contains("bucket-queue__checkbox--disabled")).toBe(true);
  });

  it("leaves the neighbour untouched", () => {
    const { container } = veto();
    const row = rowFor(container, "ok");
    expect(row.classList.contains("bucket-queue__row--uncheckable")).toBe(false);
    expect(row.classList.contains("bucket-queue__row--interactive")).toBe(true);
    expect(row.getAttribute("aria-disabled")).toBeNull();
    expect(row.getAttribute("title")).toBeNull();
    expect(
      row.querySelector(".bucket-queue__checkbox")?.classList.contains(
        "bucket-queue__checkbox--disabled",
      ),
    ).toBe(false);
  });

  it("sets no title when uncheckableReason is omitted", () => {
    const { container } = renderVeto({
      checkedKeys: new Set<string>(),
      onSelect: () => {},
      onToggleCheck: () => {},
      isCheckable: vetoOne,
    });
    expect(rowFor(container, "veto").getAttribute("title")).toBeNull();
  });
});
```

- [ ] **Step 2: Write the failing keyboard tests**

Append to `src/components/BucketQueue/BucketQueue.keyboard.test.tsx`, adding `renderVeto` and `vetoOne` to its import from `"./testHelpers"`:

```tsx
describe("BucketQueue — a refused row stays keyboard-reachable", () => {
  const veto = (extra: Record<string, unknown> = {}) =>
    renderVeto({
      checkedKeys: new Set<string>(),
      onSelect: () => {},
      onToggleCheck: () => {},
      isCheckable: vetoOne,
      ...extra,
    });

  // Dropping refused rows from the roving sequence is the KEYBOARD equivalent
  // of filtering them out of the list — they would vanish from under the arrow
  // keys the instant the first item is checked. ARIA's guidance for a disabled
  // option in a listbox is keep-focusable + aria-disabled, not remove.
  it("keeps the refused row as an arrow-key target", () => {
    const moved: (string | null)[] = [];
    const { container } = veto({ onFocusChange: (k: string | null) => moved.push(k) });
    fireEvent.keyDown(rowFor(container, "ok"), { key: "ArrowDown" });
    expect(moved).toEqual(["veto"]);
  });

  it("keeps exactly one tab stop in the queue", () => {
    const { container } = veto();
    const tabbable = rows(container).filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
  });

  it("still gives the refused row a tabindex rather than removing it", () => {
    const { container } = veto();
    expect(rowFor(container, "veto").getAttribute("tabindex")).not.toBeNull();
    expect(rowFor(container, "veto").hasAttribute("data-bq-interactive")).toBe(true);
  });
});
```

- [ ] **Step 3: Write the failing styling tests**

Append inside the existing `describe("BucketQueue styling contract", …)` block in `src/components/BucketQueue/styling.test.ts`:

```ts
  it("dims a refused row without tinting it — opacity and cursor only", () => {
    // Same reasoning as the selected and checked rows: no background fill
    // behind row text. Hover owns the background, and a refused row has no
    // hover fill at all because it never gets --interactive.
    expect(declaredProperties(ruleBody(".bucket-queue__row--uncheckable"))).toEqual([
      "cursor",
      "opacity",
    ]);
  });

  it("dashes the refused checkbox, so the refusal survives a flattened opacity", () => {
    expect(ruleBody(".bucket-queue__checkbox--disabled")).toMatch(
      /border-style\s*:\s*dashed/,
    );
  });
```

- [ ] **Step 4: Run the tests to verify they fail**

```bash
npx vitest run src/components/BucketQueue/ --testTimeout=10000
```

Expected: the three new blocks fail — rendering with the classes absent, styling with `rule not found: .bucket-queue__row--uncheckable`. The keyboard block may already pass (nothing removes those rows yet); that is fine, it is a regression guard for the change in Step 5.

- [ ] **Step 5: Split `interactive` into `focusable` and `activatable`**

In `src/components/BucketQueue/BucketQueue.tsx`, inside the row `<For>` callback, replace the `const interactive = () => interactiveIn(bucket);` line (currently line 377) with:

```tsx
                      // FOCUSABLE vs ACTIVATABLE. These are the same thing for
                      // every row except one the consumer's veto refused: it
                      // keeps its place in the roving sequence (so a keyboard
                      // user can reach it and hear WHY it is excluded) while
                      // losing the click handler and the clickable styling.
                      // They were one flag until now only because nothing had
                      // ever needed to tell them apart.
                      const blocked = () => blockedIn(it, bucket);
                      const focusable = () => interactiveIn(bucket);
                      const activatable = () => focusable() && !blocked();
```

- [ ] **Step 6: Rewire the row element**

Replace the row `<div>`'s attribute block (currently lines 382-415) with:

```tsx
                        <div
                          ref={(el) => { if (ri() === 0) { myRow = el; trackRow(bucket.key, el); } }}
                          data-bq-key={key}
                          data-bq-interactive={focusable() ? "" : undefined}
                          class={
                            "bucket-queue__row" +
                            (activatable() ? " bucket-queue__row--interactive" : "") +
                            (selected() ? " bucket-queue__row--selected" : "")
                          }
                          role="option"
                          aria-selected={selected()}
                          aria-disabled={blocked() ? true : undefined}
                          title={blocked() ? props.uncheckableReason?.(it) : undefined}
                          tabindex={
                            focusable() && keyboard.tabbableKey() === key ? 0 : -1
                          }
                          classList={{
                            "bucket-queue__row--checked": checkableIn(bucket) && checked(),
                            "bucket-queue__row--focused": props.focusedKey === key,
                            "bucket-queue__row--uncheckable": blocked(),
                          }}
                          onClick={
                            activatable()
                              ? (e: MouseEvent) =>
                                  activate(key, it, bucket, {
                                    shift: e.shiftKey,
                                    meta: e.metaKey || e.ctrlKey,
                                  })
                              : undefined
                          }
                          onKeyDown={
                            focusable()
                              ? (e: KeyboardEvent) => keyboard.onRowKeyDown(e, key)
                              : undefined
                          }
                          onFocus={focusable() ? () => keyboard.setActiveKey(key) : undefined}
                        >
```

Note `onKeyDown` and `onFocus` use `focusable()`, not `activatable()` — a refused row must still handle arrow keys. Enter/Space reaching `activate` is already a no-op from Task 1.

- [ ] **Step 7: Mark the checkbox**

In the same block, extend the checkbox's `classList` (currently lines 419-421):

```tsx
                              classList={{
                                "bucket-queue__checkbox--checked": checked(),
                                "bucket-queue__checkbox--disabled": blocked(),
                              }}
```

- [ ] **Step 8: Add the CSS**

Append to `src/components/BucketQueue/BucketQueue.css`, after the `.bucket-queue__checkbox--checked` rule:

```css
/* REFUSED — a row the consumer's `isCheckable` turned down. Dimmed IN PLACE
   rather than filtered out: filtering pulls rows out from under the pointer the
   moment the first item is checked, and makes the header count disagree with
   what the bucket holds. It also destroys the context that explains why the
   current selection constrains further picks.

   Only opacity and cursor here — deliberately no background tint, the same
   readability rule as `--selected` and `--checked` above. There is nothing to
   suppress a hover fill with, because a refused row never receives
   `--interactive` in the first place; that omission is what removes both the
   fill and the pointer cursor. The row KEEPS its tab stop and stays an
   arrow-key target (aria-disabled, not removed) — see ./keyboard. */
.bucket-queue__row--uncheckable {
  opacity: 0.38;
  cursor: default;
}
/* Dashed rather than a colour change, so the refusal still reads where opacity
   is flattened — forced-colors / high-contrast modes drop it entirely. */
.bucket-queue__checkbox--disabled {
  border-style: dashed;
}
```

- [ ] **Step 9: Run the tests to verify they pass**

```bash
npx vitest run src/components/BucketQueue/ --testTimeout=10000
```

Expected: PASS, all files.

- [ ] **Step 10: Full suite, typecheck and lint**

```bash
npm run typecheck && npx vitest run --testTimeout=15000 && npm run lint
```

Expected: typecheck and tests clean. `lint` does not gate merges, but do not add new violations. If Biome flags the row's `aria-disabled` on a `div` with `role="option"`, that is valid ARIA — add a targeted `biome-ignore` with a reason, matching the existing `useFocusableInteractive` ignore on the same element.

- [ ] **Step 11: Commit**

```bash
git add src/components/BucketQueue/BucketQueue.tsx \
        src/components/BucketQueue/BucketQueue.css \
        src/components/BucketQueue/BucketQueue.rendering.test.tsx \
        src/components/BucketQueue/BucketQueue.keyboard.test.tsx \
        src/components/BucketQueue/styling.test.ts
git commit -m "feat(BucketQueue): dim a refused row in place, keep it reachable

Splits the row's single interactive flag into focusable vs activatable: a
refused row loses its click handler and --interactive styling but keeps its
tab stop, arrow-key targeting and data-bq-interactive, gaining aria-disabled
and an optional title. Dimming rather than filtering keeps the header count
honest and stops rows vanishing from under the pointer mid-selection."
```

---

### Task 3: Documentation, showcase and the health baseline

**Files:**
- Modify: `src/components/BucketQueue/README.md`
- Modify: `COMPONENTS.md:976`
- Modify: `CHANGELOG.md`
- Modify: `dev/showcases/bucket-queue/triage.tsx`
- Modify: `dev/showcases/bucket-queue/index.tsx`
- Modify: `scripts/health-baseline.json`, `scripts/health-history.json`

**Interfaces:**
- Consumes: `isCheckable` / `uncheckableReason` from Tasks 1-2.
- Produces: nothing consumed by later tasks.

---

- [ ] **Step 1: Add a `side` field to the showcase's item type and seed**

In `dev/showcases/bucket-queue/triage.tsx`, add to the `QueueItem` interface (currently around line 25):

```tsx
  /** Money in or money out. The demo's grouping rule: a batch must be all one
   *  side — the same single rule thorcasting's server enforces on a group. */
  side: "in" | "out";
```

Then replace the `SEED` array (currently lines 70-83) with:

```tsx
const SEED: QueueItem[] = [
  { id: "t1", label: "AWS — invoice 8841", amount: "$1,204.00", meta: "Infrastructure · Apr 02", bucket: "done", side: "out" },
  { id: "t2", label: "Figma annual", amount: "$540.00", meta: "Software · Apr 02", bucket: "done", side: "out" },
  { id: "t3", label: "Stripe payout", amount: "$4,210.00", meta: "Uncategorized · Apr 03", bucket: "todo", side: "in" },
  { id: "t4", label: "Rent — April", amount: "$3,500.00", meta: "Uncategorized · Apr 01", bucket: "todo", side: "out" },
  { id: "t5", label: "Payroll — ACH", amount: "$22,910.12", meta: "Uncategorized · Apr 05", bucket: "todo", side: "out" },
  { id: "t6", label: "Consulting invoice — Acme", amount: "$1,800.00", meta: "Uncategorized · Apr 06", bucket: "todo", side: "in" },
  { id: "t7", label: "Notion team", amount: "$120.00", meta: "Awaiting receipt · Apr 07", bucket: "hold", side: "out" },
  { id: "t8", label: "Legal retainer", amount: "$4,000.00", meta: "Awaiting receipt · Apr 08", bucket: "hold", side: "out" },
  { id: "t9", label: "Zoom annual", amount: "$199.00", meta: "Awaiting receipt · Apr 09", bucket: "hold", side: "out" },
  { id: "t10", label: "1Password teams", amount: "$95.88", meta: "Awaiting receipt · Apr 10", bucket: "hold", side: "out" },
  { id: "t11", label: "Datadog", amount: "$620.00", meta: "Awaiting receipt · Apr 11", bucket: "hold", side: "out" },
  { id: "t12", label: "Linear seats", amount: "$96.00", meta: "Awaiting receipt · Apr 12", bucket: "hold", side: "out" },
];
```

`t3` and `t6` are the two inflows; `t3` is also the initially-selected row, which is deliberate — the veto is visible without touching anything but the select-mode switch.

- [ ] **Step 2: Add the demo predicate**

In `BucketQueueDemo`, after the `checked` signal (currently line 136):

```tsx
  // The side the assembled batch has committed to — the FIRST checked row sets
  // it. Nothing checked ⇒ undefined ⇒ no constraint, which is exactly why
  // unchecking back to zero restores full checkability with no reset logic
  // anywhere: the predicate simply stops refusing.
  const batchSide = () => items().find((i) => checked().has(i.id))?.side;
```

- [ ] **Step 3: Pass the two props**

In the same file, on the `<BucketQueue>` element, immediately after `onToggleCheck` (currently line 310):

```tsx
          isCheckable={(i) => batchSide() === undefined || i.side === batchSide()}
          uncheckableReason={(i) =>
            i.side === "in"
              ? "money in — this batch is money out"
              : "money out — this batch is money in"
          }
```

- [ ] **Step 4: Document the veto in the showcase prose**

In `dev/showcases/bucket-queue/index.tsx`, insert a new `<p class="text-meta">` after the existing "Multi-select across queues" paragraph:

```tsx
      <p class="text-meta">
        <strong>Refusing incompatible rows:</strong> the demo's grouping rule is
        that a batch must be all <em>money in</em> or all <em>money out</em>.
        Check <strong>Stripe payout</strong> and every outflow dims — it keeps
        its place and its keyboard tab stop, but its checkbox goes dashed and
        clicking it does nothing at all (it does <em>not</em> fall through to
        selecting). Uncheck everything and they all come back. That is{" "}
        <code>isCheckable</code>, a per-item predicate the consumer derives from
        its own checked set; <code>uncheckableReason</code> supplies the hover
        text. The component knows nothing about money — it only asks. Rows are
        dimmed rather than <em>filtered out</em> on purpose: filtering would
        pull them out from under the pointer mid-selection and leave the header
        count disagreeing with the bucket.
      </p>
```

- [ ] **Step 5: Verify the showcase in the browser**

```bash
npm run dev
```

Open the gallery on port 6006, go to BucketQueue, switch the first demo into select mode, and check **Stripe payout**. Confirm: the outflow rows dim, their checkboxes go dashed, clicking one does nothing, hovering one shows the reason, the header counts are unchanged, and arrowing down still lands on a dimmed row. Then uncheck and confirm everything returns. Stop the dev server when done.

- [ ] **Step 6: Update `COMPONENTS.md`**

In the `BucketQueue` bullet (line 976), after the sentence ending `…never both.`, insert:

```
**A consumer can veto individual rows:** `isCheckable?: (item: T) => boolean` is consulted only for rows in a `selectable` bucket while select mode is on, and a row it refuses renders **dimmed in place** — no check toggle, and deliberately no fall-through to `onSelect`, so it is fully inert. It keeps its tab stop and stays an arrow-key target with `aria-disabled="true"`, because dropping refused rows from the roving sequence is the keyboard equivalent of hiding them. `uncheckableReason?: (item: T) => string | undefined` supplies the row's `title` for a refused row — a prop rather than the consumer's job because `renderItem`'s output does not cover the check affordance. Both are **fail-open**: omit them, or return `true`, and every row in a selectable bucket is checkable exactly as before. Typically derived from `checkedKeys`, which is what makes unchecking back to zero restore full checkability with no special case.
```

Then change `Key props (14 total)` to `Key props (16 total)` and add to the enumerated list, after `onToggleCheck?: …`:

```
`isCheckable?: (item: T) => boolean`, `uncheckableReason?: (item: T) => string | undefined`,
```

- [ ] **Step 7: Update the component README**

Add a section to `src/components/BucketQueue/README.md` under its select-mode coverage:

````markdown
### Refusing individual rows

`selectable` is bucket-level: every row in a selectable bucket is checkable. When
the validity of a check depends on what is *already* checked — grouping items
that must share an attribute, say — pass `isCheckable`:

```tsx
const batchSide = () => items().find((i) => checked().has(i.id))?.side;

<BucketQueue<Txn>
  checkedKeys={checked()}
  onToggleCheck={toggle}
  isCheckable={(i) => batchSide() === undefined || i.side === batchSide()}
  uncheckableReason={() => "different side than your current selection"}
/>
```

A refused row **dims in place** rather than disappearing, keeps its tab stop and
arrow-key targeting with `aria-disabled="true"`, and is completely inert on
click and Enter/Space — it does **not** fall through to `onSelect`.

Three things worth knowing:

- **It is fail-open.** Omitting the predicate, or returning `true`, is exactly
  today's behavior. This is why it is a predicate and not a `checkableKeys` set:
  a positive set would have to be exhaustive, and any item you forgot would go
  silently unselectable.
- **It is scoped to select mode.** The predicate is consulted only where
  `selectable` already applies, so it can never disable a row that would have
  selected.
- **Reset is free.** With nothing checked your rule has no constraint to apply
  and returns `true` throughout, so unchecking back to zero restores everything
  without any reset logic on either side.

`uncheckableReason` exists because `renderItem`'s output only fills the row's
content span — it cannot reach the checkbox, which is the one thing the user is
aiming at when the refusal happens.
````

- [ ] **Step 8: Add the CHANGELOG entry**

Add a new section at the top of `CHANGELOG.md`, matching the format of the existing `0.130.0` section:

```markdown
## 0.131.0

### BucketQueue — per-item checkability in select mode

`selectable` was bucket-level only, so a consumer could not refuse an item that
is incompatible with what is already checked; the invalid selection was made,
and the failure only showed up (silently) on commit. Two new fail-open props
close that:

- **`isCheckable?: (item: T) => boolean`** — consulted only for rows in a
  `selectable` bucket while select mode is on. A refused row is inert: no
  toggle, and deliberately no fall-through to `onSelect`.
- **`uncheckableReason?: (item: T) => string | undefined`** — the refused row's
  `title`. A prop rather than the consumer's job because `renderItem`'s output
  does not cover the check affordance.

A refused row **dims in place** and keeps its place in the roving-tabindex
sequence with `aria-disabled="true"` — filtering it out would pull rows from
under the pointer mid-selection, make the header count disagree with the bucket,
and (for keyboard users) delete rows from the arrow sequence.

Purely additive: omit both props and behavior is unchanged.
```

- [ ] **Step 9: Run health and update the baseline**

```bash
npm run health -- --verbose
```

Read the output. No metric should have risen. If any metric *improved*, the ceiling must be tightened in the same commit or CI fails:

```bash
npm run health -- --update-baseline
```

Do **not** pass `--update-baseline=<metric> --reason=…` — that raises a ceiling, and nothing here should need one. If a metric rose, fix the code rather than the baseline.

- [ ] **Step 10: Full verification**

```bash
npm run typecheck && npx vitest run --testTimeout=15000 && npm run build && npm run health
```

Expected: all four clean. `build` catches anything the source-only test run misses.

- [ ] **Step 11: Commit**

```bash
git add COMPONENTS.md CHANGELOG.md \
        src/components/BucketQueue/README.md \
        dev/showcases/bucket-queue/triage.tsx \
        dev/showcases/bucket-queue/index.tsx \
        scripts/health-baseline.json scripts/health-history.json
git commit -m "docs(BucketQueue): document and demo the per-item check veto

COMPONENTS.md prop count 14 -> 16, README usage section, CHANGELOG 0.131.0.
The triage showcase gains a money-in/money-out side on each item and the
all-one-side batch rule, so the dimmed state, its hover reason and the
free reset are all exercisable in the gallery."
```

---

## After the plan

Not tasks — decisions for the human:

- **Release.** The consumer follow-up needs a published tag. Version bump + tag + push triggers the GitHub Packages publish (see the `promote` skill for the release mechanics). Nothing in this plan bumps `package.json`.
- **`thorcasting-ui` wiring.** Once released and pinned: compute the predicate from `checkedKeys()` + each row's `side` and pass it at `src/components/screens/configure/queuePanel.tsx`'s `OTHER` bucket — the only `selectable: true` bucket. The existing group-parent veto in `configureConfigsPane.tsx:595-620` ("no nested groups") could fold into the same predicate, turning a post-hoc refusal into the same up-front dimming.
- **Delete the handoff.** `docs/superpowers/handoffs/2026-07-31-bucketqueue-item-checkability-handoff.md` is spent once this lands — its content now lives in the spec.
