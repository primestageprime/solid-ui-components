// ============================================
// createHotkeyScope / useHotkeys — a hotkey TABLE on the hotkey registry.
// The registry's one capture-phase `keydown` listener on the window dispatches
// a whole table of { action, keys, scope } entries to a record of handlers. The decisions —
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
  activeEntries,
  dispatchHotkey,
  type ChordState,
  type HotkeyEntry,
  type HotkeyScope,
} from "./hotkeyDispatch";
import { registerHotkey } from "./hotkeys/hotkeyRegistry";

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

/** The old private listener, kept for a caller that passes its own `target`. */
function listenOn<S extends string>(
  opts: HotkeyScopeOptions<S>,
  target: Pick<Window, "addEventListener" | "removeEventListener">,
): () => void {
  let state: ChordState = IDLE_CHORD;
  const onKey = (e: Event) => {
    const ke = e as KeyboardEvent;
    const outcome = dispatchHotkey<S>({
      table: opts.table.map((entry) => ({ repeats: true, ...entry })),
      scopes: opts.scopes(),
      press: {
        key: ke.key,
        metaKey: ke.metaKey,
        ctrlKey: ke.ctrlKey,
        altKey: ke.altKey,
        isComposing: ke.isComposing,
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
    if (outcome.kind !== "fire") return;
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

/**
 * Start listening. Returns the function that stops it. A no-op on the server.
 *
 * A thin wrapper over the hotkey registry (hooks/hotkeys): each table entry
 * is one claim, live while its scope is active and its handler exists. The
 * keys match EXACTLY, as before. The claims ignore Modal layers (the table
 * holds its own "modal" scope). With `target`, the table keeps a listener of
 * its own on that target instead.
 */
export function createHotkeyScope<S extends string = HotkeyScope>(
  opts: HotkeyScopeOptions<S>,
): () => void {
  if (opts.target) return listenOn(opts, opts.target);
  const modal = "modal" as S;
  const offs = opts.table.map((entry) =>
    registerHotkey({
      keys: [entry.keys],
      match: "exact",
      layer: "any",
      rank: entry.scope === modal ? "modal" : "page",
      stopPropagation: entry.scope === modal,
      repeats: !opts.once,
      chordWindowMs: opts.chordWindowMs,
      enabled: () =>
        typeof opts.handlers[entry.action] === "function" &&
        activeEntries(opts.table, opts.scopes(), modal).includes(entry),
      run: () => opts.handlers[entry.action]?.(),
    }),
  );
  return () => {
    for (const off of offs) off();
  };
}

/** `createHotkeyScope` for a component: listens now, stops when the owner is disposed. */
export function useHotkeys<S extends string = HotkeyScope>(
  opts: HotkeyScopeOptions<S>,
): void {
  onCleanup(createHotkeyScope(opts));
}
