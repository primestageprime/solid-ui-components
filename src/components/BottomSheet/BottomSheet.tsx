// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// BottomSheet — Atomic (Depth 1)
// Owns CSS (BottomSheet.css), no component imports.
//
// A sheet that slides up from the BOTTOM of its *parent container*.
// Differs from Modal: this is NOT a viewport portal overlay.
// The scrim and sheet are `position: absolute` inside the parent
// (which must be `position: relative`), so the sheet is bounded to
// that container and can never cover a sibling region above it.
//
// Controlled: open state is managed externally via `open` + `onClose`.
// ============================================
import { type Component, type JSX, Show } from "solid-js";
import "./BottomSheet.css";

export interface BottomSheetProps {
  /** Whether the sheet is visible. Controlled by the caller. */
  open: boolean;
  /** Called when the user dismisses via scrim click or grabber tap. */
  onClose: () => void;
  /** Body content rendered inside the sheet. */
  children?: JSX.Element;
  /** Accessible label for the sheet dialog region. */
  label?: string;
}

/** True when the click landed directly on the scrim (not a child). */
const isDirectScrimClick = (e: MouseEvent): boolean =>
  e.target === e.currentTarget;

export const BottomSheet: Component<BottomSheetProps> = (props) => {
  const sheetClass = () =>
    props.open ? "sui-bottom-sheet sui-bottom-sheet--open" : "sui-bottom-sheet";

  const handleScrimClick = (e: MouseEvent) => {
    if (isDirectScrimClick(e)) {
      props.onClose();
    }
  };

  return (
    // The scrim fills the parent's bounds absolutely; it blocks interaction
    // behind the sheet but only within the container — not the whole page.
    <div
      class={`sui-bottom-sheet-scrim${props.open ? " sui-bottom-sheet-scrim--visible" : ""}`}
      aria-hidden={!props.open}
      onClick={handleScrimClick}
    >
      <div
        class={sheetClass()}
        role="dialog"
        aria-modal="true"
        aria-label={props.label ?? "Bottom sheet"}
      >
        {/* Grabber — tap to dismiss */}
        <button
          type="button"
          class="sui-bottom-sheet__grabber"
          aria-label="Dismiss"
          onClick={props.onClose}
        >
          <span class="sui-bottom-sheet__grabber-pill" aria-hidden="true" />
        </button>

        {/* Sheet body — scrollable if content overflows */}
        <Show when={props.open}>
          <div class="sui-bottom-sheet__body">{props.children}</div>
        </Show>
      </div>
    </div>
  );
};
