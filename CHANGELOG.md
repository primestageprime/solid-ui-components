# Changelog

## v0.10.0 — Composite primitive: DateRangePicker (Phase 1.7)

Ships the composed date-range picker identified by the migration audit's
Phase 1.7 batch. Folds the downstream `forms/DateRangePicker/` subdirectory
(root component + CalendarGrid + CalendarHeader + PresetButtons + TimeInputs +
`calendarUtils.ts`) into a single upstream composite with only the root
component exported. Phase 5 (Forms) can now delete the entire downstream
subdirectory and import `DateRangePicker` from the library.

### Added

- **`DateRangePicker`** (`src/components/DateRangePicker/DateRangePicker.tsx`)
  — Composite (Depth 2). Popover-anchored date-range picker built on
  `@kobalte/core/popover`. Owns `DateRangePicker.css`. Composes the upstream
  `Button` (Atomic) for preset chips. Internal `CalendarGrid`,
  `CalendarHeader`, `PresetButtons`, `TimeInputs` live as private files under
  the component directory and are NOT re-exported — zero-config at the call
  site (Decision 1a). Annotated `Component<DateRangePickerProps>` for
  TS2742 / pnpm-portability. Exported types: `DateRangePickerProps`,
  `DateRange`, `DateRangePreset`.
- **`timeZone?: string` prop on `DateRangePicker`.** Optional IANA TZ
  identifier (e.g. `"America/Los_Angeles"`, `"UTC"`). When set, the trigger
  label, month header, calendar-day highlighting, and committed time-of-day
  selections are all resolved in this TZ; when omitted, the component falls
  back to the browser's local TZ. Pre-empts Phase 5 migration mismatch: the
  downstream app pins operational timestamps to Pacific via
  `CellRenderers.tsx`, `OperationalEdgesTable.tsx`,
  `CandlestickRenderer.tsx`, `TimeRangeSelector.tsx` — forwarding the same
  IANA TZ here keeps the picker aligned with the surrounding UI at
  day-boundary transitions. Implementation uses a two-pass
  `zonedDateTimeToInstant` helper to resolve `HH:mm` + (year, month, day)
  into a committed UTC instant, and a cell-vs-instant comparison pair
  (`cellMatchesBoundary`, `cellInRange`) so the cell `Date` objects built
  by `getCalendarDays` line up with boundary instants observed in the
  target TZ.

### Behavioral delta vs project-local downstream

- **`class` now APPENDS to the default trigger class** (`sui-drp__trigger`)
  rather than replacing it. The project-local downstream substituted the
  caller's `class` for its internal `styles.trigger`; upstream layers the
  two via `["sui-drp__trigger", props.class].filter(Boolean).join(" ")`.
  Callers who previously passed `class` to customize the trigger keep
  default trigger styling and get their overrides layered on top. Phase 5
  migrations benefit automatically; any downstream consumer relying on the
  old replace-semantics must move trigger styles into a CSS override that
  coexists with `sui-drp__trigger`.

### Scope decisions

**Decision 1 — Sub-components private.** Only `DateRangePicker` is exported
from the library root. `CalendarGrid`, `CalendarHeader`, `PresetButtons`, and
`TimeInputs` are implementation details. Matches the audit's recommendation
and keeps the public surface minimal.

**Decision 2 — Vanilla `Date` + `Intl.DateTimeFormat`.** No Luxon, no
date-fns, no caller-supplied formatter contract. The downstream used Luxon
for weekday offsets and month/short-date formatting; all of that is replaced
with `new Date(year, month, 1).getDay()` + `Intl.DateTimeFormat` at zero
bundle cost. Keeps the library dep-light (Luxon would have added ~70 kB to
every consumer; requiring formatter props would have added 4–5 props to
every call site). Locale-aware formatting comes from the browser's built-in
i18n — no work for callers.

**Decision 3 — Presets caller-supplied.** `presets?: DateRangePreset[]`
matches the downstream contract. Omit or pass `[]` to suppress the preset
row. No built-in default preset set.

**Decision 4 — Browser-local timezone by default, opt-in `timeZone?` prop.**
The initial release shipped browser-local behavior only. Post-review
revision: added `timeZone?: string` (IANA identifier) so callers can pin
the picker to the same TZ the rest of their app renders in — preventing
off-by-one mismatches at TZ boundaries. Omitting the prop preserves
browser-local behavior; passing it threads TZ-aware comparison + formatting
through every touch point (trigger label, month header, calendar-cell
highlighting, committed `HH:mm` resolution).

### Kobalte — built from scratch, no `@kobalte/core/date-picker`

Kobalte does not ship a `date-picker` primitive (checked
`@kobalte/core/dist` subpaths). The picker is built on
`@kobalte/core/popover` plus hand-rolled calendar math and day buttons.
Popover is already covered by `vite.config.ts`'s `noExternal` pattern
(`/^@kobalte\//`), so no SSR config changes were needed.

