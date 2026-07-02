// ============================================
// AssigneeIcon — Atomic Primitive (Depth 1)
// Owns CSS (AssigneeIcon.css), no component imports.
// Placement: lives in src/components/ParticipantAvatar/ as a sibling of the
// filled avatar (a separate primitive, NOT a createParticipantAvatar variant —
// different rendering), to keep person-representation glyphs in one family.
//
// The outline sibling of ParticipantAvatar. Where ParticipantAvatar is a
// FILLED circular disc (image or tinted initials) for showing WHO is present,
// AssigneeIcon is an OUTLINE-only glyph — a person silhouette or an antennaed
// robot head — driven entirely by `currentColor`, for showing who/what a row is
// ASSIGNED to (person vs AI). Up to two initials sit centered inside the head.
// Do NOT modify ParticipantAvatar; the two are deliberately distinct roles.
//
// NO curried variant — intentional, and by rule. Every prop is data
// (`initials` / `kind` / `active`); there is nothing presentational
// (size/variant/tone) to freeze. Per the "curried set" rule the exception is
// data-only components, exactly like SortableList: the base component is
// already zero-config at the call site, so a curried drop-in would add no value.
// The `active` class hook lights the icon for a filter match; it is a data flag,
// not a style knob.
// ============================================
import { Component, Show } from "solid-js";
import "./AssigneeIcon.css";

export interface AssigneeIconProps {
  /** Up to 2 characters, centered in the icon. */
  initials: string;
  /** Person silhouette or antennaed robot head. Default "person". */
  kind?: "person" | "ai";
  /** Highlighted (e.g. matched the active filter). Data-driven, not a style knob. */
  active?: boolean;
}

export const AssigneeIcon: Component<AssigneeIconProps> = (props) => {
  const chars = () => props.initials.slice(0, 2);
  return (
    <span
      class="sui-assignee-icon"
      classList={{ "sui-assignee-icon--active": props.active }}
      title={props.initials}
    >
      <Show
        when={props.kind === "ai"}
        fallback={
          /* Person: classic user icon — head circle (holds the initials) above
             rounded shoulders. */
          <svg viewBox="0 0 28 26" aria-label={`Assigned to ${props.initials} (person)`}>
            <circle cx="14" cy="10" r="8.75" />
            <path d="M5 25 v-0.5 a9 4.5 0 0 1 18 0 v0.5 z" />
            <text x="14" y="13">{chars()}</text>
          </svg>
        }
      >
        {/* AI: robot head with two antennae. */}
        <svg viewBox="0 0 28 26" aria-label={`Assigned to ${props.initials} (AI)`}>
          <line x1="9" y1="10" x2="7" y2="4" />
          <circle class="dot" cx="6.7" cy="3" r="1.6" />
          <line x1="19" y1="10" x2="21" y2="4" />
          <circle class="dot" cx="21.3" cy="3" r="1.6" />
          <rect x="4" y="10" width="20" height="14" rx="2" />
          <text x="14" y="20.5">{chars()}</text>
        </svg>
      </Show>
    </span>
  );
};
