// ============================================
// HotkeyButton — Composite (Depth 2)
// Tags: shows:button, shows:kbd, does:hotkey, does:click, data:scalar, role:control
// Built on Button. The base of the KEY-BUTTON family (HotkeyPrimaryButton,
// HotkeySecondaryButton, …): only these buttons carry the hotkey registry,
// so a plain Button ships none of it (bundle budget, ADR 0005).
//
// TWO WAYS TO NAME THE KEY:
// - `hotkeys={["Enter"]}` (#53325): the keys ("Enter", "Mod+z", "i",
//   "g t") claim the registry. A press runs the button's own click path,
//   the same as a mouse click, and the button shows its pressed state for
//   about 150 ms (`data-hotkey-flash`, styled as `:active`). The label shows
//   the hint after the children (`↵`, `Esc`, `⌘Z` / `Ctrl+Z`, an underlined
//   letter), `aria-hidden`, and the button carries `aria-keyshortcuts`.
//   Children may be any JSX.
// - `hotkey="d"` (the released API): string children with the key's letter
//   emphasized; a press calls `onTrigger` directly while `armed`.
//
//   <HotkeyButton hotkey="d" onTrigger={markDone}>Mark Done</HotkeyButton>
//
// renders  Mark <u><b>D</b></u>one.
//
// DISABLED with a `disabledReason`: the key does not fire; the reason opens
// on hover and for about 1.5 s on the key (ButtonReason: a span around the
// button and a portalled text box; no Kobalte). PENDING (`loading`, an
// unsettled `onAction` / `action`) and SPENT: the key does nothing and
// nothing shows. Inside a Modal the claim lives in the Modal's layer.
// ============================================
import {
  type Component,
  type JSX,
  Show,
  createMemo,
  createSignal,
  mergeProps,
  splitProps,
} from "solid-js";
import { Button, type ButtonProps } from "../Button/Button";
import { Icon, type IconName } from "../Icon";
import { useHotkey } from "../../hooks/hotkeys/useHotkey";
import type { HotkeyRank } from "../../hooks/hotkeyDispatch";
import {
  ariaKeyShortcut,
  isLetterKey,
  isMacPlatform,
  keyGlyph,
} from "../../hooks/hotkeys/hotkeyKeys";
import {
  isEditableTarget,
  type HotkeyPress,
} from "../../hooks/hotkeys/hotkeyGuard";
import { createSubmitAction, type SubmitAction } from "../../hooks/createSubmitAction";
import { filter, join, map } from "../../fn";
import { ButtonReason } from "./ButtonReason";
import { createKeyPress } from "./createKeyPress";
import "./HotkeyButton.css";

export { HOTKEY_FLASH_MS, DISABLED_REASON_MS } from "./createKeyPress";

