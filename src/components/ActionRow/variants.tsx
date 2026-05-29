// ============================================
// ActionRow Curried Variants
// Scalar config (`tone`) is baked through the createActionRow() factory.
// Slot decoration (`leading` = a StatusLight) is baked via thin wrapper
// components, NOT through the factory: a JSX element placed in factory
// defaults is evaluated once at module load and would be shared across
// every row instance. The wrappers instantiate a fresh StatusLight per
// render. Both forms return Component<ActionRowDataProps>, so the baked
// props (`tone`, `leading`) are not accepted at call sites — only runtime
// data (`children`, `trailing`, `actions`) remains.
// ============================================
import { Component } from "solid-js";
import { ActionRow, createActionRow } from "./ActionRow";
import type { ActionRowDataProps } from "./ActionRow";
import { StatusLight } from "../StatusLight/StatusLight";

// --- Tone baked (scalar — safe through the factory) ---

/** Destructive-context row — danger tint. */
export const DangerActionRow: Component<ActionRowDataProps> = createActionRow({ tone: "danger" });

/** Highlighted / selected-context row — accent tint. */
export const AccentActionRow: Component<ActionRowDataProps> = createActionRow({ tone: "accent" });

// --- Leading status light baked (slot — fresh node required per render) ---

/** Row for a live/active entity — pulsing green status dot pinned in the leading slot. */
export const ActiveActionRow: Component<ActionRowDataProps> = (props) => (
  <ActionRow leading={<StatusLight variant="success" pulse />} {...props} />
);

/** Row for an inactive/off entity — idle gray status dot pinned in the leading slot. */
export const InactiveActionRow: Component<ActionRowDataProps> = (props) => (
  <ActionRow leading={<StatusLight variant="idle" />} {...props} />
);
