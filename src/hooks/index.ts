export { useMediaQuery } from "./useMediaQuery";
export { useContainerNarrow } from "./useContainerNarrow";
export { createTruncationObserver } from "./createTruncationObserver";
// Headless drag-and-drop reorder hook (placeholder-drop-target pattern). Shared
// by DnDHierarchySortBar (axis "x") and SortableList (axis "y"); lives here in
// the neutral hooks home so neither component imports from the other's folder.
export {
  createDnDReorder,
  previewOrder,
  hitTestInsertPos,
  isAfterMidpoint,
  pointerToInsertIndex,
} from "./createDnDReorder";
export type {
  CreateDnDReorderOptions,
  DnDReorder,
  DnDReorderAxis,
  DnDItemHandlers,
  DnDContainerHandlers,
  AxisRect,
  DragSize,
} from "./createDnDReorder";
// An axis ceiling that rises with the data and falls only on reset — the fix
// for a y-axis that jitters as values are edited.
export {
  createHighWaterMark,
  nextHighWater,
  stepHighWater,
  isHighWaterSettled,
} from "./createHighWaterMark";
export type {
  HighWaterMark,
  HighWaterMarkOptions,
} from "./createHighWaterMark";
// The held y-DOMAIN built on it: ceiling AND floor, expand at once, shrink
// only on reset — plus its pure step and headless observation.
export {
  createAxisWaterMarks,
  createHeldFit,
  heldDomainOf,
  holdFitDomain,
  NO_HELD_DOMAIN,
  observeAxisWaterMarks,
} from "./createAxisWaterMarks";
export type {
  AxisWaterMarks,
  FitDomain,
  HeldDomain,
  HeldFit,
  WaterMarkFrame,
  WaterMarkRow,
} from "./createAxisWaterMarks";
// The y-axis STRATEGY over those marks: ChartFrame's split button, as a pure
// step (auto / autoscale / fixed), its reactive wrapper, the lock check, and
// the headless observation.
export {
  AXIS_WATER_MARK_HOLD,
  INITIAL_Y_AXIS,
  checkLock,
  createYAxisStrategy,
  displayedDomain,
  formatYAxisRows,
  observeYAxis,
  stepYAxis,
} from "./createYAxisStrategy";
export type {
  YAxisDomain,
  YAxisEvent,
  YAxisFrame,
  YAxisHoldStep,
  YAxisIntent,
  YAxisLockCheck,
  YAxisLockError,
  YAxisMode,
  YAxisRow,
  YAxisState,
  YAxisStep,
  YAxisStrategy,
} from "./createYAxisStrategy";
// Keyboard shortcuts from a table of { action, keys, scope }: one capture-phase
// window listener (`useHotkeys` / `createHotkeyScope`) around a pure dispatcher
// (`dispatchHotkey`) that ignores editable targets, lets a modal scope block the
// rest, and reads chords like "g t". `traceHotkeys` prints a key sequence as a table.
export {
  createHotkeyScope,
  useHotkeys,
} from "./createHotkeyScope";
export type { HotkeyScopeOptions } from "./createHotkeyScope";
export {
  DEFAULT_CHORD_WINDOW_MS,
  IDLE_CHORD,
  activeEntries,
  dispatchHotkey,
  traceHotkeys,
} from "./hotkeyDispatch";
export type {
  ChordState,
  DispatchInput,
  HotkeyEntry,
  HotkeyRank,
  HotkeyOutcome,
  HotkeyScope,
  TracePress,
  TraceRow,
} from "./hotkeyDispatch";
// The ONE hotkey registry (#53325): every Button `hotkeys`, every `useHotkey`,
// every Modal's Escape and every `createHotkeyScope` table is a claim on one
// capture-phase window listener, on `globalThis`. Modal layers, ranks
// (modal > step > page), DOM order for ties, and the key guard.
export {
  HotkeyLayerContext,
  useHotkey,
  useHotkeyLayer,
} from "./hotkeys/useHotkey";
export type { UseHotkeyOptions } from "./hotkeys/useHotkey";
export {
  activeHotkeyLayer,
  allocateHotkeyLayer,
  openHotkeyLayer,
  registerHotkey,
} from "./hotkeys/hotkeyRegistry";
export type { HotkeyClaim } from "./hotkeys/hotkeyRegistry";
export { hotkeyGuard } from "./hotkeys/hotkeyGuard";
export type { HotkeyGuard } from "./hotkeys/hotkeyGuard";
export {
  ariaKeyShortcut,
  isMacPlatform,
  isReservedKey,
  keyGlyph,
  parseKey,
  stepMatches,
} from "./hotkeys/hotkeyKeys";
export type { KeyMatchMode, KeyStep } from "./hotkeys/hotkeyKeys";
// A click that sends work once: pending (spinner + disabled) while the work
// runs, and optionally spent after it. Button's `action` prop reads it.
export { createSubmitAction, nextPaint } from "./createSubmitAction";
export type {
  SubmitAction,
  SubmitActionOptions,
  SubmitWork,
} from "./createSubmitAction";
// Enter in a one-line field submits its form: the keydown and submit handlers
// behind `Modal`'s `onSubmit`, for a plain `<form>` too.
export {
  explicitSubmitterOf,
  isSubmitEnter,
  submitHandler,
  submitOnEnter,
} from "./submitOnEnter";
// An opened form puts focus in its first field, and gives it back to the
// opener on close: what `Modal` and `BottomSheet` do on open.
export { focusOnOpen, initialFocusTarget } from "./initialFocus";
