# Recent / Starred

Reusable "shortcut" state and UI for apps that have navigable items —
cases, customers, dashboards, workflows, anything with a stable id and
a label. Two lists:

- **Recent**: FIFO, newest-first, de-duped by id, capped at N (default 20).
- **Starred**: explicit toggle, no cap.

Both lists persist to localStorage. The components are pure renderers
that read from a store and call back with the picked item — the app
decides what navigation looks like.

## Pieces

| Export | Layer | Purpose |
|---|---|---|
| `createRecentStarredStore` | state | Backed by localStorage; provides `recent`, `starred` accessors + `pushRecent`, `toggleStar`, `isStarred`, `clearAll` |
| `StarToggle` | base component | 5-point star button next to a detail header; click flips `starred` |
| `RecentStarredSidebar` | base component | Two-section list with empty-states + click callback |

## Quick start

```tsx
import {
  createRecentStarredStore,
  StarToggle,
  RecentStarredSidebar,
} from "solid-ui-components";
import "solid-ui-components/index.css";

// Once per app — module-scoped, not inside a component.
const cases = createRecentStarredStore({
  storageKey: "myapp.cases",
  recentLimit: 20,
});

function CaseDetail(props: { id: string; rnum: number; tenantId: string }) {
  // Push to recent whenever the user lands on this case.
  createEffect(() => {
    cases.pushRecent({
      id: props.id,
      label: `R${props.rnum}`,
      meta: { tenant_id: props.tenantId },
    });
  });

  return (
    <div class="detail-header">
      <h2>R{props.rnum}</h2>
      <StarToggle
        store={cases}
        item={{ id: props.id, label: `R${props.rnum}`, meta: { tenant_id: props.tenantId } }}
      />
    </div>
  );
}

function NavigationSidebar() {
  return (
    <RecentStarredSidebar
      store={cases}
      onPick={(item) => navigateToCase(item.id, item.meta?.tenant_id as string)}
    />
  );
}
```

## API

### `createRecentStarredStore(opts)`

```ts
createRecentStarredStore({
  storageKey: string;          // localStorage key prefix; uses .recent + .starred
  recentLimit?: number;        // FIFO cap (default 20)
}): RecentStarredStore
```

Returns:

```ts
interface RecentStarredStore {
  recent:   Accessor<RecentStarredItem[]>;
  starred:  Accessor<RecentStarredItem[]>;
  pushRecent(item: RecentStarredItem): void;
  toggleStar(item: RecentStarredItem): void;
  isStarred(id: string): boolean;
  clearAll(): void;
}
```

### `RecentStarredItem`

```ts
type RecentStarredItem = {
  id: string;                                  // unique within the store
  label: string;                               // display string
  meta?: Record<string, unknown>;              // JSON-safe payload
};
```

`meta` round-trips through localStorage, so keep it small and serializable.
Typical use: stash the parent-id chain so `onPick` can navigate without
a fresh lookup.

### `<StarToggle>`

```tsx
<StarToggle store={store} item={item} ariaLabel={(starred) => ...} title="..." />
```

A 5-point SVG star that fills when `store.isStarred(item.id)` is true.
Click toggles. Stops propagation so it can sit inside a clickable parent
without triggering it.

### `<RecentStarredSidebar>`

```tsx
<RecentStarredSidebar
  store={store}
  onPick={(item) => void}
  starredTitle="Starred"
  recentTitle="Recent"
  starredEmpty={<span>No bookmarks yet.</span>}
  recentEmpty={<span>Nothing here yet.</span>}
  renderItem={(item) => <span>...</span>}   // optional per-row override
/>
```

Both sections render even when empty (with the configurable empty-state
copy) so the sidebar's height stays stable as state changes.

## Theming

Override `--sui-star-*` and `--sui-recent-*` CSS variables in your theme.
Component file lists all variables with their defaults.
