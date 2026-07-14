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

## Typography discipline (applies to EVERY decision below)

All text renders through the `Text` family — `TextValue` / `TextLabel` /
`TextTitle` / `TextBody` / `TextUnits` / `TextSublabel` (+ the curried
specials in Text/variants.ts). Never raw `<span>`/`<strong>`/utility classes
for content text, EVEN ON WORKSHOP BENCHES — benches drift into promotions,
and un-thematic text is exactly the drift Peter watches for (2026-07-14).
Emphasis is chosen by picking the variant (label > title > body > sublabel),
not by bolding.

Same discipline for ICONS: always the `Icon` component, outline variant,
currentColor (thematic) — never emoji glyphs (colored emoji break the theme;
"the clock looks weird" — Peter, 2026-07-14). Gap noted: no chain/link icon
for dependency semantics yet — add one to Icon when dependency children ship.

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

### Sizing a fixed-width column (order matters)

1. **Decide the card/row FORMAT first** — what each row contains (pill?
   title? indicator icons? second line?). Width is a consequence of format,
   never the other way around.
2. **Then size the column so TYPICAL data is untruncated** (Peter's rule:
   "I usually want to see untruncated data if I can"). For a rail of cards:
   width of a typical title (5–8 words) + the status pill + a 1rem spacer.
   Truncation is for outlier data, not the median case.

## Card formats (compose from SUI elements — never hand-rolled boxes)

Peter's taxonomy (2026-07-14), confirmed by every card built so far
(WorkProgressCard, ExtractionBoard cards, WorkerCard, dside Focus sidebar
cards):

- **One-line card** — only text + status. Identifying text LEFT, status
  RIGHT. Compose: `Surface`/`CardSurface` box → `SpreadRow` → `Text` left,
  `StatusBadge`/`StatusChip` right.
- **Two-line card** — the one-line content + a meta line: OWNERSHIP left,
  TIMING/SIZE right. Compose: box → `TightStack` → [SpreadRow(identity,
  status), SpreadRow(AssigneeIcon/owner name, Duration | NumberWithUnits)].
- **Three-line card** — the two-line card with a SANDWICH of detail text in
  the middle. Compose: box → `TightStack` → [identity/status row, muted
  detail `Text` (truncated preview), ownership/timing row]. Live example:
  dside Focus sidebar card (title + DOING badge / description / "Peter S" +
  "30m").

Positioning canon (Peter, 2026-07-14):
- **The TITLE is the focus and owns the left edge — always.** Status is
  usually a sort/group key, which makes it LESS important per-row, not more.
- **Status per-row (trailing, right) only when the list is NOT grouped by
  status** — there it marks where the grouping breaks / the exceptions.
- **When the list IS sorted/grouped by status, don't repeat it per-row** —
  show only the group BOUNDARIES, in preference order:
  1. **Area** — separate lanes/sections per status (ExtractionBoard lanes,
     dside's active vs done/won't-do split lists),
  2. boundary markers — section headers / dividers,
  3. per-row tags (last resort — redundant within a group).
- Ownership bottom-left; quantitative (time/size/progress) bottom-right.
- Detail text is always the middle sandwich, muted, preview-truncated.
- Progress bars sit at the card bottom, full width (WorkProgressCard,
  ExtractionBoard, WorkerCard).

So the minimal set is ONE card family:

```
line 1:  title (the focus)          [status — only if list isn't status-grouped]
mid:     detail sandwich            (optional)
line n:  owner/claimant             timing · size   (optional)
```

Historical note: `ActionListItem` (2026-07-02) put a fixed-width status pill
LEFT of the title. That predates this canon; treat it as that component's
established look, not a pattern to copy into new card/list designs.

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

## Categorized counts column (a rail of categories with counts and/or children)

For a rail that breaks a collection into categories (blockage kinds, claim
state, buckets): each category is a section —

```
CATEGORY LABEL                    [count]
  ⏸ one-line child (click → select)
  ⏸ one-line child
NEXT CATEGORY                     [count]     ← count-only mode
```

- Header: category label left (muted), `CountChip` right (quantitative →
  right, per the card canon).
- Per category choose **children mode** (one-line, indented, glyph-prefixed,
  click-to-select) or **count-only mode**. Children when the user acts on
  individual members from the rail; count-only when the category is just a
  gauge.
- **Order categories by ACTIONABILITY** — the ones you can do the most
  about at the top (Peter, 2026-07-14). For blockage rails: person-blocked
  first (you can nudge them), snooze next (self-clears eventually),
  dependency (count only), claimed-but-non-terminal last (count only —
  someone else's to move). Actionable categories get children mode; the
  rest count-only.
- The "eligible" remainder does NOT belong in this rail — it IS the main
  queue; surface its count in the top bar instead.
- **Counts render as the thematic number lozenge** — `TagPill` plain-label
  form — but DE-emphasized: the CATEGORY label carries the visual weight
  (strong), the count stays muted. The count briefly lights up (TagPill
  `active` as a ~700ms flash) when its VALUE CHANGES — animation marks
  change, not steady-state importance (Peter, 2026-07-14).
- **Child lines follow the card canon — [title (data)]**: title left (the
  focus), the category's datum trailing right — person-blocked → glyph + the
  FIRST WORD of the blocked-by string (convention: blocked_by starts with
  the person, "Ryan — grant access"); snoozed → glyph + humanized time
  REMAINING, compact ("2d4h", "1d2h", "45m").
- Compose: `TightStack` of sections; header `SpreadRow(label, TagPill)`;
  children muted one-line rows. No new component until a second consumer
  demands one.

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
- **2026-07-14 · workshop:categorical-triage · left list (queue rail)** —
  statuses: multi (TODO/DOING/DONE + blockage categories; the flow is
  resolve-obvious-fast, revisit the complex set) → **ActionList**. Filtering:
  none (the design's /triage is a one-at-a-time queue; Todo keeps the filter
  bar). Sort: derived shared StatementOrder priority — defer is the "Later"
  action, not drag, so no reorder affordance in the rail. Rail sizing:
  **fixed width** (Peter) — rail rows are previews and the detail panel
  shows the full title; matches dside Focus's fixed team rail.
- **2026-07-14 · workshop:categorical-triage · queue card format** — cards
  carry text + status only; queue is priority-sorted (not status-grouped) →
  **one-line cards: title left (the focus), status trailing right**, composed
  from InteractiveCard + SpreadRow + StatusChip; rail 380px per the sizing
  rule (5–8-word title untruncated + pill + 1rem; longer titles WRAP, never
  truncate). Supersedes the earlier ActionList pick for this rail — the card
  canon (title-first) outranked the ActionListItem status-left look.
- **2026-07-14 · workshop:categorical-triage · counts rail** — categorized
  column ordered by actionability: blocked·person (children) →
  blocked·snooze (children) → blocked·dependency (count) → claimed
  non-terminal (count); eligible removed from the rail (it's the queue);
  composed TightStack + SpreadRow + CountChip.
