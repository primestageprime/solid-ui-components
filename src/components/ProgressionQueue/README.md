# ProgressionQueue

A queue of items split across **N always-present sections**, each with its own
label, role dot, and count. Items progress from section to section as their
underlying state changes — e.g. suggestions → categorized, or triage → done →
archived. Built for triage / review / categorization flows. Supersedes
`SplitQueueList` (see `docs/adr/0004-one-queue-component-and-the-motion-seam.md`).

## Mental model

- It's a **controlled, generic** component over your item type `T`.
- You hand it **one flat `items` array**, plus `bucketOf(item) => sectionKey` to
  say which section each item belongs in. There is no `resolved`/`unresolved`
  pair and no `resolve()` method.
- **A move is one atomic mutation.** Change an item so `bucketOf` returns a
  different section key (in the same `setItems` call that updates everything
  else about it) and the queue detects the change and plays the transfer
  animation. Because there's one array, there's no intermediate frame where an
  item belongs to two sections or to neither.
- Direction and distance fall out of section order — a move from section 3 to
  section 1 works with no special-casing, exactly like section 1 to section 2.
- An item whose `bucketOf` result matches no section renders nowhere
  (documented, not an error).

## Quick start

```tsx
import { ProgressionQueue, type ProgressionSection } from "solid-ui-components";
import "solid-ui-components/index.css";
import { createSignal } from "solid-js";

interface Txn { id: string; label: string; amount: string; bucket: string }

const SECTIONS: ProgressionSection[] = [
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
    <ProgressionQueue<Txn>
      sections={SECTIONS}
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
| `sections` | `ProgressionSection[]` | Top → bottom. Every section renders always, with its count. |
| `items` | `T[]` | All items; each is bucketed into a section by `bucketOf`. |
| `bucketOf` | `(item: T) => string` | Item → the `key` of the section it belongs in. Changing the result is what plays the transfer animation. |
| `keyOf` | `(item: T) => string` | Stable identity (selection, list keys, transfer tracking). |
| `renderItem` | `(item: T) => JSX.Element` | Your row content. |
| `selectedKey?` | `string` | Selected item (controlled) — its row gets the accent bar, no fill. |
| `onSelect?` | `(key: string) => void` | Fires on click / Enter-Space outside select mode. |
| `focusedKey?` | `string` | Roving keyboard focus (controlled). |
| `onFocusChange?` | `(key: string \| null) => void` | Fires when keyboard focus moves. |
| `checkedKeys?` | `ReadonlySet<string>` | **Presence turns select mode on.** An empty `Set` means "mode on, nothing checked." Scoped to `selectable` sections. |
| `onToggleCheck?` | `(key, { shift, meta }) => void` | Fires when a checkable row is activated while select mode is on. |
| `scrollToKey?` | `string` | Reacts on CHANGE: set (or bump) to request a scroll, then clear it. |
| `height?` | `number` | Total height in px. Omit to fill the parent. |
| `class?` | `string` | Extra class on the root. |

`ProgressionSection`:

| Field | Type | Purpose |
|---|---|---|
| `key` | `string` | Stable key; `bucketOf` returns one of these. |
| `label` | `string` | Header label. |
| `tone` | `Tone` | Dot color beside the label — the ONLY role color; chrome stays neutral. |
| `weight?` | `number` | Relative height share when populated sections overflow. Default 1. |
| `selectable?` | `boolean` | Rows in this section render the check affordance and toggle instead of select when `checkedKeys` is present. Default false. |
| `emptyLabel?` | `JSX.Element` | Copy for the collapsed strip when this section has no items. Omit for the bare summary line. |
| `capRows?` | `number` | Soft cap in rows — the section stops growing past this many rows and its body scrolls. Omit to shrink-wrap to content. |

## Select mode

**There is no `selectMode` prop.** Select mode is on iff you pass
`checkedKeys` — an empty `Set` starts the mode with nothing checked. It applies
only to sections marked `selectable: true`; rows in other sections keep
selecting on click even while select mode is on elsewhere in the queue. A click
(or Enter/Space) on a row either toggles its check or calls `onSelect` — never
both.

```tsx
const [checked, setChecked] = createSignal<ReadonlySet<string>>(new Set());

<ProgressionQueue<Txn>
  /* … */
  checkedKeys={selectMode() ? checked() : undefined}
  onToggleCheck={(key) => setChecked((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  })}
/>
```

## Keyboard

Roving tabindex: exactly one row is a tab stop at a time. Up/Down/Home/End
traverse **every row across all sections in render order, top to bottom, with
no wrap** — arrowing past the last row of one section lands on the first row of
the next, and Down on the very last row (or Up on the very first) does nothing.
Enter/Space activates the focused row through the same select-vs-toggle branch
as a click.

**Only interactive rows are keyboard-reachable.** A row is interactive iff it
can be activated — either the queue has a global `onSelect`, or the row's own
section is `selectable` and select mode is on. A row in a section that is
neither `selectable` nor served by `onSelect` is skipped entirely by arrow
navigation and never takes the tab stop; it still renders (and still
participates in `scrollToKey` / the transfer animation), it just isn't part of
the keyboard sequence.

Tab-stop precedence: last-focused row → `focusedKey` → `selectedKey` → first
interactive row.

## Sizing

The base model is a **weighted water-fill**, computed in JS because pure CSS
can't express it: an empty section collapses to just its summary line (label +
count); a populated section shrink-wraps to its content; only once the
populated sections **overflow** the available height do they share it by
`weight` (default 1). The bar fills its parent's height, or an explicit
`height` prop.

`capRows` restores an absolute per-section rule on top of that: it caps the
section's *natural* height at `header + capRows × rowHeight`, so the section
holds at that height and its body scrolls (`.prog-queue__body` is
`overflow-y: auto`) rather than growing further. This is the direct successor
to `SplitQueueList`'s `topCapRows`, with **one deliberate difference**: a capped
section here never grows past its cap to absorb slack from a short neighbour.
`SplitQueueList`'s top pane could grow past `topCapRows` when the bottom pane
was short; a capped `ProgressionQueue` section cannot — surplus height goes to
the other sections, or goes unused. Predictable beats clever, and no shipped
consumer depended on the slack behavior.

The pure sizing core is exported as `allocateHeights(input): number[]` (with
the `AllocateInput` type) for callers who need the water-fill math outside the
component.

## Motion

A bucket change plays a transfer animation: the arriving row's slot opens while
siblings FLIP-slide to close the gap it left and open the one it fills.
`prefers-reduced-motion` places rows instantly, with nothing else animating.

The choreography is **curried, not a prop** — there is no motion configuration
on `ProgressionQueueProps`, per STYLE_GUIDE's Ambient Motion rule ("the
animation is baked into the component, not passed at the call site"). It sits
behind a swappable `TransferChoreographer` seam (`./motion.ts`); the shipped
implementation is the "slot" choreography described above. A flying-clone
choreography — a row cloned and animated across the bar, cross-fading from its
source section's treatment to its destination's — was designed and explicitly
deferred rather than shipped. See
`docs/adr/0004-one-queue-component-and-the-motion-seam.md` for what the swap
costs and the carried limitations of the shipped animation.

## Notes

- No factory — data and sections are per-call, so the base component is
  already the thing you import.
- Selection, focus, the checked set, and scroll requests are all
  consumer-owned; the component holds no selection state of its own.
