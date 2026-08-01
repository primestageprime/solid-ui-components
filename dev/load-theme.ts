// dev/load-theme.ts — the loader moved to src/themes/loader.ts so it can be
// exported from the package; this shim keeps dev-harness imports working.
export {
  getPersistedTheme,
  persistTheme,
  loadBaseline,
  loadTheme,
  THEMES,
} from "../src/themes/loader";
export type { ThemeId } from "../src/themes/loader";
