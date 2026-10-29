// ============================================
// ManualProjectionRail — Composite (Depth 2). UNSTABLE: exported from `/unstable` only.
// Tags: shows:list, does:pick, does:hover, data:grouped, role:rail
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// The two side lists of the Manual (projection) step. `ManualProjectionRail`
// lists the groups by section (to review, matched, other); a click on a
// pickable group calls `onPick`. `ManualPaymentsPane` lists the open group's
// payments by config, each row its date (DateCell, YYYY-MM-DD) and its
// amount, right-aligned; never its due date (Peter, 2026-10-28). The hovered
// row is `hotKey`, and a focus change calls `onHover` with the row key or null.
//
// `ManualProjectionCardRail` (approved by Peter 2026-10-28) is the same rail
// with each group as a card: the name on top, one line, ellipsized; the
// payment count bottom left and the total bottom right. A TO REVIEW group adds
// its unmatched amount in warning ink between them.
//
// No CSS. Composes BucketQueue, DateCell, EllipsisText, SpreadRow, TightStack
// and Text variants.
// ============================================
import { type Component, Show } from "solid-js";
import { find, map } from "../../fn";
import { type Bucket, BucketQueue } from "../BucketQueue";
import { EllipsisText } from "../DataDisplay";
import { SpreadRow, TightStack } from "../Layout";
import { DateCell } from "../Table";
import { MonoMeta, TextBody, WarningBody } from "../Text";
import type {
	ManualPaneGroup,
	ManualPaneRow,
	ManualRailCardItem,
	ManualRailItem,
	ManualRailSection,
} from "./types";

export interface ManualProjectionRailProps {
	readonly sections: readonly ManualRailSection[];
	readonly items: readonly ManualRailItem[];
	/** The key of the open group. */
	readonly currentKey?: string;
	readonly onPick: (key: string) => void;
}

export const ManualProjectionRail: Component<ManualProjectionRailProps> = (
	props,
) => (
	<BucketQueue<ManualRailItem>
		buckets={map(
			(s: ManualRailSection): Bucket => ({
				key: s.key,
				label: s.title,
				tone: s.tone,
				emptyLabel: s.emptyText,
			}),
			props.sections,
		)}
		items={[...props.items]}
		bucketOf={(i) => i.section}
		keyOf={(i) => i.key}
		selectedKey={props.currentKey}
		onSelect={(key) => {
			const item = find((i: ManualRailItem) => i.key === key, props.items);
			if (item?.pickable) props.onPick(item.key);
		}}
		renderItem={(i) => (
			<SpreadRow>
				<TextBody>{i.name}</TextBody>
				<MonoMeta>{i.note}</MonoMeta>
			</SpreadRow>
		)}
	/>
);

/** One group as a card: the name on one line (EllipsisText: "…" and the full
 *  name in a tooltip when it is cut), then its unmatched amount when it has
 *  one, then the count at the left and the total at the right. One line of
 *  name keeps every card one height, which BucketQueue's row sizing assumes. */
export const ManualRailCard: Component<{ item: ManualRailCardItem }> = (
	props,
) => (
	<TightStack>
		<TextBody>
			<EllipsisText tooltip={props.item.name} />
		</TextBody>
		<Show when={props.item.unmatched}>
			{(u) => <WarningBody>{u()}</WarningBody>}
		</Show>
		<SpreadRow>
			<MonoMeta>{props.item.count}</MonoMeta>
			<MonoMeta>{props.item.total}</MonoMeta>
		</SpreadRow>
	</TightStack>
);

export interface ManualProjectionCardRailProps {
	readonly sections: readonly ManualRailSection[];
	readonly items: readonly ManualRailCardItem[];
	/** The key of the open group. */
	readonly currentKey?: string;
	readonly onPick: (key: string) => void;
}

/** The rail with each group drawn as a `ManualRailCard`. Selection, sections
 *  and picking are the same as `ManualProjectionRail`. */
export const ManualProjectionCardRail: Component<
	ManualProjectionCardRailProps
> = (props) => (
	<BucketQueue<ManualRailCardItem>
		buckets={map(
			(s: ManualRailSection): Bucket => ({
				key: s.key,
				label: s.title,
				tone: s.tone,
				emptyLabel: s.emptyText,
			}),
			props.sections,
		)}
		items={[...props.items]}
		bucketOf={(i) => i.section}
		keyOf={(i) => i.key}
		selectedKey={props.currentKey}
		onSelect={(key) => {
			const item = find(
				(i: ManualRailCardItem) => i.key === key,
				props.items,
			);
			if (item?.pickable) props.onPick(item.key);
		}}
		renderItem={(i) => <ManualRailCard item={i} />}
	/>
);

/** Keep "$6,000 of $7,000" on one line: no-break spaces. */
const oneLine = (t: string): string => t.replace(/ /g, " ");

export interface ManualPaymentsPaneProps {
	readonly groups: readonly ManualPaneGroup[];
	readonly rows: readonly ManualPaneRow[];
	/** The key of the hovered row. */
	readonly hotKey?: string;
	readonly onHover: (key: string | null) => void;
}

export const ManualPaymentsPane: Component<ManualPaymentsPaneProps> = (
	props,
) => (
	<BucketQueue<ManualPaneRow>
		buckets={map(
			(g: ManualPaneGroup): Bucket => ({
				key: g.key,
				label: `${g.name} · ${g.count} · ${g.total}`,
				tone: g.warn ? "warning" : "default",
				collapsible: true,
				collapsedByDefault: !g.expanded,
				emptyLabel: g.desc,
			}),
			props.groups,
		)}
		items={[...props.rows]}
		bucketOf={(r) => r.group}
		keyOf={(r) => r.key}
		selectedKey={props.hotKey}
		onFocusChange={(key) => props.onHover(key ?? null)}
		renderItem={(r) => (
			<SpreadRow>
				<DateCell value={r.date} timeZone="UTC" />
				<MonoMeta tone={r.tone}>{oneLine(`${r.amount}${r.of}`)}</MonoMeta>
			</SpreadRow>
		)}
	/>
);
