// ============================================
// hotkeyDispatch — the PURE decision function of every SUI hotkey.
// Given a table of { action, keys, scope } entries, the scopes that are active
// right now, the chord state and one key press, it says what that press does.
// No DOM, no timers, no Solid: the clock is a number the caller passes in, so
// a test (or a showcase) can drive a whole key sequence and print the outcome
// of every press as a table (`traceHotkeys`). The hotkey registry
// (hooks/hotkeys/hotkeyRegistry) and `createHotkeyScope` feed it events.
//
// The rules, in the order they apply to a press:
//   1. An IME composition is in progress: ignored.
//   2. THE KEY GUARD (`hotkeyGuard`): a text field keeps every key, and a
//      focused control keeps its own key (Enter on a button). Ignored, unless
//      the entry says `inFields` (a Modal's Escape) and the target is a field.
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
// RANKS: when more than one entry matches, the highest `rank` wins (modal >
// step > page; an entry with no rank is "page"). A tie on the same rank goes
// to the lowest `order` (the registry passes DOM order), and the outcome
// names the losers in `rivals` so the caller can warn.
//
// REPEAT: an auto-repeat of a key that would fire is `repeat`: cancelled, and
// nothing runs — unless the entry says `repeats`.
//
// `keys` is a space-separated chord of steps — "n", "?", "Escape", "Mod+z",
// "g t" (see hotkeyKeys). An entry with `match: "exact"` (the default for a
// table without ranks, as before) compares `KeyboardEvent.key` exactly, case
// and all, with no ⌘ / Ctrl / Alt held. `match: "keys"` is the registry's
// rule: Shift ignored for a bare printable key, modifiers exact otherwise,
// and the `e.code` fallback for a non-ASCII `e.key`.
// ============================================
import { hotkeyGuard, type HotkeyPress } from "./hotkeys/hotkeyGuard";
import {
  isMacPlatform,
  parseKey,
  stepMatches,
  stepName,
  type KeyMatchMode,
  type KeyStep,
} from "./hotkeys/hotkeyKeys";
import { filter, map } from "../fn";

/** The scopes the canon names. A table may use its own strings instead. */
export type HotkeyScope = "global" | "list" | "detail" | "modal";

/** Who wins a key when two claim it: modal > step > page. */
export type HotkeyRank = "modal" | "step" | "page";

const RANK_WEIGHT: Readonly<Record<HotkeyRank, number>> = { modal: 3, step: 2, page: 1 };

