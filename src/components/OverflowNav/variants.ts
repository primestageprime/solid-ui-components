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
