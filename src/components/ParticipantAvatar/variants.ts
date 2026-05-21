// ============================================
// ParticipantAvatar Curried Variants — Depth 1 (zero CSS)
// Pre-configured ParticipantAvatar via createParticipantAvatar().
// ============================================
import type { Component } from "solid-js";
import { createParticipantAvatar } from "./ParticipantAvatar";
import type { ParticipantAvatarDataProps } from "./ParticipantAvatar";

/** Small (20px) — for tight indicator rows / chip-style references. */
export const SmAvatar: Component<ParticipantAvatarDataProps> =
  createParticipantAvatar({ size: "sm" });

/** Medium (24px) — the default for inline conversation rows. */
export const MdAvatar: Component<ParticipantAvatarDataProps> =
  createParticipantAvatar({ size: "md" });

/** Large (36px) — for participant lists / detail headers. */
export const LgAvatar: Component<ParticipantAvatarDataProps> =
  createParticipantAvatar({ size: "lg" });
