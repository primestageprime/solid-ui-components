// ============================================
// AssigneeChips Curried Variants — Depth 2 (zero CSS)
// `size` is baked here; runtime data (ids/resolveName/resolve) stays exposed.
// ============================================
import { createAssigneeChips } from "./AssigneeChips";
import type { AssigneeChipsDataProps } from "./AssigneeChips";
import type { Component } from "solid-js";

/** Default (small) assignee chips. */
export const Assignees: Component<AssigneeChipsDataProps> = createAssigneeChips(
  {},
);

/** Medium assignee chips — for less dense contexts. */
export const MdAssigneeChips: Component<AssigneeChipsDataProps> =
  createAssigneeChips({ size: "md" });
