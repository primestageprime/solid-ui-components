// ============================================
// The library's canonical en-US number rendering: grouped digits with capped
// (never padded) fraction digits, and the compact "3.4k" / "1.2M" magnitude
// scaling built on top of it.
//
// `toLocaleString("en-US", { maximumFractionDigits: N })` appeared verbatim
// five times across the ScrubChart / CashflowScrubChart helper files
// (defaultFormatY, fmtDollars, and all three branches of fmtAxisDollars).
// These two functions are the single source of truth for that policy.
//
// NOT unified here, on purpose — near-miss formatters whose output is
// observably different, so consolidating them would be a visual change:
//   • ThroughputChart / CompletionTimeline `fmtNum` — toFixed + uppercase "K"
//   • CashflowChart `formatDollars`        — k-only tier, toFixed(0)
//   • Chart/Axes default label             — default-locale toLocaleString
// If one of those displays is ever revisited, prefer migrating it onto
// formatCompactNumber over growing this module knobs.
// ============================================

export const formatGroupedNumber = (
  value: number,
  maxFractionDigits = 0,
): string =>
  value.toLocaleString("en-US", { maximumFractionDigits: maxFractionDigits });

// Thresholds compare |value|; the signed value is formatted so the sign
// survives each tier. Values just under a boundary round up within their
// tier (999_999 → "1,000k"), matching the behavior this was extracted from.
export const formatCompactNumber = (value: number): string => {
  const abs = Math.abs(value);
  return abs >= 1_000_000
    ? `${formatGroupedNumber(value / 1_000_000, 1)}M`
    : abs >= 1_000
      ? `${formatGroupedNumber(value / 1_000, 1)}k`
      : formatGroupedNumber(value);
};
