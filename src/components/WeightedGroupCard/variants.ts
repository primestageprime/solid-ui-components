import type { Component } from "solid-js";
import { formatCompactCurrency } from "../../internal/format/number";
import {
  type WeightedGroupCardDataProps,
  createWeightedGroupCard,
} from "./WeightedGroupCard";

/**
 * CompactCurrencyWeightedGroupCard — a role card in compact dollars, with the
 * same unit, grid and verbs as Thorcasting's payroll row
 * (`CompactCurrencyMutationSliders`): `$62K` per unit, `×3 = $188K` under it,
 * amounts on whole thousands and typed in place rounded to the thousand, and a
 * member taken out with "Delete".
 *
 * @example
 *   <CompactCurrencyWeightedGroupCard group={carpenters()} onChange={setCarpenters} />
 */
export const CompactCurrencyWeightedGroupCard: Component<WeightedGroupCardDataProps> =
  createWeightedGroupCard({
    format: formatCompactCurrency,
    readout: "beside",
    snap: 1_000,
    precision: -3,
    labels: { remove: "Delete" },
  });
