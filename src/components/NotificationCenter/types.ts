// ============================================
// NotificationCenter — types (Depth 3 support)
// The public data contract, extracted so the component, the row, and the
// prefab action builders share one definition without an import cycle.
// ============================================
import type { JSX } from "solid-js";
import type { IconName } from "../Icon/Icon";

export type NotificationTone = "info" | "task" | "warning";

/** Colour of an inline action control. Maps onto Button's tone matrix. */
export type NotificationActionTone = "accent" | "muted" | "danger";

export interface NotificationAction {
  label: string;
  /** Fires on activation. An action with NEITHER `onClick` nor `href` falls
   *  back to the component-level `onAction(item)` — that is the deprecated
   *  singular `action` shape, kept working. */
  onClick?: () => void;
  /** Renders the action as a `Link` (with the → suffix) rather than a button. */
  href?: string;
  /** Default `"accent"`. */
  tone?: NotificationActionTone;
  icon?: IconName;
  disabled?: boolean;
  /** Close the panel after firing. Default: navigating actions close, and so
   *  do handler-less ones (deprecated-shape parity). See `closesPanel`. */
  dismissPanel?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  detail?: string;
  /** Arbitrary body content, rendered between the detail line and the action
   *  row. A THUNK, not a JSX.Element: feeds are routinely built as
   *  module-scope arrays, and eagerly-constructed JSX there escapes the
   *  reactive root — anything reactive inside it would warn and not track.
   *  The thunk defers construction into the row's render. */
  body?: () => JSX.Element;
  /** Any number of actions, rendered in order in a wrapping row. */
  actions?: NotificationAction[];
  /** @deprecated Use `actions`. Folded in as a single-element list. */
  action?: NotificationAction;
  transient?: boolean;
  tone?: NotificationTone;
  /** Pre-formatted relative time ("2m", "1d"). SUI ships no date formatter —
   *  the consumer owns humanization and its locale. */
  when?: string;
  /** Already seen. Read items lose the unread dot and leave the badge count. */
  read?: boolean;
}

export interface NotificationCenterProps {
  items: NotificationItem[];
  badgeCount?: number;
  busy?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Row-level activation: fires when the row body is clicked (supplying it is
   *  also what MAKES the row clickable — omit it and the row is inert), and as
   *  the fallback for an action carrying no `onClick` of its own. */
  onAction?: (item: NotificationItem) => void;
  emptyLabel?: string;
  label?: string;
  badgeTone?: "accent" | "neutral" | "danger";
  /** Supplying this renders the pinned footer action; omit it and the footer
   *  (and its divider) never mount — the panel has no dead affordance. */
  onMarkAllRead?: () => void;
  markAllReadLabel?: string;
}
