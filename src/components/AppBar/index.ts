// Data-only: no Overrides, so no factory and no curried variant — the bar is
// already zero-config at the call site. Its geometry (160px logo box, the
// 480px fold) is baked, per the Taskmaster canon's header layout A.
export {
  AppBar,
  APP_BAR_FOLD_QUERY,
  APP_BAR_LOGO_WIDTH,
  appBarNavItems,
} from "./AppBar";
export type { AppBarNav, AppBarNavItem, AppBarProps } from "./AppBar";
