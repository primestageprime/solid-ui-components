# BucketQueue — per-item checkability in select mode

**Status:** approved 2026-07-31. Supersedes the scoping handoff
`docs/superpowers/handoffs/2026-07-31-bucketqueue-item-checkability-handoff.md`,
which this design closes out.

## Problem

`BucketQueue`'s select-mode checkability is **bucket-level only**:
`checkableIn(bucket) = selectModeOn() && bucket.selectable === true`
(`BucketQueue.tsx:160-161`). Every row in a `selectable` bucket is uniformly
checkable, so a consumer cannot express "this item can't join *the group you
have checked right now*."

The shipped consequence is in `thorcasting-ui`'s /import screen. Checking a
revenue suggestion and an expense suggestion together and clicking "Group N as
one" does nothing — no error, no feedback. Server-side,
`group_imported_entities` calls `validate_group`, which rejects mixed `side`,
and the reactor `log::warn!`s and returns without surfacing anything to the
client.

**The fix is prevention, not error-surfacing.** Incompatible items become
unselectable up front. Adding a toast on failed commit was explicitly ruled out
and is not an alternative under consideration.

## Scope

`BucketQueue` gains a **general** per-item veto. It is not side-aware and knows
nothing about revenue/expense — the domain rule lives entirely in the consumer,
so if `validate_group` grows further rules later, the same SUI mechanism carries
them with no change here.

Out of scope: wiring the thorcasting-ui side. That is a separate task in the
consumer repo, once this ships and is pinned.

## Public API

Two new optional props on `BucketQueueProps<T>`. Both are **fail-open**: omit
them and the component is byte-identical to today.

```ts
/** Per-item veto on checking, consulted ONLY for rows in a `selectable`
 *  bucket while select mode is on. Return false and the row renders inert
 *  and dimmed: no check toggle, and no fall-through to selection. Omit — or
 *  return true — and every row in a selectable bucket is checkable, exactly
 *  as before.
 *
 *  Typically derived from `checkedKeys`: the consumer closes over its own
 *  checked set and refuses items incompatible with what is already checked.
 *  An empty checked set should return true for everything, which is what
 *  makes unchecking back to zero restore full checkability for free. */
isCheckable?: (item: T) => boolean;

/** Hover/AT explanation for a row `isCheckable` refused — e.g. "different
 *  side than your current selection". Rendered as the ROW's `title`, so it
 *  covers the check affordance too, which `renderItem` cannot reach.
 *  Consulted only for refused rows; ignored everywhere else. */
uncheckableReason?: (item: T) => string | undefined;
```

### Why a predicate, not a key set

The handoff leaned toward a controlled `checkableKeys?: ReadonlySet<string>`,
for consistency with `checkedKeys`/`selectedKey`. That lean was rejected on
three grounds:

- **It matches the component's existing shape.** `bucketOf`, `keyOf` and
  `renderItem` are all `(item: T) => X`. A per-item predicate is the house
  style here, not a foreign imperative callback.
- **Checkability is derived, not owned.** The controlled-prop convention
  documented at `BucketQueue.tsx:73-76` is about *state ownership*. Checkability
  is a pure function of state the consumer already owns; handing it back as a
  controlled prop creates a second source of truth for one derivation.
- **Failure direction.** A positive `checkableKeys` set must be **exhaustive**:
  any item the consumer forgets — a new suggestion arriving mid-selection —
  silently becomes *un*checkable. That is a silent fail-**closed**, the exact
  class of bug this whole design exists to eliminate. A predicate degrades to
  today's behavior instead.

A negative `uncheckableKeys?: ReadonlySet<string>` was also considered. It
shares the fail-open property but costs an O(n) memo on the consumer side and
still duplicates a derivation the predicate expresses directly.

### Why two props rather than one union

The compact alternative is `isCheckable?: (item: T) => boolean | string`, where
a string means "refused, and here is why" — impossible to get out of sync.
Rejected: a non-empty string is truthy, so any naive `if (isCheckable(it))`
reads a refusal as permission. The redundancy risk of two props is benign — a
`uncheckableReason` returned for a checkable row is simply never consulted.

