// ============================================
// ConfirmationModal — Depth 2 (zero CSS)
// Composes Modal (Atomic) + Button (Atomic).
// Confirmation dialog with Cancel/Confirm footer.
// ============================================
import { Component, JSX, splitProps, Show } from "solid-js";
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
  /** Body content (e.g. a table of records to review) */
  children?: JSX.Element;
}

export const ConfirmationModal: Component<ConfirmationModalProps> = (props) => {
  const [local, others] = splitProps(props, [
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
    "children",
  ]);

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
        <div style={{ display: "flex", gap: "12px", "justify-content": "flex-end" }}>
          <Button
            size="sm"
            onClick={local.onClose}
            disabled={local.loading}
          >
            {local.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            variant={local.confirmVariant ?? "primary"}
            size="sm"
            onClick={local.onConfirm}
            loading={local.loading}
          >
            {confirmText()}
          </Button>
        </div>
      }
    >
      <div style={{ "max-height": "60vh", overflow: "auto" }}>
        <Show when={local.description}>
          <p style={{
            margin: "0 0 16px",
            color: "var(--sui-text-secondary)",
            "font-size": "0.875rem",
          }}>
            {local.description}
          </p>
        </Show>
        {local.children}
      </div>
    </Modal>
  );
};
