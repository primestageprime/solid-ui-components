# BucketQueue against the Taskmaster canon: mapping and deltas

**From:** the Taskmaster canon, 2026-10-15 (`singularity/docs/design/taskmaster-canon.html`, component 3
"Group header with count" and component 4 "Task card").
**Consumer:** the Taskmaster touchstone's task rail
(`singularity/personae/ui-builder/tasklist/touchstone`, `src/components/TaskSidebar.tsx`).
**Decisions (Peter, 2026-10-16):**

- The rail uses `BucketQueue`. No new grouped-list component is built.
- There is no density variant for this. The default theme becomes denser, so `BucketQueue` and
  everything else land flush with 1px dividers by default. A separate agent takes that theme pass.

## How the rail maps today

- Each canon group (History, Recent, Doing, Todo) is a `Bucket` with `collapsible: true`.
- History and Recent start shut with `collapsedByDefault: true`.
- `bucketOf(task) = task.group`, `keyOf(task) = task.id`, and `selectedKey` + `onSelect` carry selection.
- `renderItem` draws the card body: `EllipsizedTitle` over `SlotFillBar`.

## Functional gap: a count with no items loaded

The canon shows History at 2,594 while it is collapsed. `BucketQueue` derives each bucket's count from
the items it is handed, so an empty bucket shows 0. Until this is fixed, the touchstone must load all
2,594 History tasks just to print the number.

One shape for the fix is an optional `count?: number` on `Bucket` (a `countOverride`), shown in place of
the derived count when present. Omitted, nothing changes. It is a new prop on a Primitive, so it needs
Peter's sign-off under the expansion gate. The theme pass does not cover it.

## Visual deltas, for the default-theme density pass

These are to be absorbed by the default-theme density pass (`feat/theme-density`, audit in progress),
not by a variant. Only the count override above remains a `BucketQueue` prop request needing sign-off.

| # | Canon | BucketQueue today |
|---|---|---|
| 1 | Buckets flush, separated by a 1px divider | Bordered, rounded buckets with a gap between them |
| 2 | Header count is a `CountChip` at the right | A plain count span |
| 3 | Selected row has a 4px left bar | A 2px inset accent bar |
| 4 | Header row is 28px: chevron, uppercase label, count | Header height set by the density |

Item 2 changes the header's markup as well as its look, so the theme pass may need a small
component change for it.