### Why `uncheckableReason` is a SUI prop at all

A consumer could put a `title` on whatever `renderItem` returns and need no new
SUI surface. But `renderItem`'s output only occupies `.bucket-queue__content`;
it does **not** cover the checkbox. The checkbox is precisely what the user is
aiming at when the refusal happens, so a consumer-side tooltip goes silent on
the one hover that matters. A row-level `title` covers both.

### Scope guard

`isCheckable` is consulted **only** when `checkableIn(bucket)` is already true.
It cannot become a general row-disable mechanism by accident, and it never fires
outside select mode.

### Reset

Unchecking back to zero restores full checkability with **no special case in
`BucketQueue`**. With nothing checked, the consumer's predicate has no
constraint to apply and returns true throughout. This falls out of the predicate
shape rather than being a rule the component enforces.

## Visual treatment

**Dimmed in place** — the row stays where it is at reduced opacity with a dashed
checkbox outline. Chosen over filtering refused rows out entirely.

Filtering was rejected because it removes rows from under the pointer the moment
the first item is checked, makes the header count disagree with the bucket's
contents, and destroys the context that explains *why* the current selection
constrains further picks. Dimming also matches how this codebase already renders
"not applicable" elsewhere — a mark on the item, not removal.

A per-row inline reason string (rendered as visible text) was considered and
rejected as a **visible** treatment: the copy is domain-specific, and
`renderItem` already owns that space. It survives only as the hover/AT `title`
described above.

## Behavior

### Activation

Click and Enter/Space already funnel through the single `activate` branch
(`BucketQueue.tsx:165-172`). It gains one guard:

```ts
const blockedIn = (item: T, bucket: Bucket) =>
  checkableIn(bucket) && props.isCheckable?.(item) === false;

const activate = (item: T, key: string, bucket: Bucket, modifiers) => {
  if (checkableIn(bucket)) {
    if (!blockedIn(item, bucket)) props.onToggleCheck?.(key, modifiers);
    // refused → nothing at all
  } else props.onSelect?.(key);
};
```

`activate` takes the item as well as the key today's signature carries. The
keyboard path has only the key in hand, so `bucketForKey` (`:176-179`) gains a
sibling that resolves an item from its key — or is widened to return both. That
lookup detail is an implementation choice for the plan, not a design decision;
what matters is that the keyboard and pointer paths keep sharing one branch.

**No fall-through to `onSelect`.** A refused row is inert, not "selects
instead". Falling through would mean that mid-group, clicking a grayed row
silently swaps the consumer's detail pane — a different, unrequested action in
response to a click the user meant as a check. The invariant holds: *in select
mode, a selectable bucket's rows toggle checks or do nothing.*

Because both the pointer and keyboard paths route through `activate`,
**`keyboard.ts` requires no change.**

### Keyboard

**A refused row stays in the roving-tabindex sequence.** It keeps
`data-bq-interactive`, keeps its `tabindex`, remains an arrow-key target, and
gains `aria-disabled="true"`.

- Dropping refused rows from the sequence is the keyboard equivalent of the
  filtering treatment already rejected — rows vanish out from under the arrow
  keys the instant the first item is checked.
- A keyboard or screen-reader user must be able to *reach* the row to learn why
  it is excluded. ARIA's guidance for disabled options in a listbox is
  keep-focusable + `aria-disabled`, not remove.
- It sidesteps the `allKeys` hazard recorded in `docs/handoffs/open-work.md`
  (lines 97-101), pinned by a test in `BucketQueue.keyboard.test.tsx`:
  `allKeys()` is built from the ITEMS, and anything that hides rows without
  removing them from it strands the single tab stop on a row that renders
  nowhere, dropping the whole queue out of the tab order. `allKeys()` stays
  bucket-level and untouched here.

`interactiveIn(bucket)` therefore keeps its current meaning — *may hold focus* —
and a new per-row notion — *may be activated* — is what the refusal turns off.
The two are conflated today only because nothing had ever needed to distinguish
them.

