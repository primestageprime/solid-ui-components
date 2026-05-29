// Bases (Modal, ConfirmationModal) are intentionally NOT exported — use curried variants or factories.
export { createModal } from "./Modal";
export type { ModalDataProps } from "./Modal";
export { createConfirmationModal } from "./ConfirmationModal";
export type { ConfirmationModalDataProps } from "./ConfirmationModal";
export * from "./variants";
