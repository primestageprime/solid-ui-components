// ============================================
// DataTableContainer — Atomic (Depth 1)
// Owns CSS (DataTableContainer.css), no component imports.
// Scrollable container with max-height or flex-fill mode.
// ============================================
import { JSX, splitProps } from "solid-js";
import "./DataTableContainer.css";

export interface DataTableContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string;
  fill?: boolean;
}

export function DataTableContainer(props: DataTableContainerProps) {
  const [local, others] = splitProps(props, ["maxHeight", "fill", "class", "children"]);

  const classes = () => {
    const cls = ["data-table-container"];
    if (local.fill) cls.push("data-table-container--fill");
    if (local.class) cls.push(local.class);
    return cls.join(" ");
  };

  return (
    <div
      class={classes()}
      style={local.fill ? undefined : { "max-height": local.maxHeight ?? "500px" }}
      {...others}
    >
      {local.children}
    </div>
  );
}
