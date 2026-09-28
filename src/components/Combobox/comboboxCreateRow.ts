/**
 * Combobox — the explicit "Create …" row, as a pure function. No Solid, no DOM.
 *
 * Enter used to mean "call `onCreate` unless the typed text exactly matches an
 * option label" (Combobox.tsx history, pre-2026-09-28) — so typing "Roofing"
 * with "Roofing Cash-in Test Group" already listed created a NEW group instead
 * of picking the one on screen (thorcasting #111). The fix folds "Create" into
 * the option list as one more row, so Kobalte's own highlight-and-Enter
 * machinery decides pick vs. create instead of a bespoke keydown guard:
 *
 *   - No exact-label match (case-insensitive, trimmed) → append a synthetic
 *     `Create "<text>"` option. Kobalte's default filter keeps it visible
 *     (its label always contains the typed text), and highlights the first
 *     row of the filtered list — a real match, if one filters in ahead of it.
 *   - An exact match → no synthetic row at all, so Enter can only pick.
 *   - Empty text, or no `onCreate` — the option list is returned unchanged.
 *
 * `handleChange` (ComboboxSingle/ComboboxMulti) checks `isComboboxCreateOption`
 * on whatever Kobalte reports as chosen and routes it to `onCreate` instead of
 * `onChange`.
 */

/** Sentinel `value` marking the synthetic "Create …" row. No real option may
 *  carry it — callers own their own `value` namespace, so a collision would
 *  be a caller bug, not a Combobox one. */
export const COMBOBOX_CREATE_VALUE = "__sui-combobox-create__";

export const comboboxCreateLabel = (text: string): string => `Create "${text}"`;

import { filter, some } from "../../fn";

interface LabeledOption {
  value: string;
  label: string;
}

/** The synthetic "Create …" row itself, for a caller (e.g. multi-mode) that
 *  builds its own option list rather than going through `comboboxWithCreateRow`. */
export const comboboxCreateOption = (text: string): LabeledOption => ({
  value: COMBOBOX_CREATE_VALUE,
  label: comboboxCreateLabel(text),
});

/** `true` for the row `comboboxWithCreateRow` appended — never for a real
 *  option, since callers do not mint values in this sentinel's namespace. */
export const isComboboxCreateOption = (
  option: Pick<LabeledOption, "value"> | null | undefined,
): boolean => option?.value === COMBOBOX_CREATE_VALUE;

/** `true` when some label in `candidates` equals `text` exactly, trimmed and
 *  case-insensitively. Multi-mode checks this against `options` AND the
 *  current `value` (a selected chip may not appear in `options` any more),
 *  so the check takes the candidate set explicitly rather than assuming it. */
export const comboboxHasExactMatch = (
  candidates: readonly Pick<LabeledOption, "label">[],
  text: string,
): boolean => {
  const want = text.trim().toLowerCase();
  return some(
    (option) => option.label.trim().toLowerCase() === want,
    candidates,
  );
};

/**
 * The rows (options, or options + the Create row) that would actually show
 * under Kobalte's own default filter (case-insensitive "contains" on the
 * label — Kobalte's `defaultFilter: "contains"`, confirmed against its
 * source; also documented from the pre-fix keydown guard this replaces).
 * Used only to pick a fallback "first highlighted" row when Kobalte hasn't
 * highlighted anything yet (see ComboboxSingle/ComboboxMulti) — Kobalte
 * itself still does the real, authoritative filtering in the DOM.
 */
export const comboboxVisibleRows = <O extends LabeledOption>(
  rows: readonly O[],
  text: string,
): readonly O[] => {
  const want = text.trim().toLowerCase();
  if (want === "") return rows;
  return filter((row) => row.label.toLowerCase().includes(want), rows);
};

/**
 * `options`, plus a trailing synthetic "Create …" row when `text` (trimmed)
 * matches no option's label exactly (case-insensitive) — the row Enter treats
 * as "create", once Kobalte highlights and selects it like any other option.
 * Returns `options` unchanged for blank text, so the row never floats over an
 * empty input.
 */
export const comboboxWithCreateRow = <O extends LabeledOption>(
  options: readonly O[],
  text: string,
): readonly (O | LabeledOption)[] => {
  const trimmed = text.trim();
  if (trimmed === "" || comboboxHasExactMatch(options, trimmed)) {
    return options;
  }
  return [...options, comboboxCreateOption(trimmed)];
};
