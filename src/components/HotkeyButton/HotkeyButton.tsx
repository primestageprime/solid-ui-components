// ============================================
// HotkeyButton — Composite (Depth 2)
// Tags: shows:button, shows:kbd, does:hotkey, does:click, data:scalar, role:control
// Built on Button. Renders a text label with its hotkey character
// emphasized (bold + underline) so the keyboard affordance is obvious,
// and — when `armed` — claims that key in the hotkey registry
// (hooks/hotkeys), so pressing it fires the action. A thin wrapper since
// #53325: the claim respects Modal layers, and a focused text field keeps
// the key.
//
//   <HotkeyButton hotkey="d" onTrigger={markDone}>Mark Done</HotkeyButton>
//
// renders  Mark <u><b>D</b></u>one  and pressing `d` (with no input
// focused and no modifier held) fires onTrigger.
// ============================================
import {
  type Component,
  type JSX,
  splitProps,
  mergeProps,
  createMemo,
} from "solid-js";
import { Button, type ButtonProps } from "../Button/Button";
import { Icon, type IconName } from "../Icon";
import { useHotkey } from "../../hooks/hotkeys/useHotkey";
import {
  isEditableTarget,
  type HotkeyPress,
} from "../../hooks/hotkeys/hotkeyGuard";
import "./HotkeyButton.css";

export interface HotkeyButtonProps extends Omit<ButtonProps, "children"> {
  /** Single character that triggers this button (case-insensitive), e.g. "d". */
  hotkey: string;
  /** Optional leading icon associating the action with its glyph. */
  icon?: IconName;
  /** Fired on click OR when the hotkey is pressed (while armed + enabled). */
  onTrigger?: (e: KeyboardEvent | MouseEvent) => void;
  /**
   * When true (default), a window-level keydown listener fires onTrigger on the
   * hotkey — unless a text input / textarea / select / contentEditable element
   * is focused, a modifier (⌘/Ctrl/Alt) is held, or the button is disabled.
   * Set false to render the affordance without binding a listener (the caller
   * wires the key themselves).
   */
  armed?: boolean;
  /**
   * When true, a held key fires once: its auto-repeats (`KeyboardEvent.repeat`)
   * do not call onTrigger, but are still cancelled (`preventDefault`) so the
   * browser does not act on them. Default false: a held key repeats.
   */
  once?: boolean;
  /** Plain-text label; the first case-insensitive `hotkey` char is emphasized. */
  children: string;
}

// The guard moved to hooks/hotkeys/hotkeyGuard (#53325); re-exported here,
// where callers have always imported it.
export { isEditableTarget, type HotkeyPress };

/**
 * Whether a key press should fire `hotkey` — the guard, pure, so it prints as
 * a table (hotkeyFires.test.ts). Not while a text-editing surface has focus
 * (typing an "a" into a field must not add a row), not with ⌘/Ctrl/Alt held
 * (those chords belong to the browser and the OS), and only for the hotkey's
 * own character, case-insensitively.
 *
 * Shift is NOT a blocker, as it never was here: Shift+A arrives as `"A"` and
 * fires `a`, so Caps Lock does not silently disarm every hotkey.
 */
export const hotkeyFires = (press: HotkeyPress, hotkey: string): boolean =>
  !(press.metaKey || press.ctrlKey || press.altKey) &&
  !isEditableTarget(press.target) &&
  hotkey !== "" &&
  press.key.toLowerCase() === hotkey.toLowerCase();

export const HotkeyButton: Component<HotkeyButtonProps> = (props) => {
  const merged = mergeProps({ armed: true }, props);
  const [local, others] = splitProps(merged, [
    "hotkey",
    "icon",
    "onTrigger",
    "armed",
    "once",
    "children",
    "class",
    "disabled",
  ]);

  // Split the label at the first case-insensitive occurrence of the hotkey so
  // we can wrap just that character. If the char isn't present, we append a
  // trailing `[x]` hint instead so the affordance is still visible.
  const segments = createMemo(() => {
    const label = local.children ?? "";
    const key = (local.hotkey ?? "").toLowerCase();
    const idx = key ? label.toLowerCase().indexOf(key) : -1;
    if (idx < 0) {
      return { before: label, char: "", after: "", hint: key.toUpperCase() };
    }
    return {
      before: label.slice(0, idx),
      char: label.slice(idx, idx + 1),
      after: label.slice(idx + 1),
      hint: "",
    };
  });

  const fire = (e: KeyboardEvent | MouseEvent) => {
    if (local.disabled) return;
    local.onTrigger?.(e);
  };

  // The registry claim. `once`: a held key's auto-repeats are swallowed but
  // fire nothing (read at creation). ⌘ / Ctrl / Alt never fire it; Shift and
  // case do not matter (the registry's `hotkeyFires` rule).
  useHotkey({
    keys: () => (local.armed && local.hotkey ? [local.hotkey] : []),
    enabled: () => !local.disabled,
    repeats: !local.once,
    run: fire,
  });

  const classes = () => {
    const list = ["sui-hotkey-btn"];
    if (local.class) list.push(local.class);
    return list.join(" ");
  };

  return (
    <Button
      {...others}
      class={classes()}
      disabled={local.disabled}
      aria-keyshortcuts={local.armed && local.hotkey ? local.hotkey.toUpperCase() : undefined}
      onClick={fire as JSX.EventHandler<HTMLButtonElement, MouseEvent>}
    >
      {local.icon && (
        <Icon
          name={local.icon}
          variant="outline"
          size="xs"
          class="sui-hotkey-btn__icon"
        />
      )}
      {/* Rendered tight on one line so the JSX compiler can't insert
          whitespace text nodes between the segments (which would show as a
          gap around the emphasized key, e.g. "D one" instead of "Done"). */}
      <span class="sui-hotkey-btn__label">
        {segments().before}
        {segments().char && (
          <span class="sui-hotkey-btn__key">{segments().char}</span>
        )}
        {segments().after}
      </span>
      {segments().hint && (
        <span class="sui-hotkey-btn__hint">[{segments().hint}]</span>
      )}
    </Button>
  );
};

/** Props locked at variant-definition time. */
export type HotkeyButtonOverrides = Pick<HotkeyButtonProps, "variant" | "size">;
/** Props that stay available to consumers of a curried HotkeyButton variant. */
export type HotkeyButtonDataProps = Omit<
  HotkeyButtonProps,
  keyof HotkeyButtonOverrides
>;

export function createHotkeyButton(
  defaults: Partial<Omit<HotkeyButtonProps, "children" | "hotkey">>,
): Component<HotkeyButtonDataProps> {
  return (props) => <HotkeyButton {...mergeProps(defaults, props)} />;
}
