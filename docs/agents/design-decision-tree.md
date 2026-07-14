# Design decision tree

Institutional memory for /design-options: WHY each SUI component gets chosen,
keyed on UX / data-centric questions — not a flat component menu. The goal is
to ask as FEW questions as possible: when a branch below (or a precedent at
the bottom) already answers the decision, propose the component with its
rationale and ask at most a confirming question.

How to use (the /design-options skill drives this):

1. Identify the decision category (page layout, left list, detail container…).
2. Walk the tree with what you already know from the design/context — the
   design doc usually answers most discriminators without asking.
3. Ask ONLY the discriminators you cannot answer from context, batched into
   one question set.
4. Record the outcome as a precedent (bottom of this file) AND in mempalace,
   with the answers that drove it — that's what makes the next ask smaller.

Maintenance: when a decision doesn't fit any branch, that's a missing
discriminator — extend the tree in the same change that records the precedent.

---

## Page layout

Discriminators:
- **How many always-visible regions?** 1 → `Page` + Stack sections.
  2 (master/detail) → `ResizableContainer` split or `ThreePanelLayout` with
  one rail. 3 (list + detail + meta) → `ThreePanelLayout`.
- **Do side regions trade off against each other?** (only one needed at a
  time) → `TabbedSidePanel` instead of a second rail.
- **Is this a full app screen or an embedded view?** Full app chrome →
  `AppShell` wrapping; embedded → bare layout component.
- **Should a region be user-resizable?** → wrap that region in
  `ResizableContainer` (composes with any of the above).

## Left list (a rail of items you pick from / work through)

The load-bearing discriminator is **how many statuses the items represent**,
because status count encodes the user's workflow:

- **1 status (homogeneous items)** — the list is purely "choose detail from a
  list". Use the `List` primitive (`variant="default"`, `dividers`,
  hand-wired onClick) — no chips, no machinery. Reason: any status affordance
  would be noise; the row IS the label.
- **2 statuses (binary, e.g. todo vs done)** — the list communicates
  done-ness while you pick. Use `List variant="status"` (status dot +
  secondary line) — a dot is enough for binary. Reason: a full status CHIP
  spends rail width to say one bit.
- **3+ statuses (multi-status, e.g. todo / complex / done)** — the list IS a
  workflow surface: the user resolves the obvious items fast and returns to
  the complex set for deeper operations. Use `ActionList` (status chips,
  selection, batch actions, per-status tones). Reason: distinguishing WHICH
  non-done state each item is in is the point; chips + tones carry that, and
  the selection/action machinery supports the "come back and operate on the
  complex set" pass.

Secondary discriminators (each adds/changes a wrapper, not the core pick):
- **Filtering needed?** Few items / short session → none. Text narrowing →
  wrap in `QuickFilter`. Faceted/tag filtering → the app's filter bar idiom
  (dside FilterBar precedent), or `FilterableTable` if it's tabular anyway.
- **What is the sort?** User-owned priority (drag to reorder) → the list must
  be sortable: `ActionList onSort` / `SortableList`. Derived (date, severity,
  bucket) → sort in the projection, no reorder affordance.
- **Should the rail be resizable?** Long titles / user preference varies →
  wrap the rail in `ResizableContainer` (`directions=["right"]`). Fixed-width
  rails truncate; only accept truncation when titles are previews and the
  detail panel shows the full text anyway.

## Detail container (the center "selected thing" region)

- Sections of read-mostly fact → `InfoPanel` per section (title framing).
- One editable primary object → app composition with `EditableTitle` /
  `StatusChip` in a `SpreadRow` title bar (the ActionList detail idiom).
- Transient/modal inspection (keeps list context) → `Modal`; mobile-ish
  bottom drawer → `BottomSheet`.

## Counts / metrics rail

- Per-category tallies the user scans → `CountChip` stack (count + label).
- One dominant fraction (x of y done) → `RingChart` or `StackedProgressBar`.
- Remaining-work emphasis with severity → `GapCell` (tabular) /
  `NumberWithUnits` + tone.

## Flow / stage visualization

- Stage progression the user can act on → `DagChart` (nodes clickable,
  `focusedNodeId` = current) — fits workflow DAGs (todo→doing→done and
  branchier). Purely indicative progress → `ProgressCheck` /
  `StackedProgressBar`.

---

## Precedents (append-only)

Each entry: date · surface · decision · the discriminator answers · choice · why.

- **2026-07-13 · workshop:categorical-triage · page layout** — regions: 3
  always-visible (queue + card detail + counts); no region trade-off; embedded
  bench view; resizability not yet requested → **ThreePanelLayout**
  (topBar/left/center/right slots). Chosen over ResizableContainer split,
  Page+Stack, TabbedSidePanel. Also the dside Focus anatomy — consistency.
