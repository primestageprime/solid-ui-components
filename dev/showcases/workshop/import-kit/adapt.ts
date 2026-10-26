// Adapt — maps the live board view (renderVals) to the bench view types. The
// mappers are the ones in prototypes/import-canvas/sui-fixtures/dump.js; here
// they run on live values, so each step shows what the board computes now.
import type {
	BBadge,
	BLeft,
	BoardVals,
	BPay,
	BPropRow,
	BTierRow,
} from "./live/board-types";
import type {
	AutoView,
	Badge,
	ChangedData,
	HaltedData,
	IgnoredAgain,
	MgView,
	Payment,
	ProposalNode,
	ProposalsData,
	Tier,
	TierRow,
	UngroupedRow,
} from "./types";

const badge = (b: BBadge): Badge => ({
	label: b.t,
	tone: b.tone as Badge["tone"],
	tip: b.tip,
});
const pay = (p: BPay): Payment => ({
	date: p.d,
	payee: p.payee ?? "",
	score: p.score ?? "",
	amount: p.amt,
});
const tierRow = (r: BTierRow): TierRow => ({
	id: r.cid,
	name: r.name,
	checked: !!r.checked,
	badges: (r.badges ?? []).map(badge),
	score: r.score ?? "",
	lead: r.lead ?? "",
	count: r.count,
	total: r.total ?? "",
	result: r.goes ?? "",
	payments: (r.list ?? []).map(pay),
});
const leftRow = (p: BLeft, i: number): UngroupedRow => ({
	id: `left-${i}`,
	payee: p.payee,
	date: p.date,
	amount: p.amt,
	score: p.score ?? "",
	badges: (p.badges ?? []).map(badge),
});

interface TierSpec {
	readonly key: string;
	readonly title: string;
	readonly rows: readonly BTierRow[];
	readonly folds?: boolean;
	readonly sub?: string;
}

const LOOK = "NEEDS A LOOK · AUTOMATICALLY GROUPED";

/** The tiers of the Auto group step. The initial board has looks + plains; the incremental board has looks + adds + news. */
const tierSpecs = (x: BoardVals): TierSpec[] =>
	x.plains
		? [
				{ key: "look", title: LOOK, rows: x.looks },
				{
					key: "plain",
					title: x.plainTitle ?? "",
					sub: x.plainSub,
					rows: x.plains,
					folds: true,
				},
			]
		: [
				{ key: "look", title: LOOK, rows: x.looks },
				{
					key: "add",
					title: "ADDED TO EXISTING GROUPS",
					rows: x.adds ?? [],
					folds: true,
				},
				{ key: "new", title: "NEW GROUPS", rows: x.news ?? [] },
			];

export const tierRows = (x: BoardVals): BTierRow[] =>
	tierSpecs(x).flatMap((t) => [...t.rows]);

const ignoredAgain = (x: BoardVals): IgnoredAgain[] =>
	x.plains
		? []
		: x.ignoredList.map((i) => ({
				payee: i.payee,
				amount: i.amt,
				badge: i.badge ?? "",
				tip: i.tip ?? "",
			}));

export const autoView = (x: BoardVals): AutoView => ({
	summary: x.aSummary,
	scoreHead: x.scoreHead,
	tiers: tierSpecs(x).map(
		(t): Tier => ({
			key: t.key,
			title: t.title,
			sub: t.sub,
			folds: !!t.folds,
			warn: t.key === "look",
			rows: t.rows.map(tierRow),
		}),
	),
	ungrouped: x.aLeft.map(leftRow),
	tune: x.tune.map((t) => ({
		key: t.key,
		label: t.label,
		min: Number(t.min),
		max: Number(t.max),
		value: Number(t.value),
	})),
	ignored: ignoredAgain(x),
});

// ---------- Manual group ----------
/** The payment id inside a board tooltip id ("ii-tip-n76" → "n76"). */
const pidOf = (tipId: string | undefined, i: number): string =>
	tipId ? tipId.replace(/^ii-(tip|ig)-/, "") : `ig-${i}`;

