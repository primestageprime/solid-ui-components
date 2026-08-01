// Base (ParticipantAvatar) is intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createParticipantAvatar } from "./ParticipantAvatar";
export type { ParticipantAvatarDataProps } from "./ParticipantAvatar";
export * from "./variants";
// AssigneeIcon — the OUTLINE sibling of ParticipantAvatar (currentColor person /
// AI glyph vs the filled disc). A separate primitive in this folder, not a
// createParticipantAvatar variant (different rendering). Data-only at the call
// site; `size` is an Override frozen via createAssigneeIcon (bare export = the
// 23px row default).
export { AssigneeIcon, createAssigneeIcon } from "./AssigneeIcon";
export type {
  AssigneeIconProps,
  AssigneeIconOverrides,
  AssigneeIconDataProps,
} from "./AssigneeIcon";
// deriveInitials — pure helper deciding WHICH up-to-2 characters a roster of
// names shows, so AssigneeIcon / ParticipantAvatar initials disambiguate
// consistently (Peter Stradinger + Peter Falk → PS + PF).
export { deriveInitials } from "./initials";