### Divergences from downstream (intentional)

- Internal sub-components are not exported (downstream had them as separate
  files inside the feature folder; upstream treats them as private).
- Luxon replaced with vanilla `Date` + `Intl.DateTimeFormat`.
- SCSS CSS modules replaced with a plain `.css` file using BEM-ish
  `.sui-drp__*` class names and `--sui-*` theme tokens.
- `sanitizeMaxRangeDays` downgrades the dev-mode `throw` to a `console.error`
  + graceful fallback (`import.meta.env.DEV` is not available in this
  library's tsconfig/context; throwing in prod would have been worse than
  the downstream dev-only throw).

### Known gaps

- **No upstream test coverage for `calendarUtils`.** The downstream ships a
  Vitest `calendarUtils.test.ts` with month-boundary / range / clamp /
  sanitize coverage. Upstream has no test framework configured — tests are
  not ported in this release. Tracking follow-up: add Vitest to
  `solid-ui-components` so this and any future utility modules can ship
  with tests.

## v0.9.0 — Data primitives: ValueRenderer + ChangeRenderer + CandlestickRenderer (Phase 1.6)

Ships the three data-primitive components identified by the migration audit's
Phase 1.6 batch. Consolidates the downstream renderer family
(`ObjectRenderer` + `ChangeRenderer` + `ChangeObjectRenderer`) into a
`ValueRenderer` meta-primitive with a pluggable `renderValue` dispatcher plus
a `ChangeRenderer` composite that reuses the same dispatch on both sides.
`CandlestickRenderer` ships separately (OHLC shape does not fit the generic
dispatch).

### Added

- **`ValueRenderer`** (`src/components/ValueRenderer/ValueRenderer.tsx`) —
  Atomic (Depth 1). Labeled label/value layout with a hybrid dispatcher:
  zero-config for primitives (`string`, `number`, `boolean`, `null`/`undefined`),
  arrays, plain objects, and pre-rendered JSX; host supplies an optional
  `renderValue?: (v: unknown) => JSX.Element | undefined` to inject domain
  renderers (status badges, candlesticks, epoch-millis dates, etc.). Returning
  `undefined` from the override falls through to the default dispatcher. Object
  rendering recurses through the same pipeline so overrides apply at every
  nesting level. Owns `ValueRenderer.css`. Annotated `Component<ValueRendererProps>`
  for TS2742 / pnpm-portability. Exported types: `ValueRendererProps`,
  `RenderValueFn`.
- **`ChangeRenderer`** (`src/components/ChangeRenderer/ChangeRenderer.tsx`) —
  Depth 2 (Composite). Before/after pair with a directional arrow; both sides
  render through `ValueRenderer` so a single `renderValue` override applies
  consistently to both. Accepts optional custom `arrow` element. Owns
  `ChangeRenderer.css`. Annotated `Component<ChangeRendererProps>`.
- **`CandlestickRenderer`** (`src/components/CandlestickRenderer/CandlestickRenderer.tsx`) —
  Atomic (Depth 1). OHLC box visualization: open/close flanks, high/low stacked
  markers, mean inside the box. Default bullish/bearish coloring via
  `--sui-success`/`--sui-danger`; `getBoxColor` override for custom rules
  (e.g., doji detection). No component imports; owns `CandlestickRenderer.css`.
  Annotated `Component<CandlestickRendererProps>`. Exported types:
  `CandlestickRendererProps`, `Candlestick`.

### Scope decisions

**Decision 1 — Dispatch API shape.** Hybrid: minimal built-in default dispatch
for primitives and plain objects, with a `renderValue` prop as an explicit
extension hook. Ship no opinionated sub-renderers (e.g., status-keyword
detection, epoch-millis-as-date heuristics) — those are domain policies that
belong to the host. Objects on each side dispatch through `ValueRenderer` in
`ChangeRenderer`, which means a single host-supplied `renderValue` applies to
primitive values on both sides AND to nested values inside objects.

**Decision 2 — No sub-renderers upstream.** Downstream's
`String/Number/Duration/Date/StatusBadge` renderers carry
host-specific concerns (smart tooltip hook, alarm-color generation, Luxon
duration formatting, pacific-timezone format strings) that are not generic
enough for an atomic library. `ValueRenderer`'s default dispatcher renders
primitives inline without importing sub-atomics, honoring the "atomics must
NOT import other atomics" rule. Phase 7 can collapse the downstream
renderer files into call sites of `ValueRenderer` with a host-local
`renderValue` that wires in whatever domain atomics the app keeps around
(e.g., a project-local `StatusBadgeRenderer` + `DateRenderer` would stay
downstream as thin renderers; `ObjectRenderer.tsx` goes away entirely).

