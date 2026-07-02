// ============================================
// ActionList Curried Variant — Depth 3 (zero CSS)
// The drop-in ActionList with the default status→tone map baked in (DONE dim,
// DOING highlight, neutral fallback). App call sites pass only data + callbacks;
// the tone mapping never leaks to the call site. Follows the createButton /
// createPanel currying pattern.
// ============================================
import { createActionList, DEFAULT_STATUS_TONES } from "./ActionList";
import type { ActionListDataProps } from "./ActionList";
import type { Component } from "solid-js";

/** Drop-in ActionList — default tones baked; call site is data-only. */
export const ActionList: Component<ActionListDataProps> = createActionList({
  statusTones: DEFAULT_STATUS_TONES,
});
