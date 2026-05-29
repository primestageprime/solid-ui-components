// ============================================
// Feedback Curried Variants — Depth 2 (zero CSS)
// AlertBox: status variant baked. EmptyState: variant/size baked.
// Runtime content (title/description/action/message/icon) stays exposed.
// ============================================
import { createAlertBox } from "./AlertBox";
import type { AlertBoxDataProps } from "./AlertBox";
import { createEmptyState } from "./EmptyState";
import type { EmptyStateDataProps } from "./EmptyState";
import type { Component } from "solid-js";

/** Informational alert. */
export const InfoAlert: Component<AlertBoxDataProps> = createAlertBox({ variant: "info" });
/** Warning alert. */
export const WarningAlert: Component<AlertBoxDataProps> = createAlertBox({ variant: "warning" });
/** Success alert. */
export const SuccessAlert: Component<AlertBoxDataProps> = createAlertBox({ variant: "success" });
/** Danger/error alert. */
export const DangerAlert: Component<AlertBoxDataProps> = createAlertBox({ variant: "danger" });

/** Default centered empty-state placeholder. */
export const EmptyState: Component<EmptyStateDataProps> = createEmptyState({});
/** Muted empty-state — de-emphasized message. */
export const MutedEmptyState: Component<EmptyStateDataProps> = createEmptyState({ variant: "muted" });
