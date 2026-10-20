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
  modalOpen: () => modal() !== null,        // Escape closes a dialog first
});
export const { state, actions } = kit;
export const dump = () => JSON.stringify({ ...kit.dumpObject(), chrome: { ...(kit.dumpObject().chrome as object), modal: modal() } });
```

- **Returns**: `state`, `setState`, `actions`, `ui` (`editing`, `searchFocused`), `grouped()`, `visibleIds()`,
  `live()`, `verbs` (ten standard HOTKEYS rows), `handlers`, `install()`, `dumpObject()`, `dump()`.
- **Stays in the app**: entity fields, groups and sorts, seed, domain ops (record an `op` and register its `undoers`),
  rendering, Enter/complete rows, the modal signal.
- **Canon**: name is `define*` because canon C11 rejects `create*` factories imported from SUI. C04b parses a *literal*
  `handlers: { ... }` in the `useHotkeys` call, so a canon app writes the handler block out (`kit.handlers` serves tests
  and non-canon apps; the test suite proves every verb row reaches a real action). Call `kit.install()` once at boot.
- **Pure parts** (`groupedList`, `visibleIds`, `neighbourId`, `neighbourAfterRemove`, `nextInCycle`, `toggled`,
  `unwindLayer`) and DOM parts (`watchFocus`, `focusById`, `editKey`, `isTyping`) are exported separately.
