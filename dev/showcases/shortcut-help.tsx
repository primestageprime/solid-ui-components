// ShortcutHelp: the ? corner button and the shortcut overlay.
import type { Component } from "solid-js";
import { ShortcutHelp } from "../../src/components/ShortcutHelp";
import { HotkeyQuietDangerButton, HotkeyPrimaryButton } from "../../src/components/HotkeyButton";

export const ShortcutHelpShowcase: Component = () => (
  <div class="component-section">
    <h2>ShortcutHelp — Composite (Depth 2)</h2>
    <p class="text-meta">
      A <code>?</code> button sits at the bottom right of the screen on desktop (hidden on touch and narrow
      screens). Click it or press <code>?</code> to open a translucent overlay of the active shortcuts; Escape or
      a click outside closes it. While it is open page keys do not fire behind it.
    </p>
    <div class="example-group shortcut-help-demo">
      <HotkeyPrimaryButton hotkey="s" onTrigger={() => {}}>
        Save
      </HotkeyPrimaryButton>
      <HotkeyQuietDangerButton hotkey="d" onTrigger={() => {}}>
        Delete
      </HotkeyQuietDangerButton>
    </div>
    <ShortcutHelp
      shortcuts={[
        { keys: "s", label: "Save", group: "Actions" },
        { keys: "d", label: "Delete", group: "Actions" },
        { keys: "e", label: "Expand or collapse", group: "Actions" },
        { keys: "Enter", label: "Save from any field", group: "Fields" },
      ]}
    />
  </div>
);
