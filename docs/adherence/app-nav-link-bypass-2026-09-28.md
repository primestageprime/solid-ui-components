# AppNavLink — consumer bypass survey (2026-09-28)

`AppNavLink` (`src/components/Layout/AppNavLink.tsx`, Depth 1) is the intended
SUI nav link: a button-based top-bar nav item with an active state, meant to
pair with `AppHeader`. `docs/usage-manifest.json` shows no consumer importing
it directly. This is a read-only survey of what the three `AppShell`
consumers use instead, per repo, read via `git show origin/<branch>:<path>`
against each repo's own checkout (no working trees touched).

| Repo | File | What it renders instead | What `AppNavLink` would need to fit |
|---|---|---|---|
| goose-ui | `src/components/AppNav.tsx` (local branch `feat/report-line-fact-filtering`, **not yet on `origin/main`** — `origin/main`'s `src/app.tsx` does not import `AppShell` at all today) | Its own `AppNav` component composing SUI's plain `NavLink` (href-based) over a `createPanel({ size: "sm" })` bar, with a `NAV_ITEMS` array (`{ href, label }`) mapped to links and an `isActive(href)` computed from `useLocation()`. | `AppNavLink` takes `active`/`onClick`, not `href` — goose's items are router `<a>`-style links via `NavLink`, so adopting `AppNavLink` would mean goose dispatching navigation through `onClick` + `navigate(href)` instead of letting `NavLink`'s href do it. Since this is unmerged, there is no live bypass to migrate yet; flag for re-check once the branch lands. |
| jtf-ui | `src/auth/Login.tsx`, `src/auth/AccessRestricted.tsx` (`origin/main`) | Neither renders any nav at all — both are `AppShell` wrapping a single centered auth card (`ScreenCenterStack` + `PageTitle` + buttons). jtf-ui's `AppShell` usage is two auth screens, not the app's primary chrome. | Not applicable — there is no persistent nav bar in these two screens to bypass. jtf-ui's actual app nav (if any) was not found under `AppShell`; no `AppNavLink`-shaped bypass exists to report for this repo. |
| thorcasting-ui | `src/components/AppTopBar.tsx` (`origin/main`) | A hand-built `AppTopBar` — its own header comment calls it "the interim home for a future SUI `AppBar`" — composed from SUI's `AppHeader` primitive + `OverflowNav` (pinnable-tabs nav, two groups split by a `VerticalDivider`: shipped tabs vs. dev-only tabs, both driven by `~/lib/navTabs` and a `user_setting` visibility table) plus `CompanySwitcher`, `NotificationCenter`, `AccountMenu`, `SettingsGear`. | thorcasting's nav is materially richer than a flat link row (pinnable/closeable tabs, a kebab overflow, a dev/prod split) — `AppNavLink` covers the individual-link case, not the tab-management behavior `OverflowNav` already provides. thorcasting would need `AppNavLink` only if it dropped `OverflowNav`'s pin/close semantics for a subset of items, which its own comment suggests is not the direction (it's waiting on a real SUI `AppBar`, not a link atom). |

## Takeaway

None of the three consumers use `AppNavLink` because none of them has the
shape it fits (a plain, static list of always-visible nav buttons). jtf-ui
has no persistent nav under `AppShell` to bypass; goose-ui's bypass exists
only on an unmerged branch; thorcasting-ui's nav out-scales what `AppNavLink`
models. This is documentation of the survey, not a call to change `AppNavLink`
or force adoption — Peter's ruling was to document the bypass, not close it.