/** One row of a hotkey table: the action, the keys that fire it, where it applies. */
export interface HotkeyEntry<S extends string = HotkeyScope> {
  /** The handler name in `handlers`. */
  action: string;
  /** The canon verb this binding is the reserved key for, if any (documentation only). */
  verb?: string;
  /** One key ("n", "Escape", "Mod+z") or a chord ("g t"), steps joined by a space. */
  keys: string;
  /** Applies only while this scope is active. "modal" outranks every other scope. */
  scope: S;
  /** Who wins a tie of keys. Default "page". */
  rank?: HotkeyRank;
  /** Breaks a tie on the same rank: the lower order wins. Default: the table index. */
  order?: number;
  /** How the keys are compared. Default "exact". */
  match?: KeyMatchMode;
  /** An auto-repeat fires it again. Default false: a held key fires once. */
  repeats?: boolean;
  /** Fires even when a text field has focus (a Modal's Escape). Default false. */
  inFields?: boolean;
  /** How long a chord starting with this entry waits. Default: the input's. */
  chordWindowMs?: number;
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
  /** An auto-repeat of a key that fires: swallow it (preventDefault), run nothing. */
  | { kind: "repeat"; entry: HotkeyEntry<S>; state: ChordState }
  /**
   * Run the entry's handler. `stopPropagation` is true for modal entries.
   * `rivals`: the actions of the other entries on the same key and rank,
   * which lost on `order`.
   */
  | {
      kind: "fire";
      entry: HotkeyEntry<S>;
      stopPropagation: boolean;
      rivals: string[];
      state: ChordState;
    };

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
  /** What `Mod` is: ⌘ when true, Ctrl when false. Default: the platform's. */
  mac?: boolean;
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

/** An entry with its steps parsed and its tie-break order fixed. */
interface Parsed<S extends string> {
  entry: HotkeyEntry<S>;
  steps: KeyStep[];
  weight: number;
  order: number;
}

/** Best first: the highest rank, then the lowest order. */
const byPriority = <S extends string>(a: Parsed<S>, b: Parsed<S>): number =>
  b.weight - a.weight || a.order - b.order;

/** What a key press does. Pure: the same input always gives the same outcome. */
export function dispatchHotkey<S extends string = HotkeyScope>(
  input: DispatchInput<S>,
): HotkeyOutcome<S> {
  const { press, state, now, table, scopes } = input;
  const windowMs = input.chordWindowMs ?? DEFAULT_CHORD_WINDOW_MS;
  const handled = input.isHandled ?? (() => true);
  const modal = input.modalScope ?? ("modal" as S);
  const mac = input.mac ?? isMacPlatform();

  // Rules 1 and 2. An ignored press keeps the chord state: typing in a field
  // does not break a chord in progress.
  if (press.isComposing) return { kind: "ignored", state };
  const guard = hotkeyGuard(press.target, press.key);
  if (guard === "owns-key") return { kind: "ignored", state };
  const inField = guard === "editable";

  const active: Parsed<S>[] = activeEntries(table, scopes, modal)
    .map((entry, index) => ({
      entry,
      steps: parseKey(entry.keys),
      weight: RANK_WEIGHT[entry.rank ?? "page"],
      order: entry.order ?? index,
    }))
    .filter((p) => handled(p.entry.action) && (!inField || p.entry.inFields));
  if (inField && active.length === 0) return { kind: "ignored", state };

  const matches = (step: KeyStep | undefined, p: Parsed<S>): boolean =>
    step !== undefined && stepMatches(step, press, mac, p.entry.match ?? "exact");

  const fire = (hits: Parsed<S>[]): HotkeyOutcome<S> | null => {
    const [best, ...rest] = [...hits].sort(byPriority);
    if (!best) return null;
    if (press.repeat && !best.entry.repeats) {
      return { kind: "repeat", entry: best.entry, state: IDLE_CHORD };
    }
    const rivals = rest.filter((r) => r.weight === best.weight).map((r) => r.entry.action);
    return {
      kind: "fire",
      entry: best.entry,
      stopPropagation: best.entry.scope === modal || best.entry.rank === "modal",
      rivals,
      state: IDLE_CHORD,
    };
  };

  // Rule 4: the second key of a chord. The wait ends whether or not it completes.
  const pending = state.prefix !== null && now <= state.expiresAt ? state.prefix : null;
  if (pending !== null) {
    const hit = fire(
      active.filter(
        (p) => p.steps.length === 2 && stepName(p.steps[0]) === pending && matches(p.steps[1], p),
      ),
    );
    if (hit) return hit;
  }

  // Rule 5: a single key.
  const single = fire(active.filter((p) => p.steps.length === 1 && matches(p.steps[0], p)));
  if (single) return single;

  // Rule 6: the first key of a chord.
  const starts = active.filter((p) => p.steps.length === 2 && matches(p.steps[0], p));
  if (starts.length > 0) {
    const first = [...starts].sort(byPriority)[0];
    const prefix = stepName(first.steps[0]);
    const wait = first.entry.chordWindowMs ?? windowMs;
    return { kind: "chord", prefix, state: { prefix, expiresAt: now + wait } };
  }

  return { kind: "ignored", state: inField ? state : IDLE_CHORD };
}

/** One key press in a trace: the key, when it arrived, and what is under focus. */
export interface TracePress {
  key: string;
  /** ms on the trace's own clock. Default: 100 ms after the previous press. */
  at?: number;
  meta?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  /** `KeyboardEvent.code`, for the non-ASCII fallback. */
  code?: string;
  /** An auto-repeat of a held key. */
  repeat?: boolean;
  /** An IME composition is in progress. */
  composing?: boolean;
  /** Pretend focus is in a text field. */
  editable?: boolean;
  /** The focused element, when the case needs a real one (a button, a checkbox). */
  target?: EventTarget | null;
}

/** A trace row: a press and what came of it. */
export interface TraceRow {
  key: string;
  at: number;
  /** "fire", "chord", "repeat" or "ignored". */
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
  options: { chordWindowMs?: number; isHandled?: (action: string) => boolean; mac?: boolean } = {},
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
        shiftKey: !!p.shift,
        code: p.code,
        repeat: !!p.repeat,
        isComposing: !!p.composing,
        target: p.target !== undefined ? p.target : p.editable ? editable : null,
      },
      state,
      now: clock,
      chordWindowMs: options.chordWindowMs,
      isHandled: options.isHandled,
      mac: options.mac ?? false,
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
