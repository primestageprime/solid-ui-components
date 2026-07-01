// ============================================
// Modal Curried Variants — Depth 1/2 (zero CSS)
// Visual config (corners/variant/size, and the destructive confirm tone)
// is baked; open/onClose/onConfirm/title/children stay runtime.
// ============================================
import { createModal } from "./Modal";
import type { ModalDataProps } from "./Modal";
import { createConfirmationModal } from "./ConfirmationModal";
import type { ConfirmationModalDataProps } from "./ConfirmationModal";
import type { Component } from "solid-js";

/** Default modal. */
export const Modal: Component<ModalDataProps> = createModal({});
/** Large modal. */
export const LargeModal: Component<ModalDataProps> = createModal({
  size: "lg",
});
/** Fullscreen modal. */
export const FullscreenModal: Component<ModalDataProps> = createModal({
  size: "fullscreen",
});

/** Standard confirm dialog (primary confirm). */
export const ConfirmationModal: Component<ConfirmationModalDataProps> =
  createConfirmationModal({});
/** Destructive confirm dialog — danger-toned confirm button + accent. */
export const DangerConfirmationModal: Component<ConfirmationModalDataProps> =
  createConfirmationModal({
    confirmVariant: "danger",
    variant: "danger",
  });
