# BucketQueue

A queue of items split across **N always-present buckets**, each with its own
label, role dot, and count. Items progress from bucket to bucket as their
underlying state changes — e.g. suggestions → categorized, or triage → done →
archived. Built for triage / review / categorization flows. Supersedes
`SplitQueueList` (see `docs/adr/0004-one-queue-component-and-the-motion-seam.md`).

## Mental model

- It's a **controlled, generic** component over your item type `T`.
- You hand it **one flat `items` array**, plus `bucketOf(item) => bucketKey` to
  say which bucket each item belongs in. There is no `resolved`/`unresolved`
  pair and no `resolve()` method.
- **A move is one atomic mutation.** Change an item so `bucketOf` returns a
  different bucket key (in the same `setItems` call that updates everything
  else about it) and the queue detects the change and plays the transfer
  animation. Because there's one array, there's no intermediate frame where an
  item belongs to two buckets or to neither.
- Direction and distance fall out of bucket order — a move from bucket 3 to
  bucket 1 works with no special-casing, exactly like bucket 1 to bucket 2.
- An item whose `bucketOf` result matches no bucket renders nowhere
  (documented, not an error).

## Quick start

```tsx
import { BucketQueue, type Bucket } from "solid-ui-components";
import "solid-ui-components/index.css";
import { createSignal } from "solid-js";

interface Txn { id: string; label: string; amount: string; bucket: string }

const BUCKETS: Bucket[] = [
  { key: "done", label: "Categorized", tone: "success" },
  { key: "todo", label: "Suggestions", tone: "accent", selectable: true,
    emptyLabel: "All clear — every transaction categorized" },
  { key: "hold", label: "In progress", tone: "muted" },
];

function Categorize(props: { initial: Txn[] }) {
  const [items, setItems] = createSignal<Txn[]>(props.initial);

  const categorize = (id: string) =>
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, bucket: "done" } : r)));

  return (
    <BucketQueue<Txn>
      buckets={BUCKETS}
      items={items()}
      bucketOf={(t) => t.bucket}
      keyOf={(t) => t.id}
      renderItem={(t) => (
        <span style={{ display: "flex", "justify-content": "space-between" }}>
          <span>{t.label}</span>
          <span>{t.amount}</span>
        </span>
      )}
    />
  );
}
```

## Props

