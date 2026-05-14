/* Recent / Starred — reusable shortcut state + UI for navigable items.
 * See ./README.md. */

export { createRecentStarredStore } from "./store";
export type {
  RecentStarredItem,
  RecentStarredStore,
  CreateRecentStarredOpts,
} from "./store";

export { StarToggle } from "./StarToggle";
export type { StarToggleProps } from "./StarToggle";

export { RecentStarredSidebar } from "./RecentStarredSidebar";
export type { RecentStarredSidebarProps } from "./RecentStarredSidebar";
