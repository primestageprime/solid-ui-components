// ============================================
// createHotkeyScope / useHotkeys — the window wiring around `dispatchHotkey`.
// One capture-phase `keydown` listener on the window dispatches a whole table
// of { action, keys, scope } entries to a record of handlers. The decisions —
// editable targets, modal blocking lower scopes, chords with a prefix key —
// are all in the pure `dispatchHotkey`; this file only feeds it events and
// acts on the outcome (preventDefault, stopPropagation, call the handler).
//
// Capture phase on purpose: it runs before a modal library closes itself on
// Escape, so the scope is still "modal" when the key arrives and the key
// cannot fall through to a list underneath.
//
//   useHotkeys({
//     table: HOTKEYS,
//     handlers: { new: addTask, next: selectNext, closeModal: closeAll },
//     scopes: () => (anyModalOpen() ? ["modal"] : ["global", "list", "detail"]),
//   });
// ============================================
import { onCleanup } from "solid-js";
import {
  DEFAULT_CHORD_WINDOW_MS,
  IDLE_CHORD,
  dispatchHotkey,
  type ChordState,
  type HotkeyEntry,
  type HotkeyScope,
} from "./hotkeyDispatch";

export interface HotkeyScopeOptions<S extends string = HotkeyScope> {
  /** Every binding: action, keys, scope. */
  table: ReadonlyArray<HotkeyEntry<S>>;
  /** action name (from the table) to callback. Read at key time, so it may change. */
  handlers: Record<string, () => void>;
  /** Scopes active right now. Read at key time. "modal" among them blocks the rest. */
  scopes: () => ReadonlyArray<S>;
  /** How long to wait for the second key of a chord. Default 1500. */
  chordWindowMs?: number;
  /**
   * True: a held key fires once. The auto-repeats (`KeyboardEvent.repeat`) of a
   * key that would run a handler run nothing but are still cancelled, so the
   * browser does not act on them. Default false: a held key repeats.
   */
  once?: boolean;
  /** Where to listen. Default: the window. */
  target?: Pick<Window, "addEventListener" | "removeEventListener">;
}

/** Start listening. Returns the function that stops it. A no-op on the server. */
export function createHotkeyScope<S extends string = HotkeyScope>(
  opts: HotkeyScopeOptions<S>,
): () => void {
  const target = opts.target ?? (typeof window === "undefined" ? undefined : window);
  if (!target) return () => {};

  let state: ChordState = IDLE_CHORD;
  const onKey = (e: Event) => {
    const ke = e as KeyboardEvent;
    const outcome = dispatchHotkey<S>({
      table: opts.table,
      scopes: opts.scopes(),
      press: {
        key: ke.key,
        metaKey: ke.metaKey,
        ctrlKey: ke.ctrlKey,
        altKey: ke.altKey,
        target: ke.target,
      },
      state,
      now: Date.now(),
      chordWindowMs: opts.chordWindowMs ?? DEFAULT_CHORD_WINDOW_MS,
      isHandled: (action) => typeof opts.handlers[action] === "function",
    });
    state = outcome.state;
    if (outcome.kind === "ignored") return;
    ke.preventDefault();
    if (outcome.kind === "chord") return;
    // A handled modal key must not reach other window listeners (a list clearing
    // its selection on Escape).
    if (outcome.stopPropagation) ke.stopPropagation();
    if (opts.once && ke.repeat) return;
    opts.handlers[outcome.entry.action]?.();
  };

  target.addEventListener("keydown", onKey, true);
  return () => {
    target.removeEventListener("keydown", onKey, true);
    state = IDLE_CHORD;
  };
}

/** `createHotkeyScope` for a component: listens now, stops when the owner is disposed. */
export function useHotkeys<S extends string = HotkeyScope>(
  opts: HotkeyScopeOptions<S>,
): void {
  onCleanup(createHotkeyScope(opts));
}
