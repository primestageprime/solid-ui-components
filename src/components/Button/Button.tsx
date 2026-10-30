// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Button — Atomic (Depth 1)
// Tags: shows:button, shows:icon, does:click, does:submit, data:scalar, role:control
// Owns CSS (Button.css). Composes ButtonReason (no Kobalte) for `disabledReason`.
// Multi-variant button with loading spinner.
// Updated: absorbs HUDButton's active prop.
//
// HOTKEYS (#53325): `hotkeys={["Enter"]}` claims the keys in the hotkey
// registry (hooks/hotkeys). A press runs the button's own click path, the
// same as a mouse click, and the button shows its pressed state for about
// 150 ms (`data-hotkey-flash`, styled as `:active`). The label shows the
// hint after the text (`↵`, `Esc`, `⌘Z` / `Ctrl+Z`, an underlined letter),
// `aria-hidden`, and the button carries `aria-keyshortcuts`.
// - DISABLED with a `disabledReason`: the key does not fire; the reason
//   opens for about 1.5 s. The button owns that popover (`ButtonReason`): a
//   span around the button takes the hover, and the text portals to the body.
//   It is not `Tooltip`, so a button ships no Kobalte (bundle budget).
// - PENDING (`loading`, or a submit action not yet settled) and SPENT
//   (`once`): the key does not fire and nothing shows. Both still show as
//   the DOM `disabled` attribute, as before.
// Inside a Modal the claim lives in the Modal's layer (rank "modal").
// ============================================
import {
  type Component,
  type JSX,
  Show,
  createSignal,
  mergeProps,
  onCleanup,
  splitProps,
} from "solid-js";
import type { HotkeyRank } from "../../hooks/hotkeyDispatch";
import {
  ariaKeyShortcut,
  isLetterKey,
  isMacPlatform,
  keyGlyph,
} from "../../hooks/hotkeys/hotkeyKeys";
import { useHotkey } from "../../hooks/hotkeys/useHotkey";
import { ButtonReason } from "./ButtonReason";
import { filter, join, map } from "../../fn";
import {
  createSubmitAction,
  type SubmitAction,
  type SubmitWork,
} from "../../hooks/createSubmitAction";
import "./Button.css";

export interface ButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The native button type. Default `"button"`, so a SUI button inside a
   * `<form>` never submits it by accident. Pass `"submit"` for the button that
   * submits the form (a Modal with `onSubmit` looks for it), or `"reset"`.
   * The native type, so a wrapper that forwards its own props still fits.
   */
  type?: JSX.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "danger"
    | "warning"
    | "ghost"
    | "outlined"
    | "text"
    | "icon-only"
    | "pill"
    /**
     * A SECONDARY AFFORDANCE THAT SHOULD NOT COMPETE: muted text and a faint
     * dashed outline at rest, full contrast on hover and focus-visible, and a
     * little stronger (still subtle) on touch screens, where there is no hover.
     * For in-between controls like TieableRankList's = tie / ≠ untie.
     */
    | "quiet"
    /**
     * A TOGGLEABLE LABEL: the button stripped back to its own text, with no
     * box, no padding and no colour of its own, taking the accent when
     * `active`. For a name that is also the select control — see
     * `PressableLabelButton`.
     */
    | "plain-label";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  /**
   * A SUBMIT: the button runs this work on click, shows the spinner and stays
   * disabled while it runs, and ignores clicks until it settles. Return
   * `false` to say the work refused. See `createSubmitAction`.
   */
  onAction?: SubmitWork;
  /** With `onAction`: stay disabled after the work is sent once. */
  once?: boolean;
  /**
   * A shared submit action (`createSubmitAction`), for work that a keyboard
   * shortcut also runs. The button reads its `pending` and `spent`.
   */
  action?: SubmitAction;
  /** Active/selected state (absorbed from HUDButton) */
  active?: boolean;
  /**
   * Lightweight tone matrix (orthogonal to `variant`) — useful for the
   * common "filled accent / outlined accent / muted" trio used by
   * many dside-ui inline button factories.
   */
  tone?: "accent" | "outline" | "muted" | "danger";
  /** Label casing: `theme` (default; the hud theme sets small caps) or `normal`, the label as written
   *  (a sketch's "Oldest", "Create"). Additive: no theme changes. */
  casing?: "theme" | "normal";
  /**
   * Keys that press this button: `["Enter"]`, `["Mod+z"]` (⌘ on macOS, Ctrl
   * elsewhere), `["i", "g t"]`. The first one shows as the hint. See the
   * header and hooks/hotkeys.
   */
  hotkeys?: readonly string[];
  /** Who wins a key claimed twice: modal > step > page. Default "page" ("modal" inside a Modal). */
  hotkeyRank?: HotkeyRank;
  /**
   * Why the button is disabled. Shows on hover while `disabled`, and for
   * about 1.5 s when its hotkey is pressed. Decides AT CREATION whether the
   * button has its tooltip wrapper: pass the prop (even as `undefined`) on
   * every render of a button whose reason comes and goes, so the button is
   * never remounted.
   */
  disabledReason?: string;
}

/** How long a hotkey press shows the pressed state. */
export const HOTKEY_FLASH_MS = 150;
/** How long a hotkey press on a disabled button shows its reason. */
export const DISABLED_REASON_MS = 1500;

