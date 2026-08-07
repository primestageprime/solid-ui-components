// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ConfirmationModal — Depth 2 (zero CSS)
// Composes Modal (Atomic) + Button (Atomic).
// Confirmation dialog with Cancel/Confirm footer.
// ============================================
import {
  type Component,
  type JSX,
  createEffect,
  splitProps,
  Show,
  mergeProps,
} from "solid-js";
import { Modal } from "./Modal";
import { Button } from "../Button/Button";
import type { ColorVariant, CornerStyle } from "../../types";

export interface ConfirmationModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal is closed (via overlay, escape, or cancel) */
  onClose: () => void;
  /** Called when the confirm button is clicked */
  onConfirm: () => void;
  /** Modal title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Description text shown above the body content */
  description?: string;
  /** Modal size (default: "lg") */
  size?: "sm" | "md" | "lg" | "xl";
  /** Corner decoration style (default: "clip") */
  corners?: CornerStyle;
  /** Accent color variant (default: "primary") */
  variant?: ColorVariant;
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Label shown on confirm button when loading (default: confirmLabel) */
  loadingLabel?: string;
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Whether a confirm action is in progress */
  loading?: boolean;
  /** Confirm button variant (default: "primary") */
  confirmVariant?: "primary" | "danger";
  /** Focuses the confirm button as soon as the modal opens, so [Enter]
   *  confirms without reaching for the mouse. Off by default, and worth
   *  leaving off for a genuinely destructive confirm reached by accident —
   *  a focused confirm turns a stray [Enter] into the action itself. Opt in
   *  where the dialog is a deliberate step in a keyboard-driven flow (the
   *  user already pressed a key to get here) rather than an interruption.
   *  [Escape] still cancels either way (see Modal). */
  autoFocusConfirm?: boolean;
  /** Body content (e.g. a table of records to review) */
  children?: JSX.Element;
}

export const ConfirmationModal: Component<ConfirmationModalProps> = (props) => {
  const [local, _others] = splitProps(props, [
    "open",
    "onClose",
    "onConfirm",
    "title",
    "subtitle",
    "description",
    "size",
    "corners",
    "variant",
    "confirmLabel",
    "loadingLabel",
    "cancelLabel",
    "loading",
    "confirmVariant",
    "autoFocusConfirm",
    "children",
  ]);

  // Focus lands on the confirm button one microtask AFTER the modal renders:
  // Modal only mounts its Portal once `open` is true, so at the moment this
  // effect first runs on the opening transition the button element doesn't
  // exist yet. Re-focuses on every open, not just the first — the same
  // element instance is reused across close/open cycles.
  let confirmRef: HTMLButtonElement | undefined;
  createEffect(() => {
    if (!local.open || !local.autoFocusConfirm) return;
    queueMicrotask(() => confirmRef?.focus());
  });

  const confirmText = () => {
    if (local.loading && local.loadingLabel) return local.loadingLabel;
    return local.confirmLabel ?? "Confirm";
  };

  return (
    <Modal
      open={local.open}
      onClose={local.onClose}
      title={local.title}
      subtitle={local.subtitle}
      size={local.size ?? "lg"}
      corners={local.corners ?? "clip"}
      variant={local.variant ?? "primary"}
      footer={
        <>
          {/* Modal's own .sui-modal__footer already lays out a right-aligned
              12px-gap button row — no wrapper needed. */}
          <Button size="sm" onClick={local.onClose} disabled={local.loading}>
            {local.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            ref={confirmRef}
            variant={local.confirmVariant ?? "primary"}
            size="sm"
            onClick={local.onConfirm}
            loading={local.loading}
          >
            {confirmText()}
          </Button>
        </>
      }
    >
      <div class="sui-confirmation-modal__body">
        <Show when={local.description}>
          <p class="sui-confirmation-modal__description">{local.description}</p>
        </Show>
        {local.children}
      </div>
    </Modal>
  );
};

/** Visual overrides — locked at variant-definition time (incl. the destructive confirm tone). */
export type ConfirmationModalOverrides = Pick<
  ConfirmationModalProps,
  "size" | "corners" | "variant" | "confirmVariant"
>;

/** Props available to consumers of a curried ConfirmationModal variant. */
export type ConfirmationModalDataProps = Omit<
  ConfirmationModalProps,
  keyof ConfirmationModalOverrides
>;

export function createConfirmationModal(
  defaults: Partial<ConfirmationModalProps>,
): Component<ConfirmationModalDataProps> {
  return (props) => <ConfirmationModal {...mergeProps(defaults, props)} />;
}
