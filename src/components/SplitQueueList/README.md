# SplitQueueList

A linked two-list **processing queue** in one fixed-height column. The **top**
list holds *resolved* (done) items; the **bottom** list holds *unresolved*
(to-process) items. The user works the bottom; resolving an item moves it up
across the seam into the top, so the most-recent work sits adjacent to what's
next and is one click away to revisit. Built for triage / review /
categorization flows (transaction categorization, inbox triage,
accept-vs-remaining review).

SUI owns the **layout and the animation**. You own the **data, the state, and
the card content**. You drive everything by mutating two arrays.

## Mental model

- It's a **controlled, generic** component over your item type `T`.
- You hand it two arrays — `resolved` and `unresolved` — plus `keyOf` (identity)
  and `renderItem` (content).
- **There is no `resolve()` method.** You change the arrays; the component
  detects the change and plays the matching animation:
  - **Resolve** = remove a key from `unresolved`, **append** to `resolved` →
    forward animation (card crosses the seam upward).
  - **Unresolve** = remove from `resolved`, **prepend** to `unresolved` →
    the mirrored reverse animation (card crosses the seam downward to the head).
- Clicking a row does **not** resolve it — it fires `onSelect(key)` only. What
  selection means (e.g. opening a detail panel) is the consumer's call.

## Quick start

```tsx
import { SplitQueueList } from "solid-ui-components";
import "solid-ui-components/index.css";
import { createSignal } from "solid-js";

interface Txn { id: string; label: string; amount: string }

function Categorize(props: { initial: Txn[] }) {
  const [resolved, setResolved] = createSignal<Txn[]>([]);
  const [unresolved, setUnresolved] = createSignal<Txn[]>(props.initial);

  // Resolve = remove from unresolved, append to resolved. SUI animates it.
  const resolve = (key: string) => {
    const item = unresolved().find((t) => t.id === key);
    if (!item) return;
    setUnresolved((u) => u.filter((t) => t.id !== key));
    setResolved((r) => [...r, item]);
  };

  return (
    <SplitQueueList<Txn>
      resolved={resolved()}
      unresolved={unresolved()}
      keyOf={(t) => t.id}
      renderItem={(t) => (
        <span style={{ display: "flex", "justify-content": "space-between" }}>
          <span>{t.label}</span>
          <span>{t.amount}</span>
        </span>
      )}
      resolvedLabel="Categorized"
      unresolvedLabel="To categorize"
      allClearLabel="All clear — every transaction categorized"
    />
  );
}
```

## Configuring your own cards

`renderItem(item) => JSX.Element` is a blank canvas — return whatever markup you
want for the card body (your own components, multiple lines, badges, icons).

What you **don't** control is the *row chrome* SUI draws around your content,
and that's deliberate — it's what makes the motion consistent across every
consumer:

- the `✓` (resolved) / `▸` (focused) marker and the left status border,
- the orange focus background and the selection ring,
- the seam between the lists,
- the clip-and-reveal as a card crosses the seam during the animation.

Your `renderItem` output sits *inside* that chrome.

## Selection + a detail panel

Selection is **controlled** and the detail panel is **consumer-composed** — the
component only emits which card was clicked; you render the panel beside it.

```tsx
const [selected, setSelected] = createSignal<string | null>(null);

<SplitQueueList<Txn>
  /* …data… */
  selectedKey={selected() ?? undefined}
  onSelect={setSelected}
/>

// Beside it, your own panel reads `selected()` and calls resolve()/unresolve().
```

- `selectedKey` puts a subtle ring on the matching row in **either** panel.
- `focusedKey` is the orange "current" highlight on the **unresolved** side; it
  composes with selection. A common pattern is to drive both from a single
  "current card" signal so the orange follows what's selected, advances to the
  next head on resolve, and stays on a card you unresolve.

## Reverse (unresolve)

To send a done card back, remove it from `resolved` and **prepend** it to
`unresolved`. The component plays the mirror of the resolve animation. For the
cleanest motion, first move the card to the **tail of `resolved`** (so the exit
runs from the seam), let that paint, then do the swap — i.e. "sort to the seam,
then animate":

```tsx
const unresolve = (key: string) => {
  // sort to the done tail first…
  setResolved((r) => {
    const item = r.find((t) => t.id === key)!;
    return [...r.filter((t) => t.id !== key), item];
  });
  // …then on the next frame, swap it back to the to-categorize head.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const item = resolved().find((t) => t.id === key)!;
    setResolved((r) => r.filter((t) => t.id !== key));
    setUnresolved((u) => [item, ...u]);
  }));
};
```

(Symmetrically, to resolve a card that isn't already at the top, reorder it to
the **head of `unresolved`** first, then append to `resolved` next frame.)

## Sizing

The top pane is **content-driven**, measured in JS (a `ResizeObserver` re-measures
on container resize) because pure CSS can't express the rule:

- **`topFloorRows` (default 0):** at 0 resolved the top collapses to just its
  header and grows one row per resolved card.
- **`topCapRows` (default 3):** beyond the cap the top pane stops growing and
  **scrolls**, keeping the newest row flush at the seam.
- The bottom pane takes the **remaining** space and scrolls when overfull. When
  the bottom is short, its slack flows up and the top may grow past the cap.
- An empty bottom collapses to a thin "all clear" strip (`allClearLabel`).

## Animation

Forward and reverse are mirrors of each other and run over `animationMs`
(default 800). As the exiting card height-collapses out of one list, the other
pane grows (or scrolls, when capped) to reveal the arriving card — the panes
always sum to the total height so the seam glides with no gap. The arriving
card's background **fades in** once the transfer completes. Everything honors
`prefers-reduced-motion` (cards just place, no motion).

## Props

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `resolved` | `T[]` | — | Done items (top list, oldest first). |
| `unresolved` | `T[]` | — | To-process items (bottom list, next first). |
| `renderItem` | `(item: T) => JSX.Element` | — | Your card content. |
| `keyOf` | `(item: T) => string` | — | Stable identity; drives the animation. |
| `focusedKey` | `string?` | top of unresolved | Orange "current" highlight (controlled). |
| `onFocusChange` | `(key \| null) => void` | — | Fires when focus should move (e.g. after a resolve auto-advances). |
| `selectedKey` | `string?` | — | Selection ring on the matching row in either panel (controlled). |
| `onSelect` | `(key) => void` | — | Fires when any row is clicked. |
| `resolvedLabel` | `string` | `"Resolved"` | Top header. |
| `unresolvedLabel` | `string` | `"Unresolved"` | Bottom header. |
| `allClearLabel` | `JSX.Element?` | — | Copy for the empty-bottom strip. |
| `topCapRows` | `number` | `3` | Rows shown in the top pane before it scrolls. |
| `topFloorRows` | `number` | `0` | Min rows in the top pane (0 = header-only when empty). |
| `rowHeight` | `number` | `40` | Initial row-height estimate; the real height is measured. |
| `height` | `number` | `420` | Total column height in px. |
| `animationMs` | `number` | `800` | Resolve/unresolve slide duration. |
| `topOnly` | `boolean` | `false` | Render only the top (resolved) panel — omits the bottom list and seam. |
| `class` | `string?` | — | Extra class on the root. |
| `onResolve` | `(key) => void` | — | **Deprecated/unused** — clicking no longer resolves; kept for back-compat. |

## Notes

- No factory — data and labels are per-call, so the base component is already
  the thing you import.
- Resolve/unresolve are driven entirely by your array mutations; the component
  is a pure renderer of the two lists plus the transition between them.