| Prop | Type | Purpose |
|---|---|---|
| `buckets` | `Bucket[]` | Top → bottom. Every bucket renders always, with its count. |
| `items` | `T[]` | All items; each is bucketed into a bucket by `bucketOf`. |
| `bucketOf` | `(item: T) => string` | Item → the `key` of the bucket it belongs in. Changing the result is what plays the transfer animation. |
| `keyOf` | `(item: T) => string` | Stable identity (selection, list keys, transfer tracking). |
| `renderItem` | `(item: T) => JSX.Element` | Your row content — **bare**, unpadded; see [Row content](#row-content). |
| `selectedKey?` | `string` | Selected item (controlled) — its row gets the accent bar, no fill. |
| `onSelect?` | `(key: string \| null) => void` | Fires on click / Enter-Space outside select mode, **and when the triage advance moves the selection**. `null` means the queue being worked just drained — see [Working a queue](#working-a-queue). |
| `focusedKey?` | `string` | Roving keyboard focus (controlled). |
| `onFocusChange?` | `(key: string \| null) => void` | Fires when keyboard focus moves. |
| `checkedKeys?` | `ReadonlySet<string>` | **Presence turns select mode on.** An empty `Set` means "mode on, nothing checked." Scoped to `selectable` buckets. |
| `onToggleCheck?` | `(key, { shift, meta }) => void` | Fires when a checkable row is activated while select mode is on. |
| `isCheckable?` | `(item: T) => boolean` | Per-item veto, consulted only in a `selectable` bucket in select mode. A refused row dims in place and is inert — see [Refusing individual rows](#refusing-individual-rows). |
| `uncheckableReason?` | `(item: T) => string \| undefined` | `title` for a row `isCheckable` refused. Consulted only for refused rows. |
| `scrollToKey?` | `string` | Reacts on CHANGE: set (or bump) to request a scroll, then clear it. |
| `height?` | `number` | Total height in px. Omit to fill the parent. |
| `class?` | `string` | Extra class on the root. |

`Bucket`:

| Field | Type | Purpose |
|---|---|---|
| `key` | `string` | Stable key; `bucketOf` returns one of these. |
| `label` | `string` | Header label. |
| `tone` | `Tone` | Dot color beside the label — the ONLY role color; chrome stays neutral. |
| `weight?` | `number` | Relative height share when populated buckets overflow. Default 1. |
| `selectable?` | `boolean` | Rows in this bucket render the check affordance and toggle instead of select when `checkedKeys` is present. Default false. |
| `emptyLabel?` | `JSX.Element` | Copy for the collapsed strip when this bucket has no items. Omit for the bare summary line. |
| `capRows?` | `number` | Soft cap in rows — the bucket stops growing past this many rows and its body scrolls. Omit to shrink-wrap to content. |
| `fill?` | `boolean` | Absorb the leftover height instead of shrink-wrapping to content, so the queue reaches the bottom of its column at any list length. Overrides `capRows` for this bucket; only applies while the bucket is populated. Default false. |
| `collapsible?` | `boolean` | The user can collapse this bucket to its summary line and expand it again. Its header becomes a button and takes a chevron in place of its tone dot. Only applies while the bucket is populated. Default false. |
| `collapsedByDefault?` | `boolean` | Start collapsed. **Ignored without `collapsible`.** Only the state before the user first toggles the bucket. Default false. |

## Working a queue

The shape this component is built for is a **triage loop**: one bucket is the
queue you work, and each item leaves it for a terminal bucket. So when the item
you have *selected* moves out, the selection **advances to the next item still
waiting in the bucket it left** — leaving it on the row you just finished would
strand you on completed work and make you re-click after every move.

It reports this through `onSelect`, the same callback a click fires, so a call
site that already handles selection needs no extra wiring beyond accepting the
`null`:

```tsx
// The consumer only moves the item. The queue decides what to select next.
const categorize = (id: string) =>
  setItems((rows) => rows.map((r) => (r.id === id ? { ...r, bucket: "done" } : r)));

<BucketQueue<Txn>
  /* … */
  selectedKey={selected()}
  onSelect={(key) => setSelected(key ?? undefined)}
/>

<Show when={selected()} fallback={<p>Nothing left to categorize.</p>}>
  {(key) => <DetailPanel itemKey={key()} />}
</Show>
```

The rules, in full:

- Only a move of the **currently selected** item advances anything. Moving some
  other item — including a bulk move that leaves your row alone — never changes
  the selection.
- The successor is the next survivor in the source bucket's **pre-move order**
  (the order you were reading). Items that left in the *same* batch are skipped.
- If the processed item was the **last** in the queue, the selection falls back
  to the nearest item above it rather than jumping to the top.
- If that move **emptied the bucket**, `onSelect` fires with **`null`**: there
  is no next item, and the consumer should clear its selection and show its own
  "queue empty" state. A consumer that would rather keep the finished row on
  screen can ignore the `null` — but it has to be *told*, which is why the
  signature is `string | null` rather than `string`.
- **`null` only ever comes from the advance.** A click or Enter/Space always
  carries a key.
- The roving tab stop follows the advanced row (and is released on `null`), so
  Tab doesn't land on the row that left. DOM focus is not moved — the queue only
  focuses a row in response to a key the user actually pressed.

The choice itself is exported as the pure `advanceSelection(input): Advance` for
callers who want to reproduce it (e.g. to advance after a *delete* rather than a
move). `Advance` is a three-way `keep | select | clear` rather than a nullable
key, because "the queue drained" and "this move is none of your business" are
different answers that a caller must not have to re-derive.

`SplitQueueList`'s deprecation shim **swallows the `null`** — its
`onSelect: (key: string) => void` cannot express a deselect, and no existing
call site expects one. Migrate to `BucketQueue` to get the signal.

## Row content

**`renderItem` returns bare content — the row pads itself.** Don't add your own
padding to what you return; you'd double it.

That padding is not cosmetic. A selected row's treatment is a 2px accent bar
inset at the row's left edge, so the row's own `padding-left` is the only thing
that can guarantee the bar never touches your content — a `renderItem` that
forgot to pad would jam its text against the bar. The horizontal value also
matches the bucket header and the empty strip, so a bucket's label, its rows
and its "nothing here" copy all share one left edge.

**Row height is a consequence of what you render, not a prop.** The queue
measures a real row **in each bucket** and derives that bucket's natural height
from its own measurement, so a one-line row, a two-line card, or anything else
works with no configuration; the water-fill, `capRows`, and the transfer
animation re-scale on their own. Buckets may differ freely from one another — a
short bucket of one-line balance rows above a long bucket of two-line config
rows sizes both correctly.

### What gets measured, and when

Three elements are measured live — a **row**, a **header**, and the **empty
strip** (`emptyLabel` is your JSX too, and may wrap). A `ResizeObserver` watches
those elements, not just the component root, so all of these re-size the bar
rather than leaving it sized for whatever was on screen at mount:

- a different `renderItem` (taller cards, an extra line)
- a theme switch that changes font metrics or row padding
- a web font that lands after first paint

It watches the **border box**, because the measurement reads `offsetHeight` —
observing the default content box would miss a padding or border change. The row
sample is **per bucket**: each populated bucket's first row is measured and used
for that bucket alone. A bucket with nothing to measure yet (empty, or the frame
before its first row mounts) borrows the topmost measured sibling, and falls
back to a constant only when the whole queue is unmeasured.

### The one thing it does assume: uniform rows *within* a bucket

The measurement is taken from **one** row per bucket and multiplied by that
bucket's count, so rows must be the same height within a bucket — but not
across buckets. A `renderItem` whose height varies with the item *inside a
single bucket* — a description that wraps to two lines for some items and one
for others — makes that bucket's natural height an estimate, and it can end up
slightly over- or under-sized. Give rows a fixed height (or clamp the variable
part with `line-clamp` / `nowrap`) if you need the sizing to be exact.

```tsx
// One-line row.
renderItem={(t) => (
  <SpreadRow>
    <EllipsizedTitle>{t.label}</EllipsizedTitle>
    <FadedNowrapSublabel>{t.amount}</FadedNowrapSublabel>
  </SpreadRow>
)}

// Two-line card — same queue, no other change.
renderItem={(t) => (
  <BaselineSpreadRow>
    <NarrowStack>
      <EllipsizedTitle>{t.label}</EllipsizedTitle>
      <FadedNowrapSublabel>{t.meta}</FadedNowrapSublabel>
    </NarrowStack>
    <FadedNowrapSublabel>{t.amount}</FadedNowrapSublabel>
  </BaselineSpreadRow>
)}
```

## Select mode

**There is no `selectMode` prop.** Select mode is on iff you pass
`checkedKeys` — an empty `Set` starts the mode with nothing checked. It applies
only to buckets marked `selectable: true`; rows in other buckets keep
selecting on click even while select mode is on elsewhere in the queue. A click
(or Enter/Space) on a row either toggles its check or calls `onSelect` — never
both.

```tsx
const [checked, setChecked] = createSignal<ReadonlySet<string>>(new Set());

<BucketQueue<Txn>
  /* … */
  checkedKeys={selectMode() ? checked() : undefined}
  onToggleCheck={(key) => setChecked((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  })}
/>
```

### Scoping it — one queue or the whole bar

`selectable` is per-bucket, and which buckets carry it is the whole decision:

- **Only the working queue** (`selectable: true` on one bucket) scopes checking
  there. Every other bucket's rows keep selecting on click while select mode is
  on, so you can still open a terminal item's detail panel mid-triage.
- **Every bucket** turns the whole bar into checkboxes, and a batch can then
  **span buckets** — check two items in one queue and one in another, and move
  all three together. The cost is that no row is left to single-select, so
  click-to-select is suspended for as long as select mode is on.

A cross-bucket batch needs nothing special from the consumer: move every
checked key in one `setItems` call and the queue diffs it as a single set of
transfers, animating rows leaving *different* buckets in one FLIP pass.

`onToggleCheck` carries `{ shift, meta }` but the queue does not interpret them
— range and anchor semantics are yours, including what a shift-range means when
the anchor and the target sit in different buckets.

### Merging checked items

Some consumers use select mode to **group N items into one** rather than to move
them. That works, but understand what the queue does and does not do for you.

**Merging is not a queue concept, on purpose.** A merge is *N removals plus one
addition*, which is a different mutation shape from the bucket change this
component is built around — and it is a minority need, so it is not in the API.
`diffTransfers` reports only keys present in *both* frames whose bucket
changed: a removed key is never examined, and an added key has no previous
bucket. So **a merge produces zero transfers**, and the queue stays completely
silent. That silence is the contract the recipe below depends on (pinned in
`BucketQueue.advance.test.tsx`) — nothing will clobber the selection you
set.

```tsx
const mergeChecked = () => {
  const members = [...checked()];
  if (members.length < 2) return;

  const head = buildGroup(members);        // YOUR merge — see the key rule below
  setItems((rows) => [head, ...rows.filter((r) => !members.includes(r.id))]);

  setChecked(new Set<string>());           // the checks are spent
  setSelectMode(false);
  setSelectedKey(head.id);                 // the queue cannot know this
  setScrollTo(head.id);                    // bring the result into view
};
```

Three things are yours to handle:

- **Mint a NEW key for the merged row.** If the head instead reuses one of the
  members' keys *and* lands in a different bucket, that one key is a genuine
  transfer — and if it drained its old bucket, the queue reports the
  queue-empty signal (`onSelect(null)`) even though the head is alive and is
  precisely what you want selected. A fresh key sidesteps the whole
  interaction.
- **Repair the selection yourself.** If the selected row was absorbed,
  `selectedKey` keeps pointing at a key that now renders nowhere, and no
  `onSelect` fires — the triage advance is keyed on transfers, and a merge has
  none. Set the selection to the head.
- **There is no merge animation.** The members disappear and the head appears in
  one frame. Nothing is corrupted — the FLIP baseline re-snapshots by key, so
  the next real transfer still animates correctly — but the merge itself is a
  cut. `scrollToKey` is the affordance that stands in for it.

### Refusing individual rows

`selectable` is bucket-level: every row in a selectable bucket is checkable.
When the validity of a check depends on what is *already* checked — merging
items that must share an attribute, say — pass `isCheckable`:

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
click and Enter/Space — it does **not** fall through to `onSelect`. Falling
through would swap your detail pane in response to a click the user meant as a
check.

Three things worth knowing:

- **It is fail-open.** Omitting the predicate, or returning `true`, is exactly
  the behavior without it. This is why it is a predicate and not a
  `checkableKeys` set: a positive set would have to be exhaustive, and any item
  you forgot — a row arriving mid-selection — would go silently unselectable.
- **It is scoped to select mode.** The predicate is consulted only where
  `selectable` already applies, so it can never disable a row that would have
  selected.
- **Reset is free.** With nothing checked your rule has no constraint to apply
  and returns `true` throughout, so unchecking back to zero restores everything
  without reset logic on either side.

Rows are dimmed rather than filtered out deliberately: filtering pulls rows out
from under the pointer the moment the first item is checked, leaves the header
count disagreeing with the bucket, and — for keyboard users — deletes rows from
the arrow sequence mid-task.

`uncheckableReason` exists because `renderItem`'s output only fills the row's
content span. It cannot reach the checkbox, which is the one thing the user is
aiming at when the refusal happens.

## Keyboard

Roving tabindex: exactly one row is a tab stop at a time. Up/Down/Home/End
traverse **every row across all buckets in render order, top to bottom, with
no wrap** — arrowing past the last row of one bucket lands on the first row of
the next, and Down on the very last row (or Up on the very first) does nothing.
Enter/Space activates the focused row through the same select-vs-toggle branch
as a click.

**Only interactive rows are keyboard-reachable.** A row is interactive iff it
can be activated — either the queue has a global `onSelect`, or the row's own
bucket is `selectable` and select mode is on. A row in a bucket that is
neither `selectable` nor served by `onSelect` is skipped entirely by arrow
navigation and never takes the tab stop; it still renders (and still
participates in `scrollToKey` / the transfer animation), it just isn't part of
the keyboard sequence.

Tab-stop precedence: last-focused row → `focusedKey` → `selectedKey` → first
interactive row.

## Sizing

The base model is a **weighted water-fill**, computed in JS because pure CSS
can't express it: an empty bucket collapses to just its summary line (label +
count); a populated bucket shrink-wraps to its content; only once the
populated buckets **overflow** the available height do they share it by
`weight` (default 1). The bar fills its parent's height, or an explicit
`height` prop.

`capRows` restores an absolute per-bucket rule on top of that: it caps the
bucket's *natural* height at `header + capRows × rowHeight`, so the bucket
holds at that height and its body scrolls (`.bucket-queue__body` is
`overflow-y: auto`) rather than growing further. This is the direct successor
to `SplitQueueList`'s `topCapRows`, with **one deliberate difference**: a capped
bucket here never grows past its cap to absorb slack from a short neighbour.
`SplitQueueList`'s top pane could grow past `topCapRows` when the bottom pane
was short; a capped `BucketQueue` bucket cannot — surplus height goes to
the other buckets, or goes unused. Predictable beats clever, and no shipped
consumer depended on the slack behavior.

### `fill` — when shrink-wrapping is the wrong default

Shrink-wrapping means a queue whose content is *shorter* than its box leaves the
remainder **unallocated**. That is correct for a bar floating in a page and
wrong for the common layout of a queue in a fixed column with a control pinned
under it: the remainder shows up as a band of dead space between the last row
and that control, and it grows the shorter the list is.

`fill: true` nominates a bucket to take that remainder. After every bucket has
been allocated up to its natural height, whatever is left is split among the
`fill` buckets in proportion to `weight`.

```tsx
const buckets: Bucket[] = [
  // Meant to stay small: capped, and does not fill.
  { key: "balance", label: "Balances", tone: "success", capRows: 3 },
  // Reaches the bottom of the column whether it holds 3 configs or 30.
  { key: "configs", label: "Configs", tone: "accent", fill: true },
];
```

Two rules are worth knowing:

- **It overrides `capRows` for that bucket.** A filling bucket may exceed its
  cap. The cap exists to stop *content-driven* growth, not to refuse space
  nothing else wants.
- **Only a populated bucket fills.** An empty bucket stays pinned to its summary
  line — a filling-but-empty bucket would stretch a "nothing here" strip over
  half the pane. If every `fill` bucket is empty the remainder is left
  unallocated, exactly as it is with no `fill` at all.

The flag is purely additive: declare no `fill` and the queue lays out exactly as
it did before the flag existed.

The pure sizing core is exported as `naturalHeights(input): number[]` and
`allocateHeights(input): number[]` (with the `NaturalInput` / `AllocateInput`
types) for callers who need the sizing math outside the component.

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
  `aria-expanded`, so Enter and Space work with no extra wiring. The disclosure
  chevron **replaces** the tone dot in the same 8px slot, so labels stay on one
  left edge and the bucket still has exactly one role-coloured mark.
- **It applies only while the bucket is populated.** An empty `collapsible`
  bucket renders exactly as any other empty bucket — its `emptyLabel`, its dot,
  and no toggle, because there is nothing to expand into.
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
- **Its rows leave the keyboard sequence** while hidden, so the roving tab stop
  always lands on a row that is actually on the page.
- **The selection is not moved by a collapse.** If `selectedKey` names a row in
  a bucket the user collapses, the row hides and nothing fires; `onSelect`
  still only ever emits `null` from the triage advance.
- **A row moving into a collapsed bucket** cannot animate into a slot that
  isn't rendered, so the vacated slot in its source bucket closes as usual and
  the collapsed bucket's count pulses to show it was received.

## Motion

A bucket change plays a transfer animation: the arriving row's slot opens while
siblings FLIP-slide to close the gap it left and open the one it fills.
`prefers-reduced-motion` places rows instantly, with nothing else animating.

The choreography is **curried, not a prop** — there is no motion configuration
on `BucketQueueProps`, per STYLE_GUIDE's Ambient Motion rule ("the
animation is baked into the component, not passed at the call site"). It sits
behind a swappable `TransferChoreographer` seam (`./motion.ts`); the shipped
implementation is the "slot" choreography described above. A flying-clone
choreography — a row cloned and animated across the bar, cross-fading from its
source bucket's treatment to its destination's — was designed and explicitly
deferred rather than shipped. See
`docs/adr/0004-one-queue-component-and-the-motion-seam.md` for what the swap
costs and the carried limitations of the shipped animation.

## Notes

- No factory — data and buckets are per-call, so the base component is
  already the thing you import.
- Selection, focus, the checked set, and scroll requests are all
  consumer-owned; the component holds no selection state of its own.
