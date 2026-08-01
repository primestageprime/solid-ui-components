// ============================================
// GhostRow — Atomic (Depth 1)
// Owns CSS (GhostRow.css), no component imports.
// A de-emphasized clickable row: dimmed unless `selected` (data flag, like
// TagPill's `active`), pointer cursor only when an onClick is wired.
// Born from the triage bench's right-rail children and dependency links —
// one-line ghost rows that select an item on click. `indent` (padding-as-
// inset, an Override) nests the row under a rail heading.
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import "./GhostRow.css";

export interface GhostRowProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Data flag: this row is the current selection — renders full-strength. */
  selected?: boolean;
  /** Override: inset the row under its heading (rail children). */
  indent?: boolean;
}

export const GhostRow: Component<GhostRowProps> = (props) => {
  const [local, others] = splitProps(props, [
    "selected",
    "indent",
    "class",
    "children",
  ]);
  const classes = () => {
    const list = ["sui-ghost-row"];
    if (local.selected) list.push("sui-ghost-row--selected");
    if (local.indent) list.push("sui-ghost-row--indent");
    if (props.onClick) list.push("sui-ghost-row--clickable");
    if (local.class) list.push(local.class);
    return list.join(" ");
  };
  return (
    <div class={classes()} {...others}>
      {local.children}
    </div>
  );
};

export type GhostRowOverrides = Pick<GhostRowProps, "indent">;
export type GhostRowDataProps = Omit<GhostRowProps, keyof GhostRowOverrides>;

export function createGhostRow(
  defaults: Partial<Omit<GhostRowProps, "children">>,
): Component<GhostRowDataProps> {
  return (props) => <GhostRow {...mergeProps(defaults, props as GhostRowProps)} />;
}

/** Rail-child form: inset one step under its section heading. */
export const IndentedGhostRow = createGhostRow({ indent: true });
