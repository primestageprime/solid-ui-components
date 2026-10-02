// ============================================
// Strips curried variants — Depth 2 (zero CSS)
// ============================================
import { createAmountStrip } from "./AmountStrip";
import { createCadenceStrip } from "./CadenceStrip";
import { createGrowthStrip } from "./GrowthStrip";
import { createLabelStrip } from "./LabelStrip";
import { createWindowStrip } from "./WindowStrip";

/** The name of a line. */
export const LabelStrip = createLabelStrip({});

/** Amounts up to $999,999, to the dollar. */
export const AmountStrip = createAmountStrip({ magnitude: "1M", precision: "dollars" });
/** Amounts up to $9,999, with cents. */
export const SmallAmountStrip = createAmountStrip({ magnitude: "10K", precision: "cents" });
/** Amounts up to $1,000,000,000, to the thousand. */
export const LargeAmountStrip = createAmountStrip({ magnitude: "1B", precision: "thousands" });
/** A units amount counting seats. */
export const SeatsAmountStrip = createAmountStrip({ magnitude: "1M", precision: "dollars", unit: "seats" });
/** A units amount counting hours. */
export const HoursAmountStrip = createAmountStrip({ magnitude: "1M", precision: "dollars", unit: "hours" });

/** All eight cadences. */
export const CadenceStrip = createCadenceStrip({});
/** Recurring cadences only: everything but "once". */
export const RecurringCadenceStrip = createCadenceStrip({
  allowed: ["annual", "quarterly", "monthly", "semimonthly", "biweekly", "weekly", "daily"],
});
/** Monthly or annual (a seat plan). */
export const MonthlyOrAnnualCadenceStrip = createCadenceStrip({ allowed: ["monthly", "annual"] });
/** Bi-weekly, semi-monthly or monthly (a pay schedule). */
export const PayCadenceStrip = createCadenceStrip({ allowed: ["biweekly", "semimonthly", "monthly"] });

/** Start and end. */
export const WindowStrip = createWindowStrip({ mode: "both" });
/** A start only. */
export const StartWindowStrip = createWindowStrip({ mode: "start" });
/** An end only. */
export const EndWindowStrip = createWindowStrip({ mode: "end" });

/** Units x price with no growth field: a GrowthStrip owns growth (seats). */
export const SeatsPriceAmountStrip = createAmountStrip({
  magnitude: "1M",
  precision: "dollars",
  unit: "seats",
  perPeriod: false,
});
/** Units x price with no growth field, counting plain units (a product). */
export const UnitsAmountStrip = createAmountStrip({
  magnitude: "1M",
  precision: "dollars",
  unit: "units",
  perPeriod: false,
});

/** How units change each period: none, + units, or %, with churn and a ceiling. */
export const GrowthStrip = createGrowthStrip({ churn: true, ceiling: true });
/** Growth with no churn or ceiling (a product's volume). */
export const SimpleGrowthStrip = createGrowthStrip({ churn: false, ceiling: false });
/** Growth that only adds units (none or + units): a seat plan's net new seats. */
export const UnitsGrowthStrip = createGrowthStrip({
  churn: false,
  ceiling: false,
  kinds: ["none", "units"],
});