**Decision 3 — Single v0.9.0 release.** All three components share CSS
conventions (`--sui-*` tokens, label/value grid), ship together as the audit's
Phase 1.6 batch, and have low individual surface. One PR, one review, one
release. No batch chaining.

### Documented divergences

- **`ChangeRenderer` does not replicate downstream `ChangeObjectRenderer`'s per-key
  aligned grid.** When `before`/`after` are objects, each side renders through
  `ValueRenderer`'s default key/value entry list — the key-level diff (added /
  removed / changed / unchanged highlighting) remains a domain concern. If
  downstream needs that behavior, it stays as a domain component that
  composes `ValueRenderer` + custom per-key layout.
- **`CandlestickRenderer` does not embed a hover tooltip.** The downstream
  `useSmartTooltip`-based floating panel is host-specific. Callers wrap the
  base in the library `Tooltip` to reintroduce the behavior.

### CSS

- `src/components/ValueRenderer/ValueRenderer.css` — label/value grid, object
  entry list with alternating-row tint, primitive variants.
- `src/components/ChangeRenderer/ChangeRenderer.css` — pair layout, arrow
  styling, opacity-based before/after emphasis.
- `src/components/CandlestickRenderer/CandlestickRenderer.css` — OHLC box,
  absolute-positioned high/low markers, token-driven bullish/bearish fill.

### Component classification

- `ValueRenderer` — **Atomic (Depth 1)**. No component imports; owns CSS.
- `ChangeRenderer` — **Depth 2 (Composite)**. Composes `ValueRenderer`; owns
  its own CSS for the pair layout.
- `CandlestickRenderer` — **Atomic (Depth 1)**. No component imports; owns CSS.

The taxonomy is unchanged — `STYLE_GUIDE.md` already accommodates Depth 2
composites that own CSS for their own layout concerns on top of Atomic children.

### Phase 1.6 sequencing unblocks

These three exports plus `PivotTable` (still outstanding) complete the data
primitives batch. Phase 7 (downstream `renderers/*` migration) can now consume
`ValueRenderer`, `ChangeRenderer`, `CandlestickRenderer` directly from
`solid-ui-components`.

## v0.8.0 — Toast (Phase 1.5)

Wraps `@kobalte/core/toast` into an opinionated toast component plus the
provider atomics needed to host it. Completes the notification surface so
downstream's `amygdala-ui/src/components/toast/Toast.tsx` and the
`Routes.tsx` provider mount can both resolve from `solid-ui-components` at
Phase 8 swap time.

### Added

- **`Toast`** (`src/components/Toast/Toast.tsx`) — Themed toast with four
  variants (`info` | `success` | `warning` | `error`), optional
  `description`, `actions` (array of `ToastAction { label, onClick, variant? }`),
  `duration`, `persistent`. Extends `ToastRootProps` so any kobalte passthrough
  (priority, swipe handlers, etc.) still works. Annotated `Component<ToastProps>`
  for TS2742 / pnpm-portability.
- **`ToastRegion`** / **`ToastList`** — Curried atomics that wrap
  `@kobalte/core/toast`'s `Region` and `List` with baked-in styling. Mount once
  near the app root (inside a `Portal`) and call `showToast(...)` from
  anywhere.
- **`showToast(input)`** — Typed imperative helper. Returns
  `{ id: number, dismiss: () => void }`. Callers pass the same shape as
  `ToastProps` (minus `toastId`, which kobalte injects).
- **`toaster`** — Re-export of kobalte's raw toaster for `update` / `clear` /
  `promise` use cases not covered by `showToast`.
- Exported types: `ToastProps`, `ToastAction`, `ToastVariant`,
  `ToastRegionCurriedProps`, `ToastListCurriedProps`, `ShowToastInput`,
  `ToastHandle`.

### Provider surface decision

Ships a **two-option surface**:

1. `ToastRegion` + `ToastList` curried atomics — the 80% case; zero-config.
2. Raw `toaster` re-export — imperative escape hatch (`update` / `clear` /
   `promise`).

For callers that genuinely need `Toast.Root` / `Toast.Title` /
`Toast.Description` directly (rare — custom layouts, multi-region setups),
`@kobalte/core/toast` is already an installed peer and can be imported
directly. No upstream re-export is needed for that case.

Phase 8's `Routes.tsx` diff becomes a 1-line import swap —
`import { Toast } from "@kobalte/core/toast"` → `import { ToastRegion, ToastList }
from "solid-ui-components"` — plus renaming `<Toast.Region>` / `<Toast.List />`.

### Toaster API decision

Ships `showToast(input)` wrapper (typed to `ToastProps`) **and** re-exports the
raw `toaster` for `clear()` / `update()` / `promise()` edge cases. The wrapper
aligns with the new `Toast` prop shape so callers don't re-type the JSX at each
site; the raw re-export keeps every kobalte capability accessible.

