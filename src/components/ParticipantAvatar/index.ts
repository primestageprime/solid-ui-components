// Base (ParticipantAvatar) is intentionally NOT exported — use curried variants or createParticipantAvatar().
export { createParticipantAvatar } from "./ParticipantAvatar";
export type { ParticipantAvatarDataProps } from "./ParticipantAvatar";
export * from "./variants";
// AssigneeIcon — the OUTLINE sibling of ParticipantAvatar (currentColor person /
// AI glyph vs the filled disc). A separate primitive in this folder, not a
// createParticipantAvatar variant (different rendering). Data-only.
export { AssigneeIcon } from "./AssigneeIcon";
export type { AssigneeIconProps } from "./AssigneeIcon";
