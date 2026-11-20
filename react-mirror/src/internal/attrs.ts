// The pass-through attributes every SUI base accepts, in either spelling:
// SUI's variant tables and docs write Solid's (`class`, `tabindex`, dashed
// style keys), a React author writes React's. `domProps` reconciles them.
import type { CSSProperties, HTMLAttributes } from "react";
import type { SolidStyle } from "./style.ts";

export type Attrs<E extends HTMLElement = HTMLElement> = Omit<
  HTMLAttributes<E>,
  "style" | "className" | "children"
> & {
  readonly class?: string;
  readonly className?: string;
  readonly style?: SolidStyle | CSSProperties;
  readonly tabindex?: number;
  readonly [data: `data-${string}`]: string | number | boolean | undefined;
};
