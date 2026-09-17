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
