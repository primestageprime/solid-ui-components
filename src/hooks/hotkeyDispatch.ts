// ============================================
// hotkeyDispatch — the PURE half of createHotkeyScope (src/hooks).
// Given a table of { action, keys, scope } entries, the scopes that are active
// right now, the chord state and one key press, it says what that press does.
// No DOM, no timers, no Solid: the clock is a number the caller passes in, so
// a test (or a showcase) can drive a whole key sequence and print the outcome
// of every press as a table (`traceHotkeys`). `createHotkeyScope` is the window
// wiring around it.
//
// The rules, in the order they apply to a press:
//   1. ⌘ / Ctrl / Alt held: not ours (browser and OS chords). Ignored.
//   2. A text-editing surface has focus (`isEditableTarget`): ignored.
//   3. MODAL BLOCKS LOWER SCOPES: if "modal" is among the active scopes, only
//      "modal" entries are considered at all. A key bound in "list" does
//      nothing while a dialog is open.
//   4. A chord waiting for its second key (`g` ... `t`) and not yet expired:
//      if `"<prefix> <key>"` is bound, it fires. The wait always ends here.
//   5. A single-key entry bound to the key fires.
//   6. A chord entry that starts with the key (`g t` starts with `g`) swallows
//      the press and waits `chordWindowMs` for the second key.
//   7. Otherwise ignored; the browser keeps the key.
// An entry whose action has no handler (`isHandled` says no) is skipped, so
// the press falls through to the next rule instead of being swallowed.
//
// `keys` is a space-separated chord of `KeyboardEvent.key` values — "n", "?",
// "Escape", "g t". Matching is EXACT (case-sensitive), unlike HotkeyButton's.
// ============================================
import { isEditableTarget, type HotkeyPress } from "../components/HotkeyButton";
import { filter, find, map, some } from "../fn";

/** The scopes the canon names. A table may use its own strings instead. */
export type HotkeyScope = "global" | "list" | "detail" | "modal";

/** One row of a hotkey table: the action, the keys that fire it, where it applies. */
export interface HotkeyEntry<S extends string = HotkeyScope> {
  /** The handler name in `handlers`. */
  action: string;
  /** The canon verb this binding is the reserved key for, if any (documentation only). */
  verb?: string;
  /** One key ("n", "Escape") or a chord ("g t"), `KeyboardEvent.key` values joined by a space. */
  keys: string;
  /** Applies only while this scope is active. "modal" outranks every other scope. */
  scope: S;
}

/** A chord waiting for its second key. `expiresAt` is on the caller's clock. */
export interface ChordState {
  prefix: string | null;
  expiresAt: number;
}

/** No chord pending. */
export const IDLE_CHORD: ChordState = { prefix: null, expiresAt: 0 };

/** How long the second key of a chord is waited for. */
export const DEFAULT_CHORD_WINDOW_MS = 1500;

/** What one press does. `state` is the chord state to carry into the next press. */
export type HotkeyOutcome<S extends string = HotkeyScope> =
  /** Not ours: leave the event alone (no preventDefault). */
  | { kind: "ignored"; state: ChordState }
  /** First key of a chord: swallow it (preventDefault) and wait. */
  | { kind: "chord"; prefix: string; state: ChordState }
  /** Run the entry's handler. `stopPropagation` is true for modal entries. */
  | { kind: "fire"; entry: HotkeyEntry<S>; stopPropagation: boolean; state: ChordState };

export interface DispatchInput<S extends string = HotkeyScope> {
  table: ReadonlyArray<HotkeyEntry<S>>;
  /** Scopes active right now. */
  scopes: ReadonlyArray<S>;
  press: HotkeyPress;
  state: ChordState;
  /** The caller's clock, in ms. Only compared with `state.expiresAt`. */
  now: number;
  /** Default 1500. */
  chordWindowMs?: number;
  /** Whether `action` has a handler. Default: every action does. */
  isHandled?: (action: string) => boolean;
  /** The scope that blocks the rest. Default "modal". */
  modalScope?: S;
}

