// ============================================
// ActionRow Curried Variants — Depth 2 (zero CSS)
// `tone` is baked here; runtime data (actions/leading/trailing/children)
// stays exposed.
// ============================================
import { createActionRow } from "./ActionRow";
import type { ActionRowDataProps } from "./ActionRow";
import type { Component } from "solid-js";

/** Default-tone action row. */
export const PlainActionRow: Component<ActionRowDataProps> = createActionRow(
  {},
);

/** Danger-tone action row — destructive context. */
export const DangerActionRow: Component<ActionRowDataProps> = createActionRow({
  tone: "danger",
});

/** Accent-tone action row — emphasized context. */
export const AccentActionRow: Component<ActionRowDataProps> = createActionRow({
  tone: "accent",
});
