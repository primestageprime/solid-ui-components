// ============================================
// OverflowNav Curried Variants — Depth 2 (zero CSS)
// gap/align are baked at the library default; `items` stays runtime data.
// ============================================
import { createOverflowNav } from "./OverflowNav";
import type { OverflowNavDataProps } from "./OverflowNav";
import type { Component } from "solid-js";

/** Default auto-collapsing nav. */
export const OverflowNav: Component<OverflowNavDataProps> = createOverflowNav(
  {},
);

/** Nav whose items sit CENTRED in its own full-width box — still folding into
 *  the kebab when that box gets too narrow. For a header's middle slot
 *  (AppBar's nav, "centred in the available space"). */
export const CenteredOverflowNav: Component<OverflowNavDataProps> =
  createOverflowNav({ justify: "center" });