/** The entries that apply right now: all in the active scopes, or only the modal ones while one is open. */
export function activeEntries<S extends string = HotkeyScope>(
  table: ReadonlyArray<HotkeyEntry<S>>,
  scopes: ReadonlyArray<S>,
  modalScope: S = "modal" as S,
): HotkeyEntry<S>[] {
  const effective = scopes.includes(modalScope) ? [modalScope] : scopes;
  return filter((e) => effective.includes(e.scope), table);
}

/** What a key press does. Pure: the same input always gives the same outcome. */
export function dispatchHotkey<S extends string = HotkeyScope>(
  input: DispatchInput<S>,
): HotkeyOutcome<S> {
  const { press, state, now, table, scopes } = input;
  const windowMs = input.chordWindowMs ?? DEFAULT_CHORD_WINDOW_MS;
  const handled = input.isHandled ?? (() => true);
  const modal = input.modalScope ?? ("modal" as S);

  if (press.metaKey || press.ctrlKey || press.altKey) return { kind: "ignored", state };
  if (isEditableTarget(press.target)) return { kind: "ignored", state };

  const active = activeEntries(table, scopes, modal);
  const fire = (entry: HotkeyEntry<S> | undefined): HotkeyOutcome<S> | null =>
    entry && handled(entry.action)
      ? { kind: "fire", entry, stopPropagation: entry.scope === modal, state: IDLE_CHORD }
      : null;

  // Rule 4: the second key of a chord. The wait ends whether or not it completes.
  const pending = state.prefix !== null && now <= state.expiresAt ? state.prefix : null;
  if (pending !== null) {
    const hit = fire(find((e) => e.keys === `${pending} ${press.key}`, active));
    if (hit) return hit;
  }

  // Rule 5: a single key.
  const single = fire(find((e) => e.keys === press.key, active));
  if (single) return single;

  // Rule 6: the first key of a chord.
  if (some((e) => e.keys.startsWith(`${press.key} `) && handled(e.action), active)) {
    return {
      kind: "chord",
      prefix: press.key,
      state: { prefix: press.key, expiresAt: now + windowMs },
    };
  }

  return { kind: "ignored", state: IDLE_CHORD };
}

/** One key press in a trace: the key, when it arrived, and what is under focus. */
export interface TracePress {
  key: string;
  /** ms on the trace's own clock. Default: 100 ms after the previous press. */
  at?: number;
  meta?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  /** Pretend focus is in a text field. */
  editable?: boolean;
}

/** A trace row: a press and what came of it. */
export interface TraceRow {
  key: string;
  at: number;
  /** "fire", "chord" or "ignored". */
  outcome: HotkeyOutcome["kind"];
  /** The action fired, if any. */
  action: string;
  /** The chord prefix being waited on after this press, if any. */
  waiting: string;
}

/**
 * Drive a key sequence through `dispatchHotkey` and return one row per press —
 * the headless observation of the hotkey table. `scopes` may be a fixed list or
 * a function of the press index (a dialog opening mid-sequence).
 */
export function traceHotkeys<S extends string = HotkeyScope>(
  table: ReadonlyArray<HotkeyEntry<S>>,
  scopes: ReadonlyArray<S> | ((index: number) => ReadonlyArray<S>),
  presses: ReadonlyArray<TracePress | string>,
  options: { chordWindowMs?: number; isHandled?: (action: string) => boolean } = {},
): TraceRow[] {
  const editable = typeof document !== "undefined" ? document.createElement("input") : null;
  let state: ChordState = IDLE_CHORD;
  let clock = 0;
  return map((raw, index) => {
    const p: TracePress = typeof raw === "string" ? { key: raw } : raw;
    clock = p.at ?? (index === 0 ? 0 : clock + 100);
    const outcome = dispatchHotkey<S>({
      table,
      scopes: typeof scopes === "function" ? scopes(index) : scopes,
      press: {
        key: p.key,
        metaKey: !!p.meta,
        ctrlKey: !!p.ctrl,
        altKey: !!p.alt,
        target: p.editable ? editable : null,
      },
      state,
      now: clock,
      chordWindowMs: options.chordWindowMs,
      isHandled: options.isHandled,
    });
    state = outcome.state;
    return {
      key: p.key,
      at: clock,
      outcome: outcome.kind,
      action: outcome.kind === "fire" ? outcome.entry.action : "",
      waiting: state.prefix ?? "",
    };
  }, presses);
}
