// Base (DirtyComboBox) is intentionally NOT exported — use the curried
// variants (or createDirtyComboBox for a new screen's vocabulary). Every name is
// qualified with the component's, because src/index.ts is `export *` over
// every barrel and an ambiguous name resolves to nothing.
export { createDirtyComboBox } from "./DirtyComboBox";
export type {
  DirtyComboBoxProps,
  DirtyComboBoxLabels,
  DirtyComboBoxOverrides,
  DirtyComboBoxDataProps,
} from "./DirtyComboBox";
export * from "./variants";
export {
  dirtyComboModel,
  dirtyComboEqual,
  dirtyComboWidthCh,
  dirtyComboViewOf,
  dirtyComboSelect,
  dirtyComboSave,
  dirtyComboReset,
  dirtyComboRemove,
  DIRTY_COMBO_MAX_WIDTH_CH,
  DIRTY_COMBO_MIN_WIDTH_CH,
} from "./dirtyComboModel";
export type {
  DirtyComboItem,
  DirtyComboView,
  DirtyComboStore,
  DirtyComboSavedItem,
} from "./dirtyComboModel";
