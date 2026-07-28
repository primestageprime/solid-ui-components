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
