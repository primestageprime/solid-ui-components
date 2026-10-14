/**
 * Rhino Tool House receivables — from PrimeStage's QBO export
 * "PrimeStage Sep 23, 2026.zip", General Ledger, A/R account, customer
 * Rhino Tool House. Amounts in dollars.
 *
 * The export holds no estimates (QBO estimates are non-posting), so an
 * "unfulfilled" invoice here is an OPEN invoice: one no payment has closed.
 */

export interface InvoiceLine {
  readonly item: string;
  readonly amount: number;
}

export interface Invoice {
  readonly id: string;
  /** ISO date, YYYY-MM-DD. */
  readonly date: string;
  readonly amount: number;
  readonly lines: readonly InvoiceLine[];
}

export interface Payment {
  /** The invoice this payment closes. */
  readonly invoice: string;
  readonly date: string;
  readonly amount: number;
}

export const CUSTOMER = "Rhino Tool House";

/** The last date the export carries; the chart ends here, not today. */
export const LAST_DATA = "2026-09-23";

export const INVOICES: readonly Invoice[] = [
  {
    id: "1151",
    date: "2026-04-28",
    amount: 27_990,
    lines: [
      { item: "Migration from NetSuite", amount: 33_480 },
      { item: "Repair Tracker", amount: 2_880 },
      { item: "25% Discount", amount: -8_370 },
    ],
  },
  {
    id: "1158",
    date: "2026-07-24",
    amount: 5_220,
    lines: [{ item: "Repair Tracker", amount: 5_220 }],
  },
  {
    id: "1159",
    date: "2026-07-24",
    amount: 15_840,
    lines: [{ item: "Business Analytics Reports", amount: 15_840 }],
  },
  {
    id: "1163",
    date: "2026-08-11",
    amount: 7_200,
    lines: [
      { item: "Business Analytics Reports", amount: 5_760 },
      { item: "User Acceptance and Training", amount: 1_440 },
    ],
  },
];

export const PAYMENTS: readonly Payment[] = [
  { invoice: "1151", date: "2026-06-16", amount: 27_990 },
];

/** How long after its invoice date a payment is expected. */
export interface TermsPreset {
  readonly id: string;
  readonly label: string;
  readonly days: number;
}

export const TERMS_PRESETS: readonly TermsPreset[] = [
  { id: "net30", label: "Net 30", days: 30 },
  // Invoice 1151 was paid 49 days after it was issued.
  { id: "observed", label: "Observed lag (49 days)", days: 49 },
];

export const NOTE =
  "Unfulfilled means open: the QBO export holds no estimates (estimates are non-posting), so every invoice no payment has closed is counted.";
