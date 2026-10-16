// ============================================
// AppBar — Composite (Depth 3)
// Owns zero CSS files and zero inline style={}. Composes AppHeader + GrowBox
// (Layout variants), a ThreeSlotRow curried at a 160px start (Depth 2),
// CenteredOverflowNav (Depth 2), UserMenu (Depth 2) and EndClusterRow.
//
// The page-top bar in "layout A" (Taskmaster canon, 2026-10-15):
//
//   ┌ 160px ─┬──────────── 1fr ─────────────┬─ auto ─────────┐
//   │ logo   │   Tasks   Retrospective      │ status  (avatar)│
//   └────────┴──────────────────────────────┴────────────────┘
//
// The logo box is fixed; the nav is centred in the space the two ends leave
// (not in the viewport) and folds into a kebab when that space runs out; the
// status and the user menu keep their width. Below 480px the status leaves
// the bar and becomes a line in the user menu's header, so the end slot never
// crowds the avatar.
//
// Navigation is controlled: `nav.activeId` marks the active item and
// `nav.onSelect(id)` reports a click. The bar never routes.
// ============================================
import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";
import { AppHeader, GrowBox } from "../Layout/variants";
import { createThreeSlotRow } from "../ThreeSlotRow/ThreeSlotRow";
import { CenteredOverflowNav } from "../OverflowNav/variants";
import type { OverflowNavItem } from "../OverflowNav/OverflowNav";
import { UserMenu, type UserMenuProps } from "../UserMenu/UserMenu";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { map } from "../../fn";

/** The canon's logo box. */
export const APP_BAR_LOGO_WIDTH = "160px";
/** At or below this width the status folds into the user menu. */
export const APP_BAR_FOLD_QUERY = "(max-width: 480px)";

export interface AppBarNavItem {
  id: string;
  label: string;
  /** Optional badge beside the label (mirrors NavLink). */
  badge?: string | number;
}

export interface AppBarNav {
  items: readonly AppBarNavItem[];
  /** The current view; its item is underlined. */
  activeId?: string;
  onSelect: (id: string) => void;
}

export interface AppBarProps {
  /** The start slot — a wordmark (`PageTitle`) or an image. Held at 160px. */
  logo: JSX.Element;
  nav: AppBarNav;
  /** Shown before the avatar; moves into the user menu's header below 480px. */
  status?: JSX.Element;
  /** Everything the user menu needs, except `status`, which the bar places. */
  user: Omit<UserMenuProps, "status">;
}

/** The bar's nav items as OverflowNav items: active from `activeId`, click → `onSelect`. */
export const appBarNavItems = (nav: AppBarNav): OverflowNavItem[] =>
  map(
    (item: AppBarNavItem) => ({
      id: item.id,
      label: item.label,
      badge: item.badge,
      active: item.id === nav.activeId,
      onClick: () => nav.onSelect(item.id),
    }),
    nav.items,
  );

const LogoBoxRow = createThreeSlotRow({ startWidth: APP_BAR_LOGO_WIDTH });

export const AppBar: Component<AppBarProps> = (props) => {
  const folded = useMediaQuery(APP_BAR_FOLD_QUERY);
  return (
    <AppHeader>
      <GrowBox>
        <LogoBoxRow
          start={props.logo}
          center={
            <GrowBox>
              <CenteredOverflowNav items={appBarNavItems(props.nav)} />
            </GrowBox>
          }
          end={
            <>
              <Show when={!folded()}>{props.status}</Show>
              <UserMenu
                {...props.user}
                status={folded() ? props.status : undefined}
              />
            </>
          }
        />
      </GrowBox>
    </AppHeader>
  );
};
