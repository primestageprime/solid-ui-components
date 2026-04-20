# Changelog

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
