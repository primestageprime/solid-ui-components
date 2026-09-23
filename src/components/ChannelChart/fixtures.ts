// ============================================
// ChannelChart fixtures — Depth 0, pure data. Shared by channelGeometry.test.ts
// and the gallery showcase, so the printed table IS the picture in the gallery.
// ============================================
import { map } from "../../fn";
import type { ChannelPeriod } from "./channelGeometry";

/**
 * Cumulative periods from per-period receipts against a per-period band
 * `[lo, hi]` — what a consumer's own adapter does (thorcasting's
 * `channelPeriods`). `diff` is the per-period distance OUTSIDE the band.
 */
export const cumulativePeriods = (
	keys: readonly string[],
	receipts: readonly number[],
	band: { readonly lo: number; readonly hi: number },
): ChannelPeriod[] => {
	let value = 0;
	return map((key: string, i: number): ChannelPeriod => {
		const got = receipts[i] ?? 0;
		value += got;
		const diff = got > band.hi ? got - band.hi : got < band.lo ? got - band.lo : 0;
		return {
			key,
			label: key.slice(2),
			lo: band.lo * (i + 1),
			hi: band.hi * (i + 1),
			value,
			diff,
		};
	}, keys);
};

const MONTHS = [
	"2026-01",
	"2026-02",
	"2026-03",
	"2026-04",
	"2026-05",
	"2026-06",
	"2026-07",
	"2026-08",
	"2026-09",
];

/**
 * STAX revenue, in CENTS: a $18.2k–$37.44k monthly band, paid in batches that
 * swing over and under it, ending at $329.3k inside $163.8k–$337.0k.
 */
export const STAX_PERIODS: readonly ChannelPeriod[] = cumulativePeriods(
	MONTHS,
	map((d: number) => d * 100, [27840, 65740, 52540, 68940, 0, 0, 96040, 18200, 0]),
	{ lo: 1_820_000, hi: 3_744_000 },
);

/** An expense group: fixed rent of $1,668.49 with one late month (paid double in 05). */
export const RENT_PERIODS: readonly ChannelPeriod[] = cumulativePeriods(
	MONTHS,
	[166849, 166849, 166849, 0, 333698, 166849, 166849, 166849, 166849],
	{ lo: 166849, hi: 166849 },
);

/** Cents → "329.3k" / "100k" / "-18.2k". */
export const formatKiloCents = (cents: number): string => {
	const k = cents / 100_000;
	return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
};
