# Changelog

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
