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
// One presentational knob: `size` (glyph height, px). The SVG viewBox scales
// stroke, shapes, and initials together, so a single number is the whole story.
// It is an Override, frozen by createAssigneeIcon — call sites keep passing
// data only (`initials` / `kind` / `active`); the bare `AssigneeIcon` export
// stays the zero-config row-sized default (the SortableList-style data-only
// exception). Larger roles (e.g. a navbar presence cluster) import a curried
// variant from variants.ts instead of setting `size` inline.
// The `active` class hook lights the icon for a filter match; it is a data flag,
// not a style knob.
//
// `initials` is caller-supplied and truncated to 2 chars here. To pick initials
// that DISAMBIGUATE across a roster (so two "Peter …" people don't both read
// "P"), derive them once with `deriveInitials(names)` from ./initials and feed
// the result in — this component does not disambiguate on its own.
// ============================================
import { Component, JSX, Show, mergeProps } from "solid-js";
import "./AssigneeIcon.css";

export interface AssigneeIconProps {
  /** Up to 2 characters, centered in the icon. */
  initials: string;
  /** Person silhouette or antennaed robot head. Default "person". */
  kind?: "person" | "ai";
  /** Highlighted (e.g. matched the active filter). Data-driven, not a style knob. */
  active?: boolean;
  /**
   * Override — glyph height in px (default 23; width keeps the 25:23 box).
   * Freeze it via createAssigneeIcon; never set it at a call site.
   */
  size?: number;
}

export type AssigneeIconOverrides = Pick<AssigneeIconProps, "size">;
export type AssigneeIconDataProps = Omit<AssigneeIconProps, keyof AssigneeIconOverrides>;

export const AssigneeIcon: Component<AssigneeIconProps> = (props) => {
  const chars = () => props.initials.slice(0, 2);
  // Scale from one number: height is authoritative, width preserves the
  // default 25×23 box. Inline so it wins over the stylesheet default.
  const svgStyle = (): JSX.CSSProperties | undefined =>
    props.size
      ? { width: `${Math.round((props.size * 25) / 23)}px`, height: `${props.size}px` }
      : undefined;
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
          <svg
            viewBox="0 0 28 26"
            style={svgStyle()}
            aria-label={`Assigned to ${props.initials} (person)`}
          >
            <circle cx="14" cy="10" r="8.75" />
            <path d="M5 25 v-0.5 a9 4.5 0 0 1 18 0 v0.5 z" />
            <text x="14" y="13">{chars()}</text>
          </svg>
        }
      >
        {/* AI: robot head with two antennae. */}
        <svg
          viewBox="0 0 28 26"
          style={svgStyle()}
          aria-label={`Assigned to ${props.initials} (AI)`}
        >
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

/**
 * Freeze the presentational Override (`size`) so call sites stay data-only.
 * Concrete curried variants live in variants.ts.
 */
export function createAssigneeIcon(
  overrides: AssigneeIconOverrides = {},
): Component<AssigneeIconDataProps> {
  return (props) => <AssigneeIcon {...mergeProps(overrides, props)} />;
}