export const Button: Component<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, [
    "variant",
    "size",
    "loading",
    "active",
    "tone",
    "casing",
    "class",
    "children",
    "disabled",
    "onAction",
    "once",
    "action",
    "onClick",
    "type",
    "hotkeys",
    "hotkeyRank",
    "disabledReason",
    "ref",
  ]);
  const hasReasonSlot = "disabledReason" in props;

  // The action is fixed at creation, as a Solid component's setup runs once.
  const action: SubmitAction | undefined =
    local.action ??
    (local.onAction
      ? createSubmitAction(() => local.onAction?.(), { once: local.once })
      : undefined);
  // PENDING and SPENT are apart from the caller's `disabled` for the hotkey
  // rule; the DOM `disabled` attribute folds all three, as before.
  const loading = () => (local.loading ?? false) || (action?.pending() ?? false);
  const spent = () => action?.spent() ?? false;
  const disabled = () => (local.disabled ?? false) || loading() || spent();

  let el: HTMLButtonElement | undefined;
  const [flashing, setFlashing] = createSignal(false);
  const [hovered, setHovered] = createSignal(false);
  const [reasonByKey, setReasonByKey] = createSignal(false);
  let flashTimer: ReturnType<typeof setTimeout> | undefined;
  let reasonTimer: ReturnType<typeof setTimeout> | undefined;
  let pressFrame: number | undefined;
  onCleanup(() => {
    clearTimeout(flashTimer);
    clearTimeout(reasonTimer);
    if (pressFrame !== undefined) cancelAnimationFrame(pressFrame);
  });
  const onHotkey = () => {
    if (loading() || spent()) return;
    if (local.disabled) {
      if (!local.disabledReason) return;
      setReasonByKey(true);
      clearTimeout(reasonTimer);
      reasonTimer = setTimeout(() => setReasonByKey(false), DISABLED_REASON_MS);
      return;
    }
    // PAINT FIRST, THEN CLICK (owner, 2026-10-30: "I don't see the flash on
    // keypress"). The click can hold the main thread past the flash (an import
    // step re-renders its tab), so a flash set in the same task never paints.
    // The pressed state paints on the second frame, then the click runs, then
    // the flash holds for HOTKEY_FLASH_MS, as a mouse press paints `:active`
    // before its click. A press while one is pending does nothing.
    if (pressFrame !== undefined) return;
    setFlashing(true);
    clearTimeout(flashTimer);
    pressFrame = requestAnimationFrame(() => {
      pressFrame = requestAnimationFrame(() => {
        pressFrame = undefined;
        if (el?.isConnected) el.click();
        flashTimer = setTimeout(() => setFlashing(false), HOTKEY_FLASH_MS);
      });
    });
  };
  useHotkey({
    keys: () => local.hotkeys,
    rank: () => local.hotkeyRank,
    run: onHotkey,
    element: () => el,
  });
  const mac = isMacPlatform();
  const hint = () => local.hotkeys?.[0];
  const shortcuts = () =>
    join(
      " ",
      filter(
        (k): k is string => k !== null,
        map((k: string) => ariaKeyShortcut(k, mac), local.hotkeys ?? []),
      ),
    ) || undefined;
  const setRef = (node: HTMLButtonElement) => {
    el = node;
    const forward = local.ref as unknown;
    if (typeof forward === "function") (forward as (n: HTMLButtonElement) => void)(node);
  };
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (e) => {
    const handler = local.onClick;
    if (typeof handler === "function") handler(e);
    else if (Array.isArray(handler)) handler[0](handler[1], e);
    if (action) void action.run();
  };

  const classes = () => {
    const classList = ["sui-btn"];
    if (local.variant) classList.push(`sui-btn--${local.variant}`);
    if (local.size) classList.push(`sui-btn--${local.size}`);
    if (local.tone) classList.push(`sui-btn--tone-${local.tone}`);
    if (loading()) classList.push("sui-btn--loading");
    if (local.active) classList.push("sui-btn--active");
    if (local.casing === "normal") classList.push("sui-btn--normal-case");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const button = (
    // `type="button"` unless the caller says otherwise: a typeless button is a
    // SUBMIT button, so inside a consumer's `<form>` every SUI button would
    // submit it (owner rule, 2026-10-21). Pass `type="submit"` for the one
    // button that should.
    <button
      type={local.type ?? "button"}
      class={classes()}
      disabled={disabled()}
      aria-busy={loading() || undefined}
      aria-keyshortcuts={shortcuts()}
      data-hotkey-flash={flashing() ? "" : undefined}
      onClick={onClick}
      ref={setRef}
      {...others}
    >
      {loading() && <span class="sui-btn__spinner" />}
      <span class="sui-btn__content">{local.children}</span>
      <Show when={hint()}>
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
    </button>
  );

  if (!hasReasonSlot) return button;
  const reasonOpen = () =>
    !!local.disabledReason &&
    (local.disabled ?? false) &&
    (hovered() || reasonByKey());
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

/** Props that are visual/static overrides — locked at variant-definition time. */
export type ButtonOverrides = Pick<ButtonProps, "variant" | "size">;

/** Props that remain available to consumers of a curried Button variant. */
export type ButtonDataProps = Omit<ButtonProps, keyof ButtonOverrides>;

export function createButton(
  defaults: Partial<Omit<ButtonProps, "children">>,
): Component<ButtonDataProps> {
  return (props) => <Button {...mergeProps(defaults, props)} />;
}
