// Bases (Modal, ConfirmationModal) are intentionally NOT exported — use curried variants ONLY (no create* factories at call sites — if the variant you need is missing, add it here).
export { createModal } from "./Modal";
export type { ModalDataProps } from "./Modal";
export { createConfirmationModal } from "./ConfirmationModal";
export type { ConfirmationModalDataProps } from "./ConfirmationModal";
export * from "./variants";
