// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ButtonGroup — Layout-exempt Primitive (Depth 1) (arranges child buttons).
// Owns CSS (ButtonGroup.css), no component imports.
//
// Layout-purity status: ButtonGroup is `layout`-exempt (its whole job is
// arranging child buttons), but its runtime `gap` / `orientation` props are
// DEPRECATED-as-such (Peter, 2026-07-14). New call sites should use the pure-
// path curried variants in ./variants.ts — `ButtonGroup` (horizontal),
// `VerticalButtonGroup`, `BorderedButtonGroup` — which bake orientation/gap and
// expose only data props. The runtime props stay for backwards compatibility;
// consumers migrate opportunistically. No breaking changes.
// ============================================
import { type Component, type JSX, splitProps, mergeProps } from "solid-js";
import "./ButtonGroup.css";

export interface ButtonGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Orientation. Legacy runtime prop — new call sites bake it into a curried
   *  variant (`ButtonGroup` / `VerticalButtonGroup`) instead of passing inline. */
  orientation?: "horizontal" | "vertical";
  /** Gap between buttons. Legacy runtime prop — prefer a curried variant. */
  gap?: "none" | "sm" | "md" | "lg";
  /** Border around group */
  bordered?: boolean;
  /**
   * Tone hint surfaced as a `sui-btn-group--tone-*` modifier class.
   * Consumers can use it to scope tone styling; mirrors the Button
   * tone matrix.
   */
  tone?: "accent" | "outline" | "muted";
}

export const ButtonGroup: Component<ButtonGroupProps> = (props) => {
  const [local, others] = splitProps(props, [
    "orientation",
    "gap",
    "bordered",
    "tone",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["sui-btn-group"];
    if (local.orientation === "vertical")
      classList.push("sui-btn-group--vertical");
    classList.push(`sui-btn-group--gap-${local.gap || "md"}`);
    if (local.bordered) classList.push("sui-btn-group--bordered");
    if (local.tone) classList.push(`sui-btn-group--tone-${local.tone}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: intentional ARIA group pattern; native <fieldset> requires a <legend> and imposes layout that would break the button arrangement
    <div class={classes()} role="group" {...others}>
      {local.children}
    </div>
  );
};

/** Visual/layout overrides — locked at variant-definition time. */
export type ButtonGroupOverrides = Pick<
  ButtonGroupProps,
  "orientation" | "gap" | "bordered" | "tone"
>;

/** Props available to consumers of a curried ButtonGroup variant. */
export type ButtonGroupDataProps = Omit<
  ButtonGroupProps,
  keyof ButtonGroupOverrides
>;

export function createButtonGroup(
  defaults: Partial<Omit<ButtonGroupProps, "children">>,
): Component<ButtonGroupDataProps> {
  return (props) => <ButtonGroup {...mergeProps(defaults, props)} />;
}
