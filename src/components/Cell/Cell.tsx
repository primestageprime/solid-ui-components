// ============================================
// Cell + CellTable + CellRow — Primitive (Depth 0)
// Owns CSS (Cell.css). Table cell/row/table primitives
// with align/color/weight. Factories: createCell(),
// createCellTable(), createCellRow().
// ============================================
import { Component, JSX, mergeProps, ParentComponent, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import "./Cell.css";

// ── Cell (td / th) ──────────────────────────────────────────────────

export interface CellProps extends JSX.TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "right" | "center";
  color?: string;
  weight?: "normal" | "medium" | "semibold";
  as?: "td" | "th";
}

export const Cell: Component<CellProps> = (props) => {
  const [local, others] = splitProps(props, [
    "align",
    "color",
    "weight",
    "as",
    "class",
    "children",
    "style",
  ]);

  const classes = () => {
    const classList = ["cell"];
    if (local.align) classList.push(`cell--align-${local.align}`);
    if (local.weight) classList.push(`cell--weight-${local.weight}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const mergedStyle = (): JSX.CSSProperties | undefined => {
    if (!local.color) return local.style as JSX.CSSProperties | undefined;
    const base = (typeof local.style === "object" ? local.style : {}) as JSX.CSSProperties;
    return { ...base, color: local.color };
  };

  return (
    <Dynamic component={local.as || "td"} class={classes()} style={mergedStyle()} {...others}>
      {local.children}
    </Dynamic>
  );
};

export function createCell(defaults: Partial<Omit<CellProps, "children">>): Component<CellProps> {
  return (props) => <Cell {...mergeProps(defaults, props)} />;
}

// ── CellTable (table > tbody) ───────────────────────────────────────

export interface CellTableProps extends JSX.HTMLAttributes<HTMLTableElement> {
  header?: JSX.Element;
}

export const CellTable: ParentComponent<CellTableProps> = (props) => {
  const [local, others] = splitProps(props, ["header", "class", "children"]);

  return (
    <table class={`cell-table ${local.class ?? ""}`} {...others}>
      {local.header && <thead>{local.header}</thead>}
      <tbody>{local.children}</tbody>
    </table>
  );
};

export function createCellTable(defaults: Partial<Omit<CellTableProps, "children">>): ParentComponent<CellTableProps> {
  return (props) => <CellTable {...mergeProps(defaults, props)} />;
}

// ── CellRow (tr) ────────────────────────────────────────────────────

export interface CellRowProps extends JSX.HTMLAttributes<HTMLTableRowElement> {
  border?: boolean;
  highlight?: boolean;
}

export const CellRow: ParentComponent<CellRowProps> = (props) => {
  const [local, others] = splitProps(props, ["border", "highlight", "class", "children"]);

  const classes = () => {
    const classList = ["cell-row"];
    if (local.border) classList.push("cell-row--border");
    if (local.highlight) classList.push("cell-row--highlight");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <tr class={classes()} {...others}>
      {local.children}
    </tr>
  );
};

export function createCellRow(defaults: Partial<Omit<CellRowProps, "children">>): ParentComponent<CellRowProps> {
  return (props) => <CellRow {...mergeProps(defaults, props)} />;
}
