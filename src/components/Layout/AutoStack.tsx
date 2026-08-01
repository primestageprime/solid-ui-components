// ============================================
// AutoStackRow / AutoStackItem — Primitive (Depth 1)
// Owns CSS (Layout.css). Responsive "holy-albatross" row: children sit SIDE BY
// SIDE when the container is wider than `breakWidth`, and STACK (each full-width)
// when it is narrower — with no container query or JS. The row exposes the
// breakpoint as the `--auto-stack-break` CSS var; each AutoStackItem's
// flex-basis calc reads it to flip between the two arrangements.
//
// Usage:
//   <AutoStackRow breakWidth="38rem">
//     <AutoStackItem><NameField/><AmountField/></AutoStackItem>
//     <AutoStackItem><SchedulePicker/></AutoStackItem>
//   </AutoStackRow>
//
// Force the stacked arrangement at every width with `stacked`.
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import "./Layout.css";

export interface AutoStackRowProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Container width (any CSS length) below which items stack. Default "38rem". */
  breakWidth?: string;
  /** Gap between items. Default `md` (12px). */
  gap?: "xs" | "sm" | "md";
  /** Force the stacked arrangement (every item full-width) at all widths. */
  stacked?: boolean;
}

export const AutoStackRow: Component<AutoStackRowProps> = (rawProps) => {
  const props = mergeProps({ gap: "md" as const }, rawProps);
  const [local, others] = splitProps(props, [
    "breakWidth",
    "gap",
    "stacked",
    "class",
    "style",
    "children",
  ]);
  const classes = () => {
    const cls = ["auto-stack-row", `auto-stack-row--gap-${local.gap}`];
    if (local.stacked) cls.push("auto-stack-row--stacked");
    if (local.class) cls.push(local.class);
    return cls.join(" ");
  };
  const style = (): JSX.CSSProperties | string => {
    const base: JSX.CSSProperties = {
      "--auto-stack-break": local.breakWidth ?? "38rem",
    };
    return typeof local.style === "string"
      ? local.style
      : { ...base, ...local.style };
  };
  return (
    <div class={classes()} style={style()} {...others}>
      {local.children}
    </div>
  );
};

export interface AutoStackItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Vertical gap between this item's own children (it is a column). Default `sm` (8px). */
  gap?: "xs" | "sm";
}

export const AutoStackItem: Component<AutoStackItemProps> = (rawProps) => {
  const props = mergeProps({ gap: "sm" as const }, rawProps);
  const [local, others] = splitProps(props, ["gap", "class", "children"]);
  const classes = () => {
    const cls = ["auto-stack-item", `auto-stack-item--gap-${local.gap}`];
    if (local.class) cls.push(local.class);
    return cls.join(" ");
  };
  return (
    <div class={classes()} {...others}>
      {local.children}
    </div>
  );
};
