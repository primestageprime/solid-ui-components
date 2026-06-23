// ============================================
// fieldWidth — reusable fixed-width convention (Depth 0 util)
// ============================================
// A small, documented rule for fields whose rendered content has a KNOWN
// maximum number of characters (money capped at a ceiling, an ISO date, a
// fixed code). Such fields should NOT flex to fill their column — they should
// reserve exactly the space their widest value needs and no more.
//
// The rule, in one line:
//   width(rem) = chars * AVG_CHAR_REM + chrome(rem)
//
// `AVG_CHAR_REM` is a deliberately generous per-character advance for a
// TABULAR-figures glyph at the body font size (root = 16px). Tabular digits,
// the grouping comma, the decimal point and a currency symbol all share a
// stable advance, so a flat per-char estimate is sound PROVIDED the field uses
// `font-variant-numeric: tabular-nums`. We bias high (0.62rem ≈ 9.9px/char) so
// the widest value never clips; the few wasted pixels are cheaper than a
// reflow or an ellipsis on a money value.
//
// This is the single source of the "cap a known-width field" mechanism. New
// fixed-width fields (currency inputs/cells, date displays, fixed codes) should
// derive their cap from `fieldWidthForChars(maxChars, chrome)` rather than
// hand-picking a magic rem — see CURRENCY_MAX_DIGITS / currencyMaxChars below
// and the DatePicker's 10-char ISO width.

/** Per-character advance (rem) for a tabular glyph at the body font size. */
export const AVG_CHAR_REM = 0.62;

/**
 * Fixed width (in rem) for a field whose content is at most `chars`
 * characters wide, plus `chromeRem` of non-text chrome (steppers, an icon,
 * left/right padding). The field MUST render with tabular figures for the
 * per-char estimate to hold.
 *
 * @example
 *   // "$10,000,000,000.00" is 18 chars; reserve 4rem for steppers + padding.
 *   const cap = fieldWidthForChars(18, 4); // → 15.16rem
 */
export function fieldWidthForChars(chars: number, chromeRem = 0): number {
  const raw = chars * AVG_CHAR_REM + chromeRem;
  // Round up to 2 decimal places so the cap is a clean, reproducible rem.
  return Math.ceil(raw * 100) / 100;
}

/**
 * The character count of the widest expected currency string for a given
 * maximum magnitude, formatted en-US/USD with grouping + 2 decimals. Counts
 * the symbol, every digit, each thousands comma, the decimal point and the
 * two cents. Drives the CurrencyInput / CurrencyCell width cap.
 *
 * @example
 *   currencyMaxChars(10_000_000_000) // "$10,000,000,000.00" → 18
 */
export function currencyMaxChars(maxValue: number): number {
  // Format the ceiling itself; its rendered length IS the widest case (every
  // smaller value formats no wider). Negative ceilings count the sign too.
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(maxValue);
  return formatted.length;
}

/** Default currency ceiling: ten billion dollars ("$10,000,000,000.00"). */
export const CURRENCY_DEFAULT_MAX = 10_000_000_000;
