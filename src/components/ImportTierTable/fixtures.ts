// Test and showcase data for ImportTierTable. Invented names and amounts.
import type { ImportTier } from "./ImportTierTable";

export const IMPORT_TIERS: readonly ImportTier[] = [
	{
		key: "look",
		title: "NEEDS A LOOK",
		folds: false,
		warn: true,
		rows: [
			{
				id: "g1",
				name: "Harbor Rent",
				badges: [{ label: "same day", tone: "ok", tip: "Paid on the 1st" }],
				score: "92%",
				lead: "",
				count: "2",
				payments: [
					{ date: "Jan 1", payee: "", score: "", amount: "$2,000" },
					{ date: "Feb 1", payee: "", score: "", amount: "$2,000" },
				],
				total: "$4,000",
				result: "new group",
			},
		],
	},
	{
		key: "plain",
		title: "GROUPED",
		folds: true,
		rows: [
			{
				id: "g2",
				name: "Lumen Power",
				badges: [{ label: "monthly", tone: "weak", tip: "Gaps vary" }],
				score: "71%",
				lead: "",
				count: "1",
				payments: [{ date: "Jan 9", payee: "", score: "", amount: "$80" }],
				total: "$80",
				result: "new group",
			},
		],
	},
];