export const mgView = (x: BoardVals): MgView => ({
	sub: x.sub,
	rows: x.rows.map((r, i) => ({
		id: pidOf(r.tipId, i),
		pos: r.pos,
		current: r.on,
		payee: r.payee,
		date: r.date,
		amt: r.amt,
		badge: r.badge,
		tip: r.tip,
		quick: r.quick.map((q) => q.name),
		sugs: (r.sugs ?? []).map((s) => s.name),
	})),
	groups: [...x.pinned, ...x.others].map((g) => ({
		name: g.name,
		count: Number(g.count) || 0,
	})),
	created: x.pinned.map((g) => g.name),
	ignored: x.ignoredList.map((i, n) => ({
		id: pidOf(i.tipId, n),
		payee: i.payee,
		amt: i.amt,
		badge: i.hasBadge ? (i.badge ?? "") : "",
		tip: i.tip ?? "",
		canUnignore: !!i.unignore,
	})),
	undoLabel: x.undoLabel,
	canUndo: !x.noUndo,
});

// ---------- Proposals ----------
const proposalId = (r: BPropRow): string => r.key || r.cid || r.name;

export const proposalsView = (x: BoardVals): ProposalsData => {
	interface Node extends ProposalNode {
		readonly parent: string | null;
		readonly children: Node[];
	}
	const nodes: Node[] = x.pRows.map((r) => ({
		id: proposalId(r),
		parent: r.anc.at(-1) ?? null,
		level: r.isSide
			? "side"
			: r.isCat
				? "category"
				: r.isGroup
					? "group"
					: "projection",
		name: r.name,
		kind: r.kind ?? "",
		amount: r.amount ?? "",
		cadence: r.cadence ?? "",
		count: r.count ?? "",
		total: r.total ?? "",
		halted: !!r.isHalt,
		last: r.last ?? "",
		checkable: r.toggle != null,
		checked: !!r.checked,
		list: (r.list ?? []).map(pay),
		children: [],
	}));
	const byId = new Map(nodes.map((n) => [n.id, n]));
	for (const n of nodes) {
		const parent = n.parent ? byId.get(n.parent) : undefined;
		if (parent) parent.children.push(n);
	}
	const strip = ({ parent: _p, children, ...n }: Node): ProposalNode => ({
		...n,
		children: children.map(strip),
	});
	return {
		summary: x.pSummary,
		tree: nodes.filter((n) => !n.parent || !byId.has(n.parent)).map(strip),
		halted: (x.pHalted ?? []).map((h) => ({
			id: h.cid,
			name: h.name,
			checked: !!h.checked,
			kind: h.kind,
			amount: h.amount,
			cadence: h.cadence,
			count: h.count,
			total: h.total,
			last: h.last,
			list: (h.list ?? []).map(pay),
		})),
		haltedTitle: x.haltedTitle ?? "",
	};
};

/** The proposal leaves by id, with their toggles. */
export const proposalToggles = (x: BoardVals): Map<string, () => void> =>
	new Map(
		x.pRows.flatMap((r) => (r.toggle ? [[proposalId(r), r.toggle]] : [])),
	);

// ---------- Changed and Halted (incremental) ----------
export const changedView = (x: BoardVals): ChangedData => ({
	summary: x.chSummary ?? "",
	rows: (x.chRows ?? []).map((r) => ({
		id: r.cid,
		checked: !!r.checked,
		name: r.name,
		group: r.group,
		kind: r.kind,
		proj: r.proj,
		from: r.from,
		to: r.to,
		badges: r.badges.map(badge),
		count: r.count,
		list: r.list.map(pay),
		goes: r.goes,
	})),
});

export const haltedView = (x: BoardVals): HaltedData => ({
	summary: x.haSummary ?? "",
	halts: (x.haRows ?? []).map((r) => ({
		id: r.cid,
		checked: !!r.checked,
		name: r.name,
		proj: r.proj,
		last: r.last,
		gap: r.gap,
		threshold: r.threshold,
		silence: r.silence,
		goes: r.goes,
	})),
	missed: (x.miRows ?? []).map((r) => ({
		id: r.cid,
		checked: !!r.checked,
		name: r.name,
		proj: r.proj,
		missed: r.missed,
		count: r.count,
		unpaid: r.unpaid,
		last: r.last,
		note: r.note,
		goes: r.goes,
	})),
});

/** Every row with a check box and its toggle, by id, over every step. */
export const rowToggles = (x: BoardVals): Map<string, () => void> =>
	new Map([
		...tierRows(x).map((r): [string, () => void] => [r.cid, r.toggle]),
		...(x.pHalted ?? []).map((r): [string, () => void] => [r.cid, r.toggle]),
		...(x.chRows ?? []).map((r): [string, () => void] => [r.cid, r.toggle]),
		...(x.haRows ?? []).map((r): [string, () => void] => [r.cid, r.toggle]),
		...(x.miRows ?? []).map((r): [string, () => void] => [r.cid, r.toggle]),
	]);
