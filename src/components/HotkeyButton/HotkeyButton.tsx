// ============================================
// HotkeyButton — Composite (Depth 2)
// Built on Button. Renders a text label with its hotkey character
// emphasized (bold + underline) so the keyboard affordance is obvious,
// and — when `armed` — binds a window-level keydown listener that fires
// the action when that key is pressed.
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
  onCleanup,
  onMount,
  createMemo,
} from "solid-js";
import { Button, type ButtonProps } from "../Button/Button";
import { Icon, type IconName } from "../Icon";
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
  /** Plain-text label; the first case-insensitive `hotkey` char is emphasized. */
  children: string;
}

/** True when the event target is a text-editing surface (input / textarea /
 *  select / contentEditable). Exported so other keyboard-shortcut owners (e.g.
 *  ActionList's Escape-clears-selection) can defer to an active inline editor. */
export function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export const HotkeyButton: Component<HotkeyButtonProps> = (props) => {
  const merged = mergeProps({ armed: true }, props);
  const [local, others] = splitProps(merged, [
    "hotkey",
    "icon",
    "onTrigger",
    "armed",
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

  const onKeyDown = (e: KeyboardEvent) => {
    if (!local.armed || local.disabled) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isEditableTarget(e.target)) return;
    if (e.key.toLowerCase() !== (local.hotkey ?? "").toLowerCase()) return;
    e.preventDefault();
    fire(e);
  };

  onMount(() => window.addEventListener("keydown", onKeyDown));
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

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
