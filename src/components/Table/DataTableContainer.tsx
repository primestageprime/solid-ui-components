// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// DataTableContainer — Atomic (Depth 1)
// Owns CSS (DataTableContainer.css), no component imports.
// Scrollable container with max-height or flex-fill mode.
// ============================================
import { type JSX, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { ScrollBox, ScrollFillBox } from "../Layout/variants";
import "./DataTableContainer.css";

export interface DataTableContainerProps
  extends JSX.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string;
  fill?: boolean;
}

export function DataTableContainer(props: DataTableContainerProps) {
  const [local, others] = splitProps(props, [
    "maxHeight",
    "fill",
    "class",
    "children",
  ]);

  const classes = () => {
    const cls = ["data-table-container"];
    if (local.fill) cls.push("data-table-container--fill");
    if (local.class) cls.push(local.class);
    return cls.join(" ");
  };

  // Scroll region composed via Layout (layout-purity): `fill` → a grow both-axis
  // scroll box (ScrollFillBox); otherwise a height-capped both-axis scroll box
  // (ScrollBox + inline max-height *size*). position:relative stays in CSS so
  // sticky-header/row children anchor to this scroll container.
  return (
    <Dynamic
      component={local.fill ? ScrollFillBox : ScrollBox}
      class={classes()}
      style={
        local.fill ? undefined : { "max-height": local.maxHeight ?? "500px" }
      }
      {...others}
    >
      {local.children}
    </Dynamic>
  );
}
