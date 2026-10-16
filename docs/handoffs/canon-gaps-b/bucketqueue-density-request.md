# Request to BucketQueue's owner: a canon density for the task rail

**From:** the Taskmaster canon, 2026-10-15 (`singularity/docs/design/taskmaster-canon.html`, component 3
"Group header with count" and component 4 "Task card").
**Consumer:** the Taskmaster touchstone's task rail
(`singularity/personae/ui-builder/tasklist/touchstone`, `src/components/TaskSidebar.tsx`).
**Decision (Peter, 2026-10-16):** the rail uses `BucketQueue`. No new grouped-list component is built.
The canon's deltas come to `BucketQueue` as a density or curried variant.

## How the rail maps today

- Each canon group (History, Recent, Doing, Todo) is a `Bucket` with `collapsible: true`.
- History and Recent start shut with `collapsedByDefault: true`.
- `bucketOf(task) = task.group`, `keyOf(task) = task.id`, and `selectedKey` + `onSelect` carry selection.
- `renderItem` draws the card body: `EllipsizedTitle` over `SlotFillBar`.

## What the canon needs that BucketQueue does not draw

| # | Canon | BucketQueue today |
|---|---|---|
| 1 | Buckets flush, separated by a 1px divider | Bordered, rounded buckets with a gap between them (4px in compact) |
| 2 | Header count is a `CountChip` at the right | A plain count span |
| 3 | Selected row has a 4px left bar | A 2px inset accent bar |
| 4 | Header row is 28px: chevron, uppercase label, count | Header height set by the density |
| 5 | A collapsed bucket shows its full count with no items loaded (History: 2,594) | The count is the number of items handed to the bucket |

Items 1 to 4 are visual and fit a density value or a curried variant (for example `RailBucketQueue`).

Item 5 is a data gap. Without it, the touchstone must load all 2,594 History tasks just to print the
number. One shape for it is an optional `count?: number` on `Bucket`, shown in place of the derived
count when present. Omitted, nothing changes.

All five are additive. Item 5 is a new prop on a Primitive, so it needs Peter's sign-off under the
expansion gate.
