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
  ListItem,
  ListSpec,
  ListView,
} from "./listkit";
// Also reachable as `fn.weekStart` from the root; re-exported here so a Node-loadable leaf module needs one import path.
export { weekStart } from "../fn/weekStart";
export { defineChildren } from "./children";
export type {
  ChildGroup,
  ChildKind,
  ChildLogLine,
  ChildParent,
  ChildShape,
  ChildrenConfig,
} from "./children";
export { defineCard, defineDetail, defineSide, tableSection } from "./views";
export type {
  CardConfig,
  DetailConfig,
  DetailSection,
  SideConfig,
  StatusMap,
  StatusVariant,
  TableSection,
} from "./views";
export { editKey, focusById, isTyping, watchFocus } from "./focus";
export type { WatchFocusOptions } from "./focus";
export {
  LIST_DETAIL_ACTION_OF,
  LIST_DETAIL_CONFIGURED_ROWS,
  LIST_DETAIL_MODAL_ROWS,
  LIST_DETAIL_VERBS,
} from "./verbs";
export type { ListDetailRow, ListDetailScope, ListDetailVerb } from "./verbs";
