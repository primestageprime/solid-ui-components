// ============================================
// StatusChipDisplay — Atomic Primitive (Depth 1)
// Owns no CSS of its own: it wears StatusChip.css. No component imports.
// Placement: src/components/Badge/, the READ-ONLY sibling of StatusChip.
// The same fixed-width pill as StatusChip, with nothing to press: no edit
// region, no caret, no menu, no hover underline, and no button for assistive
// technology to announce as editable. For a card that SHOWS a status and
// leaves changing it to the detail view. `highlight` fills the pill with the
// accent tint for the active status, exactly as StatusChip does, and the width
// is the same longest-option width, so a display chip beside an editable one
// lines up.
// Data-only (status / options / highlight), so it is exported directly.
// ============================================
import type { Component } from "solid-js";
import { statusChipWidthCh } from "./StatusChip";
import "./StatusChip.css";

export interface StatusChipDisplayProps {
  /** The status to show. */
  status: string;
  /** Known statuses; only used to fix the pill's width to the longest, so it matches an editable chip. */
  options?: string[];
  /** Accent fill for the active status (e.g. DOING). Data-driven, not a style knob. */
  highlight?: boolean;
}

export const StatusChipDisplay: Component<StatusChipDisplayProps> = (props) => {
  // The width is data (the longest status), the one value that cannot be a class.
  const geometry = () => ({
    width: `${statusChipWidthCh(props.status, props.options)}ch`,
  });
  return (
    <span
      class="sui-status-chip sui-status-chip--display"
      classList={{ "sui-status-chip--highlight": props.highlight }}
      style={geometry()}
    >
      <span class="sui-status-chip__text sui-status-chip__text--display">
        {props.status}
      </span>
    </span>
  );
};
