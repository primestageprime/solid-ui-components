# GroupedBucketQueue

Composite (Depth 2) — a nested-header list over `BucketQueue`'s row model.

`BucketQueue` has exactly one level of always-present buckets. When a sidebar
needs to group by more than one facet at once — Direction → Category → Type,
region → team → owner — `GroupedBucketQueue` nests an arbitrarily deep
`groups` tree of `GroupNode`s instead, while keeping `BucketQueue`'s row
semantics identical: controlled selection, roving-tabindex keyboard
navigation, and triage-advance.

## Shape

A `GroupNode` is either:

- a **branch** — `{ key, label, children: GroupNode[] }`, a pure header with
  no items of its own; or
- a **leaf** — `{ key, label, bucketKey: string }`, where `bucketOf` routes
  items.

```tsx
import { GroupedBucketQueue, type GroupNode } from "solid-ui-components";

const GROUPS: GroupNode[] = [
  {
    key: "revenue",
    label: "Revenue",
    children: [
      {
        key: "revenue:license",
        label: "License",
        children: [
          { key: "revenue:license:monthly", label: "Monthly fixed", bucketKey: "rev-lic-monthly" },
          { key: "revenue:license:annual", label: "Annual fixed", bucketKey: "rev-lic-annual" },
        ],
      },
    ],
  },
];

<GroupedBucketQueue<ConfigRow>
  groups={GROUPS}
  items={rows()}
  bucketOf={(r) => r.bucketKey}
  keyOf={(r) => r.id}
  renderItem={(r) => <span>{r.name}</span>}
  selectedKey={selected()}
  onSelect={setSelected}
/>
```

Every node's header shows a **rolled-up count** — a branch's is the sum of
its descendants'. Every node is **collapsible by default**
(`collapsible: false` fixes it open; `collapsedByDefault: true` starts it
collapsed, but only until the user first toggles it — their choice then
sticks for the component's life, exactly like `BucketQueue`'s
`collapsedByDefault`). Collapsing a branch unmounts its descendants entirely,
the same rule `BucketQueue` applies to a collapsed bucket's rows.

## Reuse, not re-derivation

This component imports `../BucketQueue/keyboard` (`createRowKeyboard`) and
`../BucketQueue/selection` (`advanceSelection`) **directly by relative path**
rather than re-implementing roving-tabindex or triage-advance. `BucketQueue`'s
own public surface (`src/components/BucketQueue/index.ts`) is untouched — a
fix landing in either module benefits both components with no manual port.

- **Keyboard**: Up/Down/Home/End walk every *visible* interactive row,
  depth-first, across the whole tree, with no wrap. A row inside a collapsed
  leaf, or behind a collapsed ancestor branch, is excluded — the pure
  `flattenGroupHeaders` (`./groupTree.ts`) already prunes descent into a
  collapsed branch, so the component only has to filter on `!h.collapsed`.
- **Selection**: `selectedKey` / `onSelect`, controlled, identical contract to
  `BucketQueue`.
- **Triage-advance**: when the selected item's leaf `bucketOf` result changes
  (an external re-bucketing, not a user drag — this component has no
  transfer/motion seam), the selection advances to the next survivor in the
  *vacated* leaf's prior ordering, or clears if that leaf is now empty. Same
  `advanceSelection` function `BucketQueue`'s own transfer effect calls.
- **Select mode / per-row veto**: `checkedKeys` presence turns select mode on,
  scoped to leaves declaring `selectable: true` — `isCheckable` /
  `uncheckableReason` behave exactly as in `BucketQueue`.

## What this is NOT

No transfer *animation* (BucketQueue's water-fill sizing and FLIP motion have
no equivalent here — this is a plain vertical scrollable list, sized by its
parent, not a fixed-height progression bar) and no fixed depth (3 levels is
this doc's example, not a constraint — `groupTree.ts`'s pure functions recurse
to whatever depth the tree declares).

## Pure core

`./groupTree.ts` has no SolidJS, DOM, or reactivity — unit-testable in
isolation (`groupTree.test.ts`):

- `flattenGroupHeaders(tree, countForBucket, collapseOverrides)` — the
  depth-first, collapse-aware header list the component renders from.
- `countOf(node, countForBucket)` — a leaf's own count, or a branch's
  rolled-up sum.
- `collectLeafBucketKeys(tree)` — every leaf's `bucketKey`, in render order,
  for bucketing `items`.
- `toggleGroupCollapse(overrides, key, currentlyCollapsed)` — the user's
  toggle, as pure data.
- `leafNodesByKey(tree)` — lookup for leaf-only fields (`selectable`,
  `emptyLabel`) a flattened header doesn't carry.
