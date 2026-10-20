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
- **Pure parts** (`groupedList`, `visibleIds`, `neighbourId`, `neighbourAfterRemove`, `nextInCycle`, `toggled`,
  `unwindLayer`) and DOM parts (`watchFocus`, `focusById`, `editKey`, `isTyping`) are exported separately.

## Components that render the kit (gen12)

These are root exports (SSR-safe), not `/unstable`: `/unstable` stays JSX-free so a store that imports the kit loads under Node.

- `GroupedSelector` — `<GroupedSelector kit={kit} renderItem={(item, { selected }) => <Card .../>} emptyLabel="..." />` draws `kit.grouped()` as a rail: group header (title from `groups.title`, count chip, collapse through `actions.toggleGroup`), items by `renderItem`, the selected item marked (`aria-selected`, accent bar) and scrolled into view as `j`/`k` move it, click or Enter selects. A `Group` is `{ id, title, count, collapsed, items }`.
- `LogLineList` — `<LogLineList rows timeOf={(r) => r.at} textOf={(r) => r.msg} title? emptyLabel? wrap? />`: a fixed time column and a truncating (or wrapping) text column for a narrow panel, empty state, optional `selectedId`/`onSelect`.
- `LocalizationSettings`, `SharingSettings` — the bodies of the two generic settings tabs (stub models persisted in SUI; read `localizationState()` / `sharingState()` in your `dump()`; or pass `value` + `onChange`).
- Layout: `<ListDetailThreePanel rightWidth="wide" />`: the three-panel with a right panel wide enough for a time + text table (`ListDetailLogThreePanel` is deprecated). `BaseTable`/`SectionTable` take `selectedId` + `onSelect` (+ `rowId`) for a selected row, distinct from hover `highlighted`.
