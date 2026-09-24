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

/**
 * The magnitude an input field is SIZED for when it declares no ceiling: one
 * billion (Peter, 2026-09-24: "a max width that accommodates something like
 * 1 Billion"). A larger value is still accepted — it just fits tightly.
 * `CURRENCY_DEFAULT_MAX` (ten billion) stays the TABLE cells' cap.
 */
export const INPUT_DEFAULT_WIDTH_MAX = 1_000_000_000;

/** Digits after the decimal point in `n` ("0.25" → 2, "5" → 0). */
const decimalsOf = (n: number): number => {
  const text = String(n);
  const point = text.indexOf(".");
  return point < 0 ? 0 : text.length - point - 1;
};

/**
 * The character count of the widest value a number field can show: the longer
 * of `max` and `min` (a minus sign counts) as `formatOptions` renders them
 * (en-US, so grouping commas, a currency symbol or a percent sign all count),
 * plus the fraction digits a fractional `step` adds that the format would not
 * already show.
 *
 * @example
 *   numberFieldChars({ max: 1_000_000_000 })                   // "1,000,000,000" → 13
 *   numberFieldChars({ max: 100, step: 0.25 })                 // "100" + ".25" → 6
 *   numberFieldChars({ max: 1e9, formatOptions: { style: "currency", currency: "USD" } })
 *                                                              // "$1,000,000,000.00" → 17
 */
export function numberFieldChars(opts: {
  max: number;
  min?: number;
  step?: number;
  formatOptions?: Intl.NumberFormatOptions;
}): number {
  const format = new Intl.NumberFormat("en-US", opts.formatOptions);
  const widest = Math.max(
    format.format(opts.max).length,
    opts.min === undefined ? 0 : format.format(opts.min).length,
  );
  const { minimumFractionDigits = 0, maximumFractionDigits = 0 } =
    format.resolvedOptions();
  const shown = Math.min(decimalsOf(opts.step ?? 1), maximumFractionDigits);
  const extra = Math.max(0, shown - minimumFractionDigits);
  const point = extra > 0 && minimumFractionDigits === 0 ? 1 : 0;
  return widest + extra + point;
}