## Rendering

Per row, the single `interactive()` flag splits in two:

| | refused row | unchanged rows |
|---|---|---|
| `data-bq-interactive` | present | present iff `interactiveIn(bucket)` |
| `tabindex` (roving) | participates | unchanged |
| `onFocus`, `onKeyDown` | wired | unchanged |
| `onClick` | **not wired** | wired iff activatable |
| `bucket-queue__row--interactive` | **absent** | present iff activatable |
| `bucket-queue__row--uncheckable` | **present** | absent |
| `aria-disabled` | `"true"` | unset |
| `title` | `uncheckableReason(item)` if defined | unset |

Dropping `--interactive` is what removes `cursor: pointer` and the hover fill,
so a refused row stops *looking* clickable. Note `interactiveIn` is true
whenever a global `onSelect` exists, so the refusal must be computed per row and
override that arm — not merely AND-ed with `checkableIn`.

New CSS in `BucketQueue.css`:

- `.bucket-queue__row--uncheckable` — `opacity: .38`, `cursor: default`.
- `.bucket-queue__checkbox--disabled` — dashed border.

The header count is **untouched**. A refused row is still in the bucket, and the
count reflecting that is half of why dimming beat filtering.

## Testing

New cases in the existing `src/components/BucketQueue/` suites (this folder
already has per-concern test files; follow that split rather than adding a new
one — `BucketQueue.selection.test.tsx` for activation, `.keyboard.test.tsx` for
focus, `styling.test.ts` for classes):

- Refused row: click fires **neither** `onToggleCheck` nor `onSelect`.
- Refused row: Enter and Space fire neither — the keyboard path is guarded by
  the same branch, not separately.
- Refused row remains an arrow-key target and still carries a `tabindex`; the
  queue still has exactly one `tabindex="0"`.
- Refused row carries `aria-disabled="true"` and, when `uncheckableReason`
  returns a string, a `title`.
- Refused row carries `--uncheckable` and **not** `--interactive`.
- `isCheckable` omitted → rendering and behavior identical to today (the
  regression guard for fail-open).
- `isCheckable` present but returning true for everything (the empty-checked-set
  case) → every row checkable; this is the reset path.
- `isCheckable` is **not** consulted for a non-`selectable` bucket, nor outside
  select mode.

## Repo obligations

- **`COMPONENTS.md`** — the `BucketQueue` entry states "Key props (14 total)"
  and enumerates them. Both new props must be added and the count corrected to
  16. `undocumentedComponents` is ratcheted at 0.
- **`src/components/BucketQueue/README.md`** — the full usage guide; add the
  select-mode veto to it.
- **Showcase** — `dev/showcases/bucket-queue/` exists; demonstrate the refused
  state there. Any demo geometry goes in `dev/main.css` as a
  `.<component>-demo` class, never an inline `style={{}}`
  (`showcaseStyleRubricViolations` is ratcheted at 0).
- **Health ratchet** — run `npm run health -- --update-baseline` and commit the
  baseline plus `scripts/health-history.json` with the change. A metric that
  *improves* without the ceiling tightening fails CI just as a regression does.
- **No new files under `src/components/`** are anticipated; if any are added
  they need a `Depth N` line in the header comment (`missingDepthHeaders` is
  ratcheted at 0 and applies to internal files too).

## Follow-on (not this repo)

Once released and pinned, `thorcasting-ui` computes the predicate from
`checkedKeys()` + each row's `side` and passes `isCheckable` /
`uncheckableReason` at
`src/components/screens/configure/queuePanel.tsx`'s `OTHER` bucket — the only
`selectable: true` bucket, and where the collision is actually reachable. The
existing group-parent veto in `configureConfigsPane.tsx`'s `onToggleCheck`
("no nested groups") is a second rule that could fold into the same predicate,
turning a post-hoc refusal into the same up-front dimming; that consolidation is
optional and belongs to the consumer-side task.
