// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Button — Atomic (Depth 1)
// Owns CSS (Button.css), no component imports.
// Multi-variant button with loading spinner.
// Updated: absorbs HUDButton's active prop.
// ============================================
import { type Component, type JSX, splitProps, mergeProps } from "solid-js";
import {
  createSubmitAction,
  type SubmitAction,
  type SubmitWork,
} from "../../hooks/createSubmitAction";
import "./Button.css";

export interface ButtonProps
  extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
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
}

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
  ]);

  // The action is fixed at creation, as a Solid component's setup runs once.
  const action: SubmitAction | undefined =
    local.action ??
    (local.onAction
      ? createSubmitAction(() => local.onAction?.(), { once: local.once })
      : undefined);
  const loading = () => (local.loading ?? false) || (action?.pending() ?? false);
  const disabled = () =>
    (local.disabled ?? false) || loading() || (action?.spent() ?? false);
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

  return (
    <button
      class={classes()}
      disabled={disabled()}
      aria-busy={loading() || undefined}
      onClick={onClick}
      {...others}
    >
      {loading() && <span class="sui-btn__spinner" />}
      <span class="sui-btn__content">{local.children}</span>
    </button>
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
