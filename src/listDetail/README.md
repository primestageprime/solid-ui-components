# listDetail — config-driven list-and-detail kit (`/unstable`)

Headless. Structure is shared, content is configuration: no app nouns live here.
Ported from the singularity scaffold's list-detail library (gen10).

```ts
import { defineListDetail, newId } from "@primestageprime/solid-ui-components/unstable";

export const kit = defineListDetail({
  storageKey: "app.v1",
  collection: "items",                      // key under state.data
  entity: { blank: () => ({ id: newId(), ... }), textOf: (e) => e.title },
  groups: { order: ["a", "b"] as const, of: (e) => e.group },
  sorts: { order: ["added", "title"] as const, default: "added", by: { ... } },
  seed: SEED,
  undoers: { myOp: (entry, kit) => kit.actions.update(entry.id, { ... }) },
  extra: { data: { ... }, view: { ... } },  // app-owned persisted fields
  modalOpen: () => modal() !== null,        // Escape closes an app dialog first (+ closeModal)
  open: (item, kit) => ...,                 // Enter row
  primary: (item, kit) => ...,              // c row
});
export const { state, actions } = kit;
export const dump = () => JSON.stringify({ ...kit.dumpObject(), chrome: { ...(kit.dumpObject().chrome as object), modal: modal() } });
```

- **Returns**: `state`, `setState`, `actions`, `ui` (`editing`, `searchFocused`), `grouped()`, `visibleIds()`,
  `live()`, `verbs` (ten standard HOTKEYS rows), `handlers`, `install()`, `dumpObject()`, `dump()`.
- **Stays in the app**: entity fields, groups and sorts, seed, domain ops (record an `op` and register its `undoers`),
  rendering, the modal signal. Enter (`open`) and `c` (`primary`) rows appear when the config supplies those functions; `?` and `,` rows are always served, with `ui.helpOpen` / `ui.settingsOpen` flags (in the dump's `chrome`) that Escape closes first.
- **Canon**: name is `define*` because canon C11 rejects `create*` factories imported from SUI. C04b parses a *literal*
  `handlers: { ... }` in the `useHotkeys` call, so a canon app writes the handler block out (`kit.handlers` serves tests
  and non-canon apps; the test suite proves every verb row reaches a real action). Call `kit.install()` once at boot.
- **Undo owns its snapshots (gen14)**: `record` deep-copies the entry it is given, and `primary()` snapshots the selected entity before the configured verb runs; when the verb records no step of its own, the kit records one (`op: "primary"`) that `undo` restores whole. A domain verb just changes the entity (`kit.actions.update`): it never copies arrays for undo, and cannot alias the live store.
- **`ListItem`** = `EntityBase & { title: string }`: the entity shape for apps whose rail, search and cards read `title` (`EntityBase` itself stays `{ id, deleted? }`). `weekStart(date, firstDay = 1)` (also `fn.weekStart`) gives the first instant of the local week for "this week vs earlier" groups.
- **Pure parts** (`groupedList`, `visibleIds`, `neighbourId`, `neighbourAfterRemove`, `nextInCycle`, `toggled`,
  `unwindLayer`) and DOM parts (`watchFocus`, `focusById`, `editKey`, `isTyping`) are exported separately.

## Components that render the kit (gen12)

These are root exports (SSR-safe), not `/unstable`: `/unstable` stays JSX-free so a store that imports the kit loads under Node.

- `GroupedSelector` — `<GroupedSelector kit={kit} renderItem={(item, { selected }) => <Card .../>} emptyLabel="..." />` draws `kit.grouped()` as a rail: group header (title from `groups.title`, count chip, collapse through `actions.toggleGroup`), items by `renderItem`, the selected item marked (`aria-selected`, accent bar) and scrolled into view as `j`/`k` move it, click or Enter selects. A `Group` is `{ id, title, count, collapsed, items }`.
- `LogLineList` — `<LogLineList rows timeOf={(r) => r.at} textOf={(r) => r.msg} title? emptyLabel? wrap? />`: a fixed time column and a truncating (or wrapping) text column for a narrow panel, empty state, optional `selectedId`/`onSelect`.
- `LocalizationSettings`, `SharingSettings` — the bodies of the two generic settings tabs (stub models persisted in SUI; read `localizationState()` / `sharingState()` in your `dump()`; or pass `value` + `onChange`).
- Layout: `<ListDetailThreePanel rightWidth="wide" />`: the three-panel with a right panel wide enough for a time + text table (`ListDetailLogThreePanel` is deprecated). `BaseTable`/`SectionTable` take `selectedId` + `onSelect` (+ `rowId`) for a selected row, distinct from hover `highlighted`.

## Views as configuration (gen15)

The panels are data. `defineCard` / `defineDetail` / `defineSide` (and `tableSection`) type a config; the root components `ConfiguredCard` (`item` + config), `ConfiguredDetail` and `ConfiguredLog` (`kit` + config) draw it. `defineChildren({ key, focus?, status, lines, onComplete? })` is the pure progression of an item's ordered children: `child`, `kindOf`, `progress`, `activityAt`, `pick`, `select`, `cycle`, `advance`; `pickBucket(item, buckets)` (alias `bucketOf`, deprecated: the root exports a different `bucketOf`) picks a group from app-supplied `{ id, when }` buckets. An escape hatch is the plain components underneath (`StatusCard`, `SectionTable`, `LogLineList`).
