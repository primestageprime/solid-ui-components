# Theme density audit — make the default theme dense (AUDIT ONLY, no `src/` change)

Peter, 2026-10-15: *"Rather than create a density variant, I want us to make the
default theme more dense."* Canon (Taskmaster ch. 1b + layout-canon slice): sections
and list items sit **flush with a 1px divider**, no gaps, no per-item rounded boxes;
group headers 28px with a `CountChip`; selected item = **4px left bar**; emphasis from
edges, not spacing.

Branch `feat/theme-density` off `origin/main` (SUI 0.222.0). Author: Veronica.
Evidence: `shots/`, `metrics-before.json`, `metrics-after.json`, `dense-overlay.css`
(throwaway, injected by `shoot.mjs`, never imported by `src/`).

## 0. Headlines

1. **There are no density tokens today.** `themes/README.md` says spacing is
   theme-invariant by contract. Density is hard-coded px in ~15 component CSS files.
   Themes (`hud.css`, `default.css`) set colour, radii and clip sizes only.
2. **Two JS constants mirror CSS and tokens cannot reach them:**
   `BucketQueue.tsx:47 const GAP = 8` (water-fill math) and
   `BucketQueue/layout.ts:15 const BORDERS = 2`. With CSS gap 0 a `fill` queue ends
   **9px short** (measured on the fill demo: slack 0 -> 9). Eight px are the `GAP`
   constant; one px is the overlay's own `margin-top: -1px` shared-divider overlap. By reading
   the code (not measured), the same mismatch exists in today's `density="compact"`:
   CSS gap 4px, JS still subtracts 8.
3. **28px is taller than today's compact.** Canon header 28px vs
   `CompactBucketQueue` header 21px / row 21px. Dense default rows measure 27px.
   So the default will *not* subsume the side-pane compact; see Q2.
4. **Use `min-height: 28px`, never `height`.** A fixed 28px clipped the wrapped
   "CHECK THE DRIFT · CONFIRM THE CADENCE" header in my first capture.
5. **`CountChip` header is a TSX change, not a token** (`BucketHeader.tsx`). The overlay
   only approximates it with a pill on `.bucket-queue__count`.
