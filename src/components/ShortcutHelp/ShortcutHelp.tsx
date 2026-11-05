// ============================================
// ShortcutHelp — Composite (Depth 2)
// Tags: shows:list, does:hotkey, does:dismiss, role:overlay
// Owns ShortcutHelp.css (the fixed corner and the translucent scrim: geometry
// no layout variant expresses). Composes SmallGhostButton and Kbd.
// A `?` button at the bottom right of the screen (desktop only) that opens a
// translucent overlay listing the active shortcuts. The `?` key opens and
// closes it too; Escape or a click on the scrim closes it. While it is open
// it is the top hotkey layer, so page keys do not fire behind it.
//   <ShortcutHelp shortcuts={[{ keys: "d", label: "Delete" }, { keys: "Mod+s", label: "Save" }]} />
// ============================================
import {
  type Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import { Portal } from "solid-js/web";
import {
  allocateHotkeyLayer,
  openHotkeyLayer,
  registerHotkey,
} from "../../hooks/hotkeys/hotkeyRegistry";
import { useHotkey } from "../../hooks/hotkeys/useHotkey";
import {
  isLetterKey,
  isMacPlatform,
  keyGlyph,
} from "../../hooks/hotkeys/hotkeyKeys";
import { SmallGhostButton } from "../Button";
import { Kbd } from "../Kbd";
import "./ShortcutHelp.css";

export interface Shortcut {
  /** The key as the hotkey registry writes it: "d", "Enter", "Mod+s", "g t". */
  keys: string;
  /** What it does, in words ("Delete"). */
  label: string;
  /** An optional section heading. Rows of one group sit together, in order of first use. */
  group?: string;
}

export interface ShortcutHelpProps {
  shortcuts: readonly Shortcut[];
}

export interface ShortcutGroup {
  title: string | undefined;
  rows: Shortcut[];
}

/** Rows grouped by `group`, groups in the order they first appear. Pure. */
export const groupShortcuts = (shortcuts: readonly Shortcut[]): ShortcutGroup[] => {
  const byTitle = new Map<string | undefined, ShortcutGroup>();
  for (const s of shortcuts) {
    const group = byTitle.get(s.group) ?? { title: s.group, rows: [] };
    group.rows.push(s);
    byTitle.set(s.group, group);
  }
  return Array.from(byTitle.values());
};

export const ShortcutHelp: Component<ShortcutHelpProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  const mac = isMacPlatform();
  const groups = createMemo(() => groupShortcuts(props.shortcuts));
  const layer = allocateHotkeyLayer();

  // The `?` key toggles on the page.
  useHotkey({ keys: ["?"], run: () => setOpen(true) });

  // While open: the top hotkey layer, so Escape and `?` close it and page keys
  // are blocked behind it.
  createEffect(() => {
    if (!open()) return;
    const closeLayer = openHotkeyLayer(layer);
    const off = registerHotkey({
      keys: ["Escape", "?"],
      rank: "modal",
      layer,
      inFields: true,
      run: () => setOpen(false),
    });
    onCleanup(() => {
      off();
      closeLayer();
    });
  });

  return (
    <>
      <SmallGhostButton
        class="sui-shortcut-help__trigger"
        aria-label="Keyboard shortcuts"
        aria-haspopup="dialog"
        aria-expanded={open()}
        onClick={() => setOpen(true)}
      >
        ?
      </SmallGhostButton>
      <Show when={open()}>
        <Portal>
          <div class="sui-shortcut-help__scrim" onClick={() => setOpen(false)}>
            <div
              class="sui-shortcut-help__panel"
              role="dialog"
              aria-modal="true"
              aria-label="Keyboard shortcuts"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 class="sui-shortcut-help__title">Shortcuts</h2>
              <For each={groups()}>
                {(g) => (
                  <section class="sui-shortcut-help__group">
                    <Show when={g.title}>
                      <h3 class="sui-shortcut-help__group-title">{g.title}</h3>
                    </Show>
                    <dl class="sui-shortcut-help__rows">
                      <For each={g.rows}>
                        {(r) => (
                          <>
                            <dt class="sui-shortcut-help__label">{r.label}</dt>
                            <dd class="sui-shortcut-help__keys">
                              <Show
                                when={isLetterKey(r.keys)}
                                fallback={<Kbd>{keyGlyph(r.keys, mac)}</Kbd>}
                              >
                                <Kbd>{r.keys.toUpperCase()}</Kbd>
                              </Show>
                            </dd>
                          </>
                        )}
                      </For>
                    </dl>
                  </section>
                )}
              </For>
              <p class="sui-shortcut-help__hint">
                <Kbd>Esc</Kbd> closes
              </p>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
};
