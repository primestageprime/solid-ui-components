// Adapt — maps the live board view (renderVals) to the bench view types. The
// mappers are the ones in prototypes/import-canvas/sui-fixtures/dump.js; here
// they run on live values, so each step shows what the board computes now.
import type {
	BBadge,
	BLeft,
	BMark,
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
	MpBar,
	MpChart,
	MpLane,
	MpPaneRow,
	MpSideItem,
	MpView,
	Payment,
	ProposalNode,
	ProposalsData,
	Tier,
	TierRow,
	UngroupedRow,
} from "./types";

const badge = (b: BBadge): Badge => ({ t: b.t, tone: b.tone, tip: b.tip });
const pay = (p: BPay): Payment => ({
	d: p.d,
	payee: p.payee ?? "",
	score: p.score ?? "",
	amt: p.amt,
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
	goes: r.goes ?? "",
	list: (r.list ?? []).map(pay),
});
const leftRow = (p: BLeft, i: number): UngroupedRow => ({
	id: `left-${i}`,
	payee: p.payee,
	date: p.date,
	amt: p.amt,
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
				amt: i.amt,
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
		text: t.text,
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

// ---------- Manual (projection) ----------
/** Read the board's CSS text of a mark into numbers: "left: 4px; height: 9px" → { left: 4, height: 9 }. */
export const geometry = (style: string): Record<string, number> =>
	Object.fromEntries(
		style
			.split(";")
			.map((kv) => kv.split(":").map((t) => t.trim()))
			.filter(([k, v]) => k && v !== undefined && /^-?[\d.]+(px)?$/.test(v))
			.map(([k, v]) => [k, Number.parseFloat(v ?? "0")]),
	);

/** The board marks a hovered payment with its accent colour. */
const isHot = (style: string): boolean => style.includes("#4c9aff");
const GREEN = "#34c77b";
const YELLOW = "#fde68a";

const bar = (m: BMark, unmatched: boolean): MpBar => {
	const g = geometry(m.style);
	return {
		x: g.left ?? 0,
		w: g.width ?? 3,
		bottom: g.bottom ?? 0,
		h: g.height ?? 0,
		kind: unmatched
			? "unmatched"
			: m.style.includes(GREEN)
				? "ontime"
				: m.style.includes(YELLOW)
					? "late"
					: "unmatched",
		hot: isHot(m.style),
		enter: m.enter ?? (() => undefined),
		leave: m.leave ?? (() => undefined),
	};
};

const lane = (l: BoardVals["mLanes"][number]): MpLane => ({
	name: l.name,
	sub: l.sub,
	h: l.h,
	slots: l.slots.map((s) => {
		const g = geometry(s.style);
		return {
			x: g.left ?? 0,
			w: g.width ?? 0,
			bottom: g.bottom ?? 0,
			h: g.height ?? 0,
			title: s.title,
			missing: s.missing,
			catchup: s.catchup,
			parts: s.parts.map((p) => {
				const pg = geometry(p.style);
				return {
					bottom: pg.bottom ?? 0,
					h: pg.height ?? 0,
					kind: p.cls.includes("gO") ? ("ontime" as const) : ("late" as const),
					hot: isHot(p.style),
					enter: p.enter ?? (() => undefined),
					leave: p.leave ?? (() => undefined),
				};
			}),
		};
	}),
	bars: l.bars.map((b) => bar(b, false)),
	links: l.links.map((k) => {
		const g = geometry(k.style);
		return { x: g.left ?? 0, w: g.width ?? 0, bottom: g.bottom ?? 0 };
	}),
});

const chart = (x: BoardVals): MpChart => ({
	trackW: Number(x.trackW),
	heads: x.mHeads.map((h) => {
		const g = geometry(h.style);
		return {
			x: g.left ?? 0,
			w: g.width ?? 0,
			label: h.label,
			fresh: h.style.includes("#8bbcff"),
		};
	}),
	grid: x.mGrid.map((m) => ({
		x: geometry(m.style).left ?? 0,
		strong: m.style.includes("#33405a"),
	})),
	unmatched: {
		h: Number(x.unLaneH),
		total: x.unTotal,
		boxes: x.unBoxes.map((b) => {
			const g = geometry(b.style);
			return {
				x: g.left ?? 0,
				w: g.width ?? 0,
				bottom: g.bottom ?? 0,
				h: g.height ?? 0,
			};
		}),
		bars: x.unBars.map((b) => bar(b, true)),
	},
	lanes: x.mLanes.map(lane),
});

const BUCKETS = ["review", "matched", "other"] as const;

const sideItems = (x: BoardVals): MpSideItem[] =>
	x.mSections.flatMap((sec, si) =>
		sec.items.map((g) => ({
			key: `${BUCKETS[si] ?? "other"}:${g.name}`,
			bucket: BUCKETS[si] ?? "other",
			name: g.name,
			note: g.note,
			current: g.current === "true",
			pick: g.clickable && g.pick ? g.pick : undefined,
		})),
	);

const paneTone = (color: string): MpPaneRow["tone"] =>
	color === GREEN
		? "ontime"
		: color === YELLOW
			? "late"
			: color === "#7dd3c0"
				? "credit"
				: "unmatched";

const paneRows = (x: BoardVals): MpPaneRow[] =>
	x.mPane.flatMap((g) =>
		g.shown.map((r, i) => ({
			key: `${g.name}:${i}`,
			bucket: g.name,
			date: r.date,
			slot: r.slot,
			amount: r.amount,
			of: r.of,
			tone: paneTone(r.color),
			hot: isHot(r.style),
			enter: r.enter ?? (() => undefined),
			leave: r.leave ?? (() => undefined),
		})),
	);

export const mpView = (
	x: BoardVals,
	edit: MpView["edit"]["state"],
): MpView => ({
	sections: x.mSections.map((s, i) => ({
		key: BUCKETS[i] ?? "other",
		title: s.title,
		count: s.count,
		emptyText: s.emptyText,
	})),
	side: sideItems(x),
	done: {
		on: x.mDone,
		title: x.mDoneTitle,
		text: x.mDoneText,
		next: x.mDoneNext,
		go: x.mDoneGo,
	},
	drop: { on: x.mDropSome, note: x.mDropNote },
	title: x.mTitle,
	why: x.mWhy,
	whyWarn: x.mWhyStyle.includes("#f5a524"),
	sub: x.mSub,
	desc: x.mDesc,
	hasGroup: x.mHasGroup,
	chart: chart(x),
	sugs: x.mSugs.map((s) => ({
		title: s.title,
		amount: s.amount,
		sub: s.sub,
		add: s.add,
	})),
	cfgs: x.mCfgs.map((c) => ({
		name: c.name,
		amount: c.amount,
		sub: c.sub,
		editLabel: c.editLabel,
		delLabel: c.delLabel,
		confirming: c.confirming,
		confirmText: c.confirmText,
		edit: c.edit,
		askDelete: c.askDelete,
		cancelDelete: c.cancelDelete,
		doDelete: c.doDelete,
	})),
	pane: x.mPane.map((g) => ({
		key: g.name,
		name: g.name,
		desc: g.desc,
		count: g.count,
		total: g.total,
		expanded: g.expanded === "true",
		toggle: g.toggle,
	})),
	paneRows: paneRows(x),
	edit: {
		open: x.edOpen,
		title: x.edTitle,
		state: edit,
		fixed: x.edIsFixed,
		variable: x.edIsVar,
		range: x.edRange,
		pickDay: (day) => x.days.find((d) => d.label === String(day))?.pick(),
		pickLast: x.pickLast,
		setAmt: (v) => x.edOnAmt({ target: { value: String(v) } }),
		setGrace: (v) => x.edOnGrace({ target: { value: String(v) } }),
		save: x.edSave,
		close: x.edClose,
	},
	fin: {
		open: x.finOpen,
		items: x.finItems.map((f, i) => ({ id: `fin-${i}`, ...f })),
		sub: x.finSub,
		close: x.finClose,
		go: x.toSummary,
	},
});