6. **No consumer uses `CompactBucketQueue` or `BucketQueue density=`.** Deprecating them is free.
7. **`--sui-space-sm/md/xs` are never declared** (fixed-string grep over SUI `src/` and
   `dev/` and the six consumers' `src/`: no declaration). 8 SUI sites use them with a
   literal fallback, so they always render the fallback (e.g. `ActionListItem.css:19`).
   Not a density token; do not mistake it for one.

### Questions for Peter (one at a time)

- **Q1 — what is "the default theme"?** Three readings: theme id `default`, the loader
  default (`src/themes/loader.ts:12`, = `hud`), or every theme. Verified defaults:
  goose `default`; dside and notecards statically import `default.css`; diddit, jtf
  (unless `VITE_DEFAULT_THEME`) and thorcasting land on `hud`. So **declaring dense
  values in `default.css` + `hud.css` changes the out-of-the-box look of all six
  consumers**, and only users who pick `stax`, `bronze*` or `colorblind` stay as today.
  **Recommend `default.css` + `hud.css` only.** Also part of Q1: does the `CountChip`
  header apply to every theme (it is a component change) or only these two. Screenshots
  are hud, as asked.
- **Q2 — does side-pane compact survive?** If 28px header / 27px row is acceptable at
  200px wide, compact is redundant and can be deprecated. If not, `compact` stays as the
  one narrow-pane variant (phase 2 then deprecates only the *comfortable* split).

## 1. Where density lives today

Default values are the ones shipped in hud unless noted (hud radii 0, `hud.css:103-105`;
default theme radii 4/8/12, `default.css:67`). Token declarations live in **three**
places: `src/styles/global.css:74-96`, `themes/default.css:60-90`, `themes/hud.css:103-130`.

| Token or selector | Current value | file:line | Components affected |
|---|---|---|---|
| `--sui-space-2 / -3` (scale) | 8px / 12px, identical in every theme | `default.css:82-84`, `hud.css:125-127`, `global.css:94-96` | everything that uses the scale (`BucketQueue` rows, `SortableList` gap) |
| `--sui-radius-md` | 0 hud / 8px default / 6px bronze+stax | `hud.css:104`, `default.css:67` | bucket box, ActionListItem, Panel |
| `.bucket-queue` `gap` | 8px | `BucketQueue.css:9` | BucketQueue, GroupedBucketQueue(no: own list) |
| **`GAP` constant (JS)** | 8 | `BucketQueue.tsx:47` -> `layout.ts` `allocateHeights` | BucketQueue water-fill |
| `.bucket-queue__bucket` border / radius | 1px all sides / `var(--sui-radius-md,4px)` | `BucketQueue.css:17-18` | BucketQueue |
| **`BORDERS` constant (JS)** | 2 (top+bottom) | `BucketQueue/layout.ts:15` | BucketQueue water-fill |
| `.bucket-queue__header` padding / size | `6px 12px`, 0.78rem (measured 31.5px tall) | `BucketQueue.css:27,31` | BucketQueue, GroupedBucketQueue (`GroupedBucketQueue.css:22` indent) |
| `.bucket-queue__row` padding / divider | `6px 12px`, `border-top 1px` subtle (measured 31px) | `BucketQueue.css:71-72` | BucketQueue, GroupedBucketQueue |
| selected bar | `inset 2px` accent | `BucketQueue.css:99` | BucketQueue rows |
| `.bucket-queue__empty` | `6px 12px` | `BucketQueue.css:224` | BucketQueue |
| `ROW_FALLBACK` (JS) | 54 | `BucketQueue.tsx:46` | first paint only |
| `.bucket-queue--compact` set | gap 4, header `3px 8px`/11px, row `2px 8px`/16px line, empty `2px 8px` | `BucketQueue.css:305-333` | CompactBucketQueue, `density="compact"` (`BucketQueue.tsx:341`) |
| `.sui-action-list-item` | `min-height 40px`, `8px 12px`, radius md, `1px transparent` border, own bg | `ActionListItem.css:18-25` | ActionList (measured 41px) |
| ActionListItem selected | accent border + 12% wash (no bar) | `ActionListItem.css:57-61` | ActionList |
| ActionListItem dismiss cap | negative margins from `--sui-space-sm/md` (undefined, fallback 8/12) | `ActionListItem.css:144-146` | ActionList |
| `.sui-sortable-list` row gap | `var(--sui-sortable-gap, var(--sui-space-2))` = 8px | `SortableList.css:19` | ActionList, SortableList (deprecated `gap` prop bridges here) |
| `.sui-action-list__bar` | `var(--sui-space-xs,6px) var(--sui-space-sm,8px)`, radius md | `ActionList.css:18-20` | ActionList actions bar |
| `.sui-collapsible-panel__tab` | margin `4px 6px`, 20x20, radius 4px | `CollapsiblePanel.css:28-34` | CollapsiblePanel |
| `.sui-collapsible-panel__strip` | width 24, gap 8, padding `8px 0` | `CollapsiblePanel.css:47,56-57` | CollapsiblePanel |
| `.sui-three-panel__top-bar` | height 40, padding `0 16px`, gap 12 | `ThreePanelLayout.css:28-30` | ThreePanelLayout |
| `.sui-three-panel__left/right` | padding 8, gap 8 | `ThreePanelLayout.css:55,58,76,79` | ThreePanelLayout |
| `.sui-three-panel__center` | padding 16, gap 16 | `ThreePanelLayout.css:65,68` | ThreePanelLayout |
| `.sui-modal__header` / `__body` / `__footer` | `16px 20px` / `20px` / `16px 20px` gap 12 | `Modal.css:56,95,107-108` | Modal, ConfirmationModal |
| `.hud-table__header-cell` / `__cell` | `12px 16px` / `10px 16px` (measured 37.5 / 47px) | `Table.css:103,169` | BaseTable, SectionTable, SelectableTable, TreeTable |
| `.hud-table--compact` | `8px 12px` / `6px 12px` | `Table.css:247,251` | tables with `compact` |
| `.sui-panel--sm/md/lg` | `8px 12px` / 16px / 24px | `Panel.css:23,26,29` | Panel and its variants |
| `.surface--padding-sm/md`, `--radius-*` | 8 / 16px; 0/4/8px | `Surface.css:10,13,17-23` | Surface and everything composed from it (SortableList row, etc.) |
| `.sui-section__header` / `--compact` | `12px 16px` / `6px 12px` | `Section.css:22,51` | Section, AccentSection |
| `.sticky-group-header` | `8px 12px` | `StickyGroupHeader.css:6` | grouped tables |
| `.sui-list-item` / `--compact` / `--menu` | `10px 0` / `6px 0` / `12px 16px`; gap 12 | `List.css:20-21,25,67` | List |
| `.stack--gap-*`, `.row--gap-*` | 4 / 8 / 12 / 16 (xl 24) | `Layout.css:15-24,85-100` | all Layout users; **leave alone** (Rule Zero: clients do not pass spacing) |

Other existing "compact" knobs, all of which become the new default: `Table compact`
(`Table/types.ts:50`), `List compact` (`List.tsx:23`), `Section compact`
(`Section.tsx:38`), `BucketQueue density` (`types.ts:157`). `ThreePanelLayout.css:7-10`
has a stale comment ("the library has no --sui-space-* tokens yet").

## 2. Proposed dense defaults

New **optional** token group `--sui-dense-*`. Each consuming rule becomes
`var(--sui-dense-x, <legacy px>)`, so a theme that does not declare the token renders
exactly as today. Dense values are declared in `default.css` + `hud.css` (Q1).
"Canon" = specified by the canon; "Judgement" = my inference, Peter to confirm.

| Token | Legacy -> dense | Source | Rules that move to it |
|---|---|---|---|
| `--sui-dense-section-gap` | 8 (compact 4) -> **0** | Canon | `BucketQueue.css:9`, `ThreePanelLayout.css:58,79`; **plus JS `GAP`** |
| `--sui-dense-item-gap` | 8 -> **0** | Canon | `SortableList.css:19` (default of `--sui-sortable-gap`) |
| `--sui-dense-item-radius` | md (8 default, 0 hud) -> **0** | Canon | `BucketQueue.css:18`, `ActionListItem.css:25`, `SortableList` row, collapsible tab |
| bucket box: borders | 1px all sides -> **top/bottom 1px only, one shared divider** | Canon | `BucketQueue.css:17`; **plus JS `BORDERS`** |
| `--sui-dense-header-h` | ~31.5 -> **min-height 28px** | Canon | `BucketQueue.css:27`, `Section.css:22` |
| `--sui-dense-row-pad-y` / `-x` | 6/12 -> **4/12** (list rows), ActionListItem 8/12 -> 4/12 | Judgement | `BucketQueue.css:71`, `ActionListItem.css:19`, `List.css:21` |
| `--sui-dense-select-bar` | 2px -> **4px** | Canon | `BucketQueue.css:99`, `ActionListItem.css:57-61` (today a border+wash, not a bar) |
| `--sui-dense-panel-pad` | 16 -> **12** | Judgement | `Panel.css:15,26`, `Surface.css:13`, `ThreePanelLayout.css:65` |
| `--sui-dense-aside-pad` | 8 -> **0** | Canon (flush) | `ThreePanelLayout.css:55,76` (**consumer-visible**, see §4) |
| `--sui-dense-topbar-h` | 40 -> **32** | Judgement | `ThreePanelLayout.css:30` |
| `--sui-dense-cell-pad` / `head-cell-pad` | `10/16`,`12/16` -> **6/12**, **8/12** (= today's compact) | Judgement | `Table.css:103,169` |
| `--sui-dense-modal-pad` | `16/20` -> **10/16**, body 20 -> 16, footer gap 12 -> 8 | Judgement | `Modal.css:56,95,107-108` |

**Reachable by tokens alone:** every row above except the two marked JS.

**Not reachable by tokens (named work):**

1. `GAP = 8` (`BucketQueue.tsx:47`) and `BORDERS = 2` (`layout.ts:15`) must be **read
   from the live DOM** (computed `row-gap` of the root, computed border widths of a
   bucket) like header/row heights already are in `measurement.ts`. Without it any
   `fill` bucket queue mis-sizes by `GAP*(n-1)` px. Same fix repairs today's compact.
2. **`CountChip` in the bucket header** — TSX change in `BucketHeader.tsx`
   (`.bucket-queue__count` is a bare `<span>`). Do the same for `GroupedBucketQueue`
   headers (they reuse `.bucket-queue__header`).
3. **Selected bar on ActionListItem** is currently border + wash with `opacity: .5`
   resting tone. A 4px bar needs a rule change, not just a width token.
4. **Flush dividers on ActionListItem** need `border-width: 0 0 1px` (today a 1px
   transparent box border that hover lights). Hover-only-opacity invariant
   (`ActionListItem.css:9-12`) must be re-checked.
5. **Grouped indent** `calc(12px + depth*16px)` (`GroupedBucketQueue.css:22,29,35`)
   hard-codes the 12px; must follow `--sui-dense-row-pad-x`.
6. `.hud-table--compact`, `.sui-section--compact`, `.sui-list--compact`,
   `.bucket-queue--compact` stay as-is until phase 2.

### Work classes in the plan (from veronica-b's canon-deltas handoff, PR #286)

Of the four BucketQueue canon deltas, three are token/CSS work and one is not:

| Delta | Class | Where |
|---|---|---|
| 1. Flush buckets, 1px divider | Token + CSS, **and** the JS `GAP`/`BORDERS` code path | phase 1a/1b |
| 3. 4px selected bar | Token + CSS | phase 1a/1b |
| 4. 28px header (chevron, label, count) | Token + CSS (`min-height`) | phase 1a/1b |
| 2. Count as `CountChip` at the right | **Markup change** in `BucketHeader.tsx`, not CSS; list and review separately from token work | phase 1b, its own commit |
| (separate) `count?: number` override so a collapsed bucket shows 2,594 with no items loaded | **New prop on a Primitive**: needs Peter's sign-off under the expansion gate; not part of the theme pass | outside this plan |

Rule for the JS mirrors: any dense token that changes a value `BucketQueue.tsx` or
`layout.ts` also encodes (`GAP`, `BORDERS`, and by extension row/header heights) must be
read by that code path from the live DOM, or the CSS and the water-fill drift apart.

## 3. Before / after evidence (hud theme, 1280 viewport)

Dev gallery on port 2305 (claimed via `pa`, released at the end). After = same page
plus `dense-overlay.css` injected. Re-run:
`PW=<playwright index.mjs> node shoot.mjs before|after 2305`.

| Component (page) | Before | After | Measured change |
|---|---|---|---|
| BucketQueue (`#/bucket-queue`) | `shots/BucketQueue-before.png` | `shots/BucketQueue-after.png` | gap 8->0, header 31.5->28, row 31->27, bucket 96->84, side borders gone |
| CompactBucketQueue (same page) | `shots/CompactBucketQueue-before.png` | `shots/CompactBucketQueue-after.png` | gap 4->0 only; header 21->28 and 65->72 are an **overlay artifact** (min-height 28 also hits compact) |
| ActionList (`#/action-list`, 3rd row selected) | `shots/ActionList-before.png` | `shots/ActionList-after.png` | item 41->32, list gap 1->0, selected = 4px left bar instead of a bordered box. Radius is already 0 in hud, so it is not a change here (it would be in `default`, 8px). The actions bar above the list stays a rounded bordered box: `ActionList.css:18-20` is a further rule to move |
| GroupedBucketQueue (`#/grouped-bucket-queue`) — nested sibling of BucketQueue | `shots/GroupedBucketQueue-before.png` | `shots/GroupedBucketQueue-after.png` | header 31->28, row 31->27 |
| CollapsiblePanel (`#/app-shell`) | `shots/CollapsiblePanel-before.png` | `shots/CollapsiblePanel-after.png` | near-identical: it has no list/gap density, only a tab and a strip |
| ThreePanelLayout (`#/three-panel-layout`) | `shots/ThreePanelLayout-before.png` | `shots/ThreePanelLayout-after.png` | top bar 40->32; aside pad/gap 8->0; center 16->12 |
| Modal (`#/hud-modal`, first button) | `shots/Modal-before.png` | `shots/Modal-after.png` | header 66->54, body 58->50 |
| DataTable = BaseTable (`#/base-table`) | `shots/DataTable-before.png` | `shots/DataTable-after.png` | head cell 37.5->29.5, cell 47->29 |

**SectionedList's replacement is `BucketQueue`**: CHANGELOG 0.221.0 removed
`SectionedList`/`CompactSectionedList` ("the owner chose to keep `BucketQueue` for the
side pane instead"), so the BucketQueue and CompactBucketQueue rows above are the
SectionedList evidence. `GroupedBucketQueue` is included as the nested variant.

Headless numbers for every probe: `metrics-before.json` vs `metrics-after.json`.

**Caveats on the evidence**
- The overlay cannot touch the JS mirrors, so BucketQueue "after" shows extra slack under
  the queue; the fill-demo probe shows the real 9px shortfall.
- The CountChip pill is CSS-only approximation.
- `GroupedBucketQueue` has no wrapper-level border/gap (own list), so only header/row move.
- Dev gallery was run against the in-tree `src/`; no consumer was built.

## 4. Blast radius

Version pins (from each `package.json`). Caret on `0.x` allows patch only
(`^0.216.0` = `>=0.216.0 <0.217.0`), so **only a deliberate bump moves a consumer**,
except the live link and the branch ref. Usage counts are non-test source lines
mentioning the component (indicative, includes imports). **jtf is the one consumer hit
with no version bump at all.**

| Consumer | Pin | Moves when | Default theme (verified) | Affected usage |
|---|---|---|---|---|
| `goose/goose-ui` | exact 0.152.0 | explicit bump | `default` (`lib/theme.ts` `DEFAULT`); curated default/hud/stax | tables 38 (6 `compact`), Section 5 |
| `diddit/diddit-ui` | exact 0.152.0 | explicit bump | SUI loader default = `hud` (`getPersistedTheme()`, nothing persisted) | ActionList 8, List 3, ThreePanelLayout 2, Modal 2 |
| `thorcasting/thorcasting-ui` | ^0.216.0 | bump past 0.216.x | static `hud.css` + `colorblind.css` (`app.tsx:29-30`) | **BucketQueue 45**, Modal 14, Panel 16, Section 10, tables 9, ThreePanelLayout 7, `compact` 7. Its `density=` is its own prop, not SUI's |
| `jtf/jtf-ui` | `link:../solid-ui-components` -> symlink `jtf/solid-ui-components` -> `../platform/solid-ui-components`, i.e. **the shared SUI checkout** | **no version bump needed**: as soon as that checkout holds the change and is rebuilt (`dist/`) | persisted, else `VITE_DEFAULT_THEME`, else `hud` (`stores/theme.ts`); curated hud/stax | tables 22, ThreePanelLayout 13, Modal 13, Panel 10, BucketQueue 9 |
| `dside/dside-ui` | ^0.104.0 (work: ^0.57.0) | bump (far behind) | static `default.css` (`app.tsx:2`) then runtime swap (`lib/themePref.ts`) | **ActionList 30**, CollapsiblePanel 7, Modal 4 |
| `notecards/notecards-ui` | github branch `fix/button-tone-specificity` | next reinstall that re-resolves the branch (the lockfile pins a commit until then); not a release | static `default.css` (`app.tsx:6`); `loadTheme("hud")` on the proto shell | Modal 3, tables 4 (2 `compact`) |
| `jtf-rth/jtf-rth-ui` (not in brief) | ^0.151.0 | bump | not checked | tables 40 (18 `compact`), Section 22 |

Expect visible change on upgrade in: ActionList row height and shape (dside, diddit),
every table's row height (goose, jtf, jtf-rth, thorcasting, notecards), ThreePanelLayout
aside padding (any consumer whose side-panel content relied on the 8px inset), Modal
size, and BucketQueue (thorcasting, jtf). Rule Zero applies: a consumer looking different
because it stopped subverting SUI is the system working, but the aside padding change
is the one most likely to expose content with no inset of its own.

**Do the density props become redundant?** `CompactBucketQueue` and
`BucketQueue density`: zero consumers, shipped only in 0.222.0 (newest consumer pin is
0.216). Redundant **if Q2 = yes**, otherwise keep as the narrow-pane variant. `Table`,
`List`, `Section` `compact`: become equal to the new default (table dense cell
`6/12` is exactly today's compact), so they turn into no-ops; **deprecate, do not
delete**. Consumers of `compact` today: goose 6, jtf-rth 18, thorcasting 7, notecards 2.

## 5. Phased plan (add / deprecate / delete)

**Can the new thing coexist with the old? Yes.** Tokens with legacy fallbacks mean a
theme that omits them is untouched; the dense values switch on per theme.

1. **Add (one PR, one minor release, safe to abandon)**
   - 1a. Zero-visual-change plumbing: JS `GAP`/`BORDERS` read from the DOM; every rule in
     §2 becomes `var(--sui-dense-*, <legacy>)`. Add layout test with gap 0 (fill queue
     fills exactly). Document tokens as an optional group in `themes/README.md` and
     `COMPONENTS.md`; run `npm run health`, `test`, `typecheck`, `build`,
     `bundle-budget` and re-baseline only what improves.
   - 1b. `default.css` + `hud.css` declare the dense values, and the bucket/grouped
     headers swap the bare count for `CountChip` (a visible component change; per Q1
     either for every theme or gated by a dense token). These are the only visible
     changes; the PR carries these before/after pairs (re-shot from the real code, not the
     overlay), plus consumer notes from §4.
2. **Deprecate (per consumer, at their own pace)** — mark `density="compact"`,
   `CompactBucketQueue`, and `compact` on Table/List/Section `@deprecated` in types,
   `COMPONENTS.md` and `CHANGELOG`; both paths keep working. Consumers migrate on
   their own bump (goose, jtf-rth, thorcasting, notecards for `compact`). Bronze/stax/
   colorblind opt in later by declaring the tokens.
3. **Delete (one breaking release, only when nothing reads the old path)** — remove the
   deprecated props/variants, `.bucket-queue--compact`, `.hud-table--compact` etc., and
   drop the legacy fallbacks inside the `var()`s. Check `npm run usage-manifest` /
   `export-usage-report` for readers first.

## 6. Rabbit holes and gotchas recorded

- `pa next --from 2300` returned 2303, which an unregistered process was already
  listening on; `pa claim` still succeeded. Check `lsof -iTCP:<port>` before starting.
- zsh errors on unquoted `--include=*.ts` in `grep -r`; run scan scripts with `bash`.
- Fixed `height` on a bucket header clips wrapped titles; use `min-height`.
- `--sui-space-sm/md/xs` are never declared (8 call sites use their fallback).
- Token defaults are declared in `global.css`, `default.css` and `hud.css`; a new token
  group must be added consistently or fall back via `var()`.
