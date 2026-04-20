# Changelog

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
