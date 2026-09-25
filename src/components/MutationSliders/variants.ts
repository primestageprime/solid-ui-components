// Pre-configured MutationSliders variants via createMutationSliders().
// See ADR-0001: all visual/presentational configuration is locked at variant
// definition time — consumers pass data + callbacks only.
//
// ONE variant, deliberately (SUI: start with one, expand only when a real
// caller demands it). The three things a variant can lock are the unit, the
// vocabulary and the grid, and exactly one combination of them is
// domain-neutral: plain counted numbers, the library's own neutral verbs, and
// no grid. Anything else — money, percentages, "Terminate"/"Reinstate" — is a
// CONSUMER'S world, and the consumer curries it once with the factory rather
// than SUI guessing which currency or which verb.

import type { Component } from "solid-js";
import { formatCompactCurrency } from "../../internal/format/number";
import { ItemTintSurface } from "../Surface";
import {
  createMutationSliders,
  type MutationSlidersDataProps,
} from "./MutationSliders";

/**
 * NumberMutationSliders — the drop-in row for plain quantities.
 *
 * Locked: `format` groups thousands through the reader's own locale
 * (`toLocaleString`), the labels stay the neutral "Remove" / "Restore" /
 * "New", and there is no grid so a drag is continuous.
 *
 * `toLocaleString` rather than `String`, which is what the base component
 * falls back to: an unseparated `104000` is the one reading a row of dials
 * exists to make easy to compare, and `104,000` is the same number a reader
 * can take in at a glance.
 *
 * @example
 *   <NumberMutationSliders
 *     entities={rows()}
 *     onChange={setAmount}
 *     onRemove={drop}
 *     onAdd={append}
 *   />
 */
export const NumberMutationSliders: Component<MutationSlidersDataProps> =
  createMutationSliders({
    format: (value: number) => value.toLocaleString(),
  });

/**
 * CompactCurrencyMutationSliders — a row of money in compact dollars (Peter's
 * payroll board, 2026-09-24): `$125K` under the dial, the old amount beside
 * the prior arrowhead, and the difference as `+$5K (4%)`. The amount is
 * editable in place, rounded to the thousand (`precision: -3`), and an item's
 * several dials sit on `ItemTintSurface`. Selected dials are
 * LINKED — a hover link button toggles them, and they move as one level.
 *
 * Locked: `format` is `formatCompactCurrency` — the "$" is HARDCODED, Peter's
 * call, i18n comes later — `readout` is `"beside"`, and `snap` is whole
 * thousands, so a drag lands on an amount the compact figure can say exactly
 * (Peter, 2026-09-16: "have the amount snap to whole $k numbers"). The
 * footer verb is "Delete" (payroll board, 2026-09-24: a line removed from a
 * scenario is deleted, not "removed"); the other labels stay neutral, and a
 * consumer with its own verbs curries its own row.
 *
 * @example
 *   <CompactCurrencyMutationSliders
 *     entities={rows()}
 *     onChange={setPay}
 *     selected={links()}
 *     onSelectionChange={setLinks}
 *   />
 */
export const CompactCurrencyMutationSliders: Component<MutationSlidersDataProps> =
  createMutationSliders({
    format: formatCompactCurrency,
    readout: "beside",
    snap: 1_000,
    grouping: "link",
    precision: -3,
    itemFrame: ItemTintSurface,
    labels: { remove: "Delete" },
  });