### API divergences from downstream

- `toastId` is typed `number` (kobalte-native), not `string` as the audit
  sketch suggested.
- Variant set is `info | success | warning | error` (audit). Downstream's
  `"default"` maps to `"info"` — Phase 8 call-site rename.
- Action button styling is baked into `Toast.css` rather than composing the
  `Button` atomic (Atomic components may not import other Atomics per
  `STYLE_GUIDE.md`).
- Close-button glyph is inlined as a hardcoded `<svg>` in `Toast.tsx` rather
  than composing the `Icon` atomic — same rationale. Geometry mirrors the
  Icon atomic's `close` outline path so visual weight matches.

### Driving downstream sites

- `amygdala-ui/src/components/toast/Toast.tsx` (base component)
- `amygdala-ui/src/components/Routes.tsx` (`Toast.Region` + `Toast.List` mount)
- `amygdala-ui/src/contexts/VesselTypePromptProvider.tsx` (imperative
  `toaster.show` / `toaster.dismiss`)

### Unblocks

- Phase 8 `toast/` migration + `Routes.tsx` provider swap.

## v0.7.0 — ThemedNumberInput (Phase 1.4)

Rounds out the themed input family with a numeric field. Kobalte-backed
(`@kobalte/core/number-field`) — gets the stepper keyboard semantics, bounds
enforcement, and locale-aware formatting without re-implementing them.

### Added

- **`ThemedNumberInput`** (`src/components/ThemedNumberInput/`) — Themed
  numeric field with stacked increment/decrement triggers. Key props: `value`
  (`Accessor<number | undefined>`), `onChange`, `name`, `label`, `description`,
  `errorMessage`, `min`, `max`, `step?` (default `1`). Friendly `min`/`max`
  names map to kobalte's `minValue`/`maxValue`; all other `NumberFieldRootProps`
  forward via spread. Visual family with `ThemedInput` / `ThemedTextarea`
  (shared paddings, borders, focus ring).

### API divergences from downstream

- Downstream `amygdala-ui/src/components/forms/inputs/NumberInput.tsx` used
  `value?: number | Accessor<number | undefined>` and `onChange?: (value: number) => void`.
  Upstream tightens to `value?: Accessor<number | undefined>` (accessor-only —
  matches the rest of the library's reactive-prop convention) and changes
  `onChange` to `(value: number | undefined) => void` so callers don't need to
  guard on `NaN` when the field is cleared (kobalte emits `NaN`; we normalize
  to `undefined` at the boundary).
- Downstream surfaced `min` / `max` as its own props while the rest of the
  kobalte API was spread; upstream keeps that same friendly surface but
  explicitly `Omit`s `minValue` / `maxValue` from the forwarded kobalte props
  so the two spellings can't collide.

### Driving downstream site

- `amygdala-ui/src/components/forms/inputs/NumberInput.tsx` (sole call site).

### Unblocks

- Phase 5 forms — numeric threshold / bound fields (engine parameters, alarm
  thresholds, sampling rates).

## v0.6.0 — Selection Primitives (Phase 1.3)

Adds unified `Select` and `Combobox` primitives — each folds the single- and multi-mode downstream variants into a single upstream component via a `multiple?: boolean` literal that narrows `value` / `onChange`.

### Added

- **`Select`** (`src/components/Select/`) — Kobalte-backed single + multi select. Key props: `options`, `value`, `onChange`, `label`, `description`, `placeholder`, `id`, `multiple?`. All other `SelectRootProps` are forwarded. Multi-mode trigger renders a comma-joined preview + inline clear button; single-mode uses `disallowEmptySelection={false}`.
- **`Combobox`** (`src/components/Combobox/`) — Kobalte-backed single + multi combobox. Supports freeform creation on Enter via `onCreate`, per-chip removal via `onRemove` (multi-mode), input-change callback via `onInputChange`, and a `showChips` toggle (default `true` in multi-mode).

### Shared behavior

- Both components compose the existing `Icon` atomic (check / chevron-down / close) — no new iconography.
- Both CSS files use only `--sui-*` tokens; structural rules land in `dist/index.css`.
- Both ship in client + server bundles (SSR-safe via `vite-plugin-solid` `ssr: true` + kobalte `noExternal`, matching Tooltip's Phase 1.2 pattern).

### API divergences from downstream

- Single-site `onCreateNew` is renamed to `onCreate` for symmetry with the multi-site contract. Downstream call-site renames happen in a later phase.
- `showChips` defaults to `true` in multi-mode (was downstream-opt-in). Set `showChips={false}` to retain the listbox-only indicator behavior.

### Driving downstream sites

- Phase 5 forms (priority / status / tag pickers)
- Phase 8 `select` / `combobox` / `MultiCombobox` migrations

## v0.5.0 and earlier

See git log for prior history.
