// listDetail — the config-driven, headless list-and-detail kit. Exported from the package's
// /unstable entry only (never the root barrel). See README.md.
export { defineListDetail } from "./defineListDetail";
export type {
  ListDetail,
  ListDetailConfig,
  ListDetailData,
  ListDetailState,
  ListDetailView,
  UndoEntry,
} from "./defineListDetail";
export {
  LAYER,
  groupedList,
  live,
  neighbourAfterRemove,
  neighbourId,
  newId,
  nextInCycle,
  toggled,
  unwindLayer,
  visibleIds,
} from "./listkit";
export type {
  EntityBase,
  Group,
  Layer,
  ListSpec,
  ListView,
} from "./listkit";
export { editKey, focusById, isTyping, watchFocus } from "./focus";
export type { WatchFocusOptions } from "./focus";
export {
  LIST_DETAIL_ACTION_OF,
  LIST_DETAIL_CONFIGURED_ROWS,
  LIST_DETAIL_MODAL_ROWS,
  LIST_DETAIL_VERBS,
} from "./verbs";
export type { ListDetailRow, ListDetailScope, ListDetailVerb } from "./verbs";
export { GroupedSelector } from "./GroupedSelector";
export type { GroupedSelectorKit, GroupedSelectorProps } from "./GroupedSelector";
export { LogLineList } from "./LogLineList";
export type { LogLineListProps } from "./LogLineList";
export { LocalizationSettings, SharingSettings } from "./settingsTabs";
export type { LocalizationSettingsProps, SharingSettingsProps } from "./settingsTabs";
export {
  LOCALES,
  VISIBILITIES,
  localizationState,
  setLocalization,
  setSharing,
  sharingState,
} from "./settingsState";
export type { LocalizationState, SharingState } from "./settingsState";
