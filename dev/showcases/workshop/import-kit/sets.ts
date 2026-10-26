// Small set helpers for the bench state. Each returns a new set.
import type { Tier } from "./types";

export const flip = (
	s: ReadonlySet<string>,
	key: string,
): ReadonlySet<string> =>
	s.has(key) ? new Set([...s].filter((k) => k !== key)) : new Set([...s, key]);

export const toggled = (
	s: ReadonlySet<string>,
	key: string,
	on: boolean,
): ReadonlySet<string> => (s.has(key) === on ? s : flip(s, key));

/** The ids of the tier rows that the board checks at the start. */
export const checkedRows = (tiers: readonly Tier[]): ReadonlySet<string> =>
	new Set(
		tiers.flatMap((t) => t.rows.filter((r) => r.checked).map((r) => r.id)),
	);
