// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Fab — Composite (Depth 2)
// Composes Button + Icon (both Depth-1 atomics).
// Exception: owns a minimal structural CSS file (circle / fixed
// size / elevation) — the float/circle/size geometry is structural
// and not expressible as a Button color/size variant. This is a
// deliberate documented exception to the strict "Depth 2 = zero CSS"
// rule.
//
// Floating action button: round, fixed 56px, default color.
// Placement is the container's responsibility — Fab owns
// appearance and behavior only.
//
// Intentionally minimal: one size, one color. Add size/variant
// props only when a real use case needs them (see STYLE_GUIDE.md
// "Variant surface: keep it minimal").
// ============================================
import { type Component, type JSX, splitProps, mergeProps } from "solid-js";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import type { IconName } from "../Icon/Icon";
import "./Fab.css";

export interface FabProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon to display — must be a valid IconName from the Icon component. */
  icon: IconName;
  /**
   * REQUIRED. Used as both `aria-label` and `title`.
   * The FAB renders no visible text — this is its accessible name.
   */
  label: string;
}

export const Fab: Component<FabProps> = (props) => {
  const [local, others] = splitProps(props, ["icon", "label", "class"]);

  const classes = () => (local.class ? `sui-fab ${local.class}` : "sui-fab");

  return (
    <Button class={classes()} aria-label={local.label} title={local.label} {...others}>
      <Icon name={local.icon} size="md" />
    </Button>
  );
};

/** Props that are visual/static overrides — locked at variant-definition time. */
export type FabOverrides = Pick<FabProps, "icon">;

/** Props that remain available to consumers of a curried Fab variant. */
export type FabDataProps = Omit<FabProps, keyof FabOverrides>;

/**
 * Factory that returns a curried Fab component with baked-in presentational
 * defaults. Call sites receive only `FabDataProps` (label, onClick, disabled,
 * etc.) — override props like `icon` are frozen at definition time.
 *
 * @example
 * const AddFab = createFab({ icon: "plus" });
 * // call site: <AddFab label="Add item" onClick={handleAdd} />
 */
export function createFab(defaults: Partial<Omit<FabProps, "children">>): Component<FabDataProps> {
  return (props) => <Fab {...(mergeProps(defaults, props) as FabProps)} />;
}
