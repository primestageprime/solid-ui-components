// Shared example data for the balance review showcases: a company's last
// 38 days, a forecast frozen on the 1st, and the day-by-day variance.
import type { VarianceKind } from "../../src/components/VarianceStrip";

const day = (d: number) => new Date(Date.UTC(2026, 8, d));
export const x = (p: { readonly date: Date }) => p.date.getTime();
export const fmt = (v: number) => `${v < 0 ? "−" : ""}$${Math.round(Math.abs(v) / 1000)}k`;

const MOVES: readonly number[] = [
  0, 12_000, -3_000, 0, -18_000, 0, 0, 9_000, 0, -2_500, 0, 0, 0, 7_000, -1_200, 0, -32_000, 0, 4_000, 0,
  0, -2_000, 0, 0, 6_500, 0, 0, 22_000, -1_000, 0, 0, -8_000, 0, 3_000, 0, 0, -1_500, 0,
];
export const BALANCE = MOVES.reduce<{ date: Date; value: number }[]>(
  (acc, m, i) => [...acc, { date: day(i + 1), value: (acc[acc.length - 1]?.value ?? 140_000) + m }],
  [],
);
export const FORECAST = MOVES.map((_, i) => ({ date: day(i + 1), value: 140_000 + i * 600 }));
const KINDS: readonly VarianceKind[] = ["revenue", "costs", "other"];
export const DAYS = BALANCE.slice(1).map((p, i) => ({
  date: p.date,
  value: p.value - BALANCE[i].value - 600,
  kind: KINDS[Math.abs(MOVES[i + 1]) > 5_000 ? (MOVES[i + 1] > 0 ? 0 : 1) : 2],
}));
export const MARKS = [4, 16, 27].map((i) => ({
  date: BALANCE[i].date,
  value: BALANCE[i].value,
  label: `Sep ${i + 1} ${["Regus", "revenue", "STAX Engineering"][[4, 16, 27].indexOf(i)]} ${fmt(MOVES[i])}`,
}));
