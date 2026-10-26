// Test and showcase data for ImportProposalsTree. Invented names and amounts.
import type { ProposalNode, ProposalsData } from "./ImportProposalsTree";

const leaf = (id: string, name: string, kind: string, amount: string): ProposalNode => ({
	id,
	level: "projection",
	name,
	kind,
	amount,
	cadence: "monthly",
	count: "3",
	total: "",
	halted: false,
	last: "",
	checkable: true,
	checked: true,
	payments: [],
	children: [],
});

export const PROPOSALS: ProposalsData = {
	summary: "2 new projections",
	tree: [
		{
			...leaf("exp", "EXPENSES", "", ""),
			level: "side",
			checkable: false,
			children: [
				leaf("rent", "Harbor Rent", "Fixed", "$2,000"),
				leaf("power", "Lumen Power", "Variable", "$80 – $120"),
			],
		},
	],
	halted: [
		{
			id: "h1",
			name: "Old gym",
			kind: "Fixed",
			amount: "$40",
			cadence: "monthly",
			count: "6",
			total: "$240",
			last: "Mar 2",
			payments: [],
		},
	],
	haltedTitle: "HALTED · 1",
};
