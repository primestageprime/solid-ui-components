// ============================================
// NotificationCenter — action data (Depth 3 support)
// Resolution rules plus the prefab action builders. Pure data functions; no
// JSX, no component imports.
// ============================================
import type { NotificationAction, NotificationItem } from "./types";

/** `actions` wins; the deprecated singular `action` folds in as a one-element
 *  list so the old shape keeps working unchanged. */
export const resolveActions = (item: NotificationItem): NotificationAction[] =>
  item.actions ?? (item.action ? [item.action] : []);

/** Close the panel after this action fires. An explicit `dismissPanel` wins.
 *  Otherwise navigating actions close (you have left the panel), in-place ones
 *  do not (you are still triaging) — and handler-less ones close, because that
 *  is the deprecated `action` shape, which predates the flag and always did. */
export const closesPanel = (a: NotificationAction): boolean =>
  a.dismissPanel ?? (!!a.href || !a.onClick);

// ── Prefab actions ──────────────────────────────────────────────────────────
// Builders that take the handler, per the Table field-module precedent
// (`actionCol(id, run)`). None sets `dismissPanel`: the default already gives
// the right answer — `viewAction` navigates so it closes, the rest are in-place
// triage so they leave the panel open. `NotificationAction` is public, so a
// consumer needing a seventh writes an object literal.

/** Navigating CTA — renders as a Link with the → suffix and closes the panel. */
export const viewAction = (
  href: string,
  label = "View",
): NotificationAction => ({ label, href, tone: "accent" });

/** Clears the notification. The consumer owns removing it from `items`. */
export const dismissAction = (
  onClick: () => void,
  label = "Dismiss",
): NotificationAction => ({ label, onClick, tone: "muted", icon: "close" });

/** Per-item sibling of the `onMarkAllRead` footer, so the two read as a set. */
export const markReadAction = (
  onClick: () => void,
  label = "Mark read",
): NotificationAction => ({ label, onClick, tone: "muted", icon: "check" });

export const acceptAction = (
  onClick: () => void,
  label = "Accept",
): NotificationAction => ({ label, onClick, tone: "accent", icon: "check" });

export const declineAction = (
  onClick: () => void,
  label = "Decline",
): NotificationAction => ({ label, onClick, tone: "danger", icon: "close" });

/** Destroys the underlying thing — distinct from `dismissAction`, which only
 *  clears the notification. */
export const deleteAction = (
  onClick: () => void,
  label = "Delete",
): NotificationAction => ({ label, onClick, tone: "danger", icon: "trash" });
