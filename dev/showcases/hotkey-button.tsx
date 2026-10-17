// HotkeyButton — a Button with its hotkey character drawn in the label, and
// FoldingHotkeyButton, the same button that is its icon alone at phone width.
// The fold follows the viewport (HOTKEY_BUTTON_FOLD_QUERY, the AppBar's
// 480px), so narrow the window to see the row fold.
import { type Component, createSignal, For } from "solid-js";
import {
  FoldingHotkeyButton,
  HotkeyButton,
  HOTKEY_BUTTON_FOLD_QUERY,
} from "../../src/components/HotkeyButton";
import { ClusterRow, WrapRow } from "../../src/components/Layout";
import { MutedBody } from "../../src/components/Text";

const ACTIONS = [
  { hotkey: "s", icon: "play", label: "Start" },
  { hotkey: "c", icon: "check", label: "Complete" },
  { hotkey: "a", icon: "plus", label: "Add step" },
  { hotkey: "e", icon: "edit", label: "Edit" },
  { hotkey: "x", icon: "trash", label: "Delete" },
] as const;

export const HotkeyButtonShowcase: Component = () => {
  const [fired, setFired] = createSignal<string[]>([]);
  const note = (label: string) => setFired((f) => [label, ...f].slice(0, 6));

  return (
    <div class="component-section">
      <h2>HotkeyButton — Composite (Depth 2)</h2>
      <p class="text-meta">
        A <code>Button</code> whose label shows its hotkey character bold and
        underlined (or a trailing <code>[G A]</code> hint for a chord). With{" "}
        <code>armed</code> (default true) it binds the key itself; render it{" "}
        <code>armed={"{false}"}</code> when <code>useHotkeys</code> owns the table.
      </p>

      <div class="example-group">
        <h3>Keyed text buttons</h3>
        <ClusterRow>
          <HotkeyButton hotkey="n" onTrigger={() => note("New task")}>
            New task
          </HotkeyButton>
          <HotkeyButton hotkey="g a" icon="plus" onTrigger={() => note("Add step")}>
            Add step
          </HotkeyButton>
          <HotkeyButton hotkey="u" icon="undo" armed={false} onTrigger={() => note("Undo")}>
            Undo
          </HotkeyButton>
        </ClusterRow>
      </div>

      <div class="example-group">
        <h3>FoldingHotkeyButton — icon alone at phone width</h3>
        <p class="text-meta">
          Below <code>{HOTKEY_BUTTON_FOLD_QUERY}</code> each button is its icon
          with the label as <code>aria-label</code> and no key drawn, since a
          phone has no keyboard. Wider, the keyed text button with its icon.
          Narrow the window to fold the row.
        </p>
        <WrapRow>
          <For each={ACTIONS}>
            {(a) => (
              <FoldingHotkeyButton hotkey={a.hotkey} icon={a.icon} onTrigger={() => note(a.label)}>
                {a.label}
              </FoldingHotkeyButton>
            )}
          </For>
        </WrapRow>
        <MutedBody>
          {fired().length ? `Fired: ${fired().join(", ")}` : "Click a button or press its key."}
        </MutedBody>
      </div>
    </div>
  );
};