export interface HotkeyButtonProps
  extends Omit<ButtonProps, "children" | "once"> {
  /**
   * Keys that press this button: `["Enter"]`, `["Mod+z"]` (⌘ on macOS, Ctrl
   * elsewhere), `["i", "g t"]`. The first one shows as the hint. A press runs
   * the click path (`onClick`, `onAction`, `onTrigger`). Wins over `hotkey`.
   */
  hotkeys?: readonly string[];
  /** Who wins a key claimed twice: modal > step > page. Default "page" ("modal" inside a Modal). */
  hotkeyRank?: HotkeyRank;
  /**
   * Why the button is disabled. Shows on hover while `disabled`, and for
   * about 1.5 s when its hotkey is pressed. Decides AT CREATION whether the
   * button has its reason wrapper: pass the prop (even as `undefined`) on
   * every render of a button whose reason comes and goes, so the button is
   * never remounted.
   */
  disabledReason?: string;
  /**
   * The legacy single key (case-insensitive), e.g. "d". With string children
   * its first letter in the label is emphasized; a press calls `onTrigger`.
   */
  hotkey?: string;
  /** Optional leading icon associating the action with its glyph. */
  icon?: IconName;
  /** Fired on click OR when the hotkey is pressed (while armed + enabled). */
  onTrigger?: (e: KeyboardEvent | MouseEvent) => void;
  /**
   * For `hotkey`: when true (default), the key fires onTrigger — unless a
   * text field is focused, a modifier (⌘/Ctrl/Alt) is held, or the button is
   * disabled. Set false to render the affordance without a claim.
   */
  armed?: boolean;
  /**
   * For `hotkey`: a held key fires once; its auto-repeats are cancelled but
   * call nothing. Default false: a held key repeats. (A `hotkeys` key never
   * repeats.)
   */
  once?: boolean;
  /** The label. With `hotkey` and a string, its hotkey letter is emphasized. */
  children?: JSX.Element;
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

const emphasize = (label: string, hotkey: string) => {
  const key = hotkey.toLowerCase();
  const idx = key ? label.toLowerCase().indexOf(key) : -1;
  if (idx < 0) return { before: label, char: "", after: "", hint: key.toUpperCase() };
  return {
    before: label.slice(0, idx),
    char: label.slice(idx, idx + 1),
    after: label.slice(idx + 1),
    hint: "",
  };
};

export const HotkeyButton: Component<HotkeyButtonProps> = (props) => {
  const merged = mergeProps({ armed: true }, props);
  const [local, others] = splitProps(merged, [
    "hotkey",
    "hotkeys",
    "hotkeyRank",
    "disabledReason",
    "icon",
    "onTrigger",
    "armed",
    "once",
    "children",
    "class",
    "disabled",
    "onClick",
    "onAction",
    "action",
    "ref",
  ]);
  const hasReasonSlot = "disabledReason" in props;

  // The action is fixed at creation, as in Button; the key reads its state.
  const action: SubmitAction | undefined =
    local.action ??
    (local.onAction ? createSubmitAction(() => local.onAction?.()) : undefined);
  const busy = () =>
    (others.loading ?? false) ||
    (action?.pending() ?? false) ||
    (action?.spent() ?? false);

  let el: HTMLButtonElement | undefined;
  const keys = createKeyPress({
    busy,
    disabled: () => local.disabled ?? false,
    hasReason: () => !!local.disabledReason,
    click: () => {
      if (el?.isConnected) el.click();
    },
  });
  const modern = () => (local.hotkeys?.length ?? 0) > 0;
  const legacyKey = () =>
    !modern() && local.armed && local.hotkey ? local.hotkey : undefined;

  useHotkey({
    keys: () => local.hotkeys,
    rank: () => local.hotkeyRank,
    run: keys.press,
    element: () => el,
  });
  // The legacy claim. `once`: a held key's auto-repeats are swallowed but
  // fire nothing (read at creation). ⌘ / Ctrl / Alt never fire it; Shift and
  // case do not matter (the registry's `hotkeyFires` rule).
  useHotkey({
    keys: () => {
      const k = legacyKey();
      return k ? [k] : [];
    },
    enabled: () => !local.disabled,
    repeats: !local.once,
    run: (e) => fire(e),
    element: () => el,
  });

  const fire = (e: KeyboardEvent | MouseEvent) => {
    if (local.disabled) return;
    local.onTrigger?.(e);
  };
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (e) => {
    const handler = local.onClick;
    if (typeof handler === "function") handler(e);
    else if (Array.isArray(handler)) handler[0](handler[1], e);
    fire(e);
  };
  const setRef = (node: HTMLButtonElement) => {
    el = node;
    const forward = local.ref as unknown;
    if (typeof forward === "function") (forward as (n: HTMLButtonElement) => void)(node);
  };

  const mac = isMacPlatform();
  const shortcuts = () => {
    if (!modern()) return legacyKey()?.toUpperCase();
    return (
      join(
        " ",
        filter(
          (k): k is string => k !== null,
          map((k: string) => ariaKeyShortcut(k, mac), local.hotkeys ?? []),
        ),
      ) || undefined
    );
  };

  // The legacy label: split at the first case-insensitive occurrence of the
  // hotkey so just that character is wrapped. If the char is not present, a
  // trailing `[x]` hint keeps the affordance visible.
  const segments = createMemo(() => {
    const label = local.children;
    return !modern() && local.hotkey && typeof label === "string"
      ? emphasize(label, local.hotkey)
      : null;
  });

  const classes = () =>
    ["sui-hotkey-btn", local.class].filter(Boolean).join(" ");

  const button = (
    <Button
      {...others}
      class={classes()}
      disabled={local.disabled}
      action={action}
      aria-keyshortcuts={shortcuts()}
      data-hotkey-flash={keys.flashing() ? "" : undefined}
      onClick={onClick}
      ref={setRef}
    >
      {local.icon && (
        <Icon
          name={local.icon}
          variant="outline"
          size="xs"
          class="sui-hotkey-btn__icon"
        />
      )}
      <Show when={segments()} fallback={local.children}>
        {(seg) => (
          <>
            {/* Rendered tight on one line so the JSX compiler can't insert
                whitespace text nodes between the segments (which would show
                as a gap around the emphasized key, "D one" for "Done"). */}
            <span class="sui-hotkey-btn__label">
              {seg().before}
              {seg().char && <span class="sui-hotkey-btn__key">{seg().char}</span>}
              {seg().after}
            </span>
            {seg().hint && <span class="sui-hotkey-btn__hint">[{seg().hint}]</span>}
          </>
        )}
      </Show>
      <Show when={modern() && local.hotkeys?.[0]}>
        {(k) => (
          <span
            class="sui-btn__hotkey"
            classList={{ "sui-btn__hotkey--letter": isLetterKey(k()) }}
            aria-hidden="true"
          >
            {keyGlyph(k(), mac)}
          </span>
        )}
      </Show>
    </Button>
  );

  if (!hasReasonSlot) return button;
  const [hovered, setHovered] = createSignal(false);
  const reasonOpen = () =>
    !!local.disabledReason &&
    (local.disabled ?? false) &&
    (hovered() || keys.reasonByKey());
  return (
    <ButtonReason
      open={reasonOpen()}
      onHover={setHovered}
      reason={local.disabledReason ?? ""}
    >
      {button}
    </ButtonReason>
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
