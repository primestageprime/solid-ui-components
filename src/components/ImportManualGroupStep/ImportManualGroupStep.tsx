// ============================================
// ImportManualGroupStep — Composite (Depth 3). UNSTABLE: exported from `/unstable` only.
// Tags: shows:list, shows:card, shows:kbd, does:pick, does:hotkey, does:type, data:grouped, role:section
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// The Manual group step of an import. `ManualGroupQueue` is the rail: the
// payments that wait, the groups and the ignored payments. `ManualGroupCard`
// shows the current payment with its quick picks (keys 1–9), the suggested
// groups, a group name box, Group (g), Ignore (i) and Undo (u).
// `ManualGroupLegend` lists the keys. `ImportManualGroupStep` puts the three
// side by side with the ignored list under the card. The caller holds every
// state; the step only calls its callbacks.
//
// No CSS. Composes CompactBucketQueue, Combobox, HotkeyButton, Kbd,
// ScoreBadge, SmallButton, SmallGhostButton, MutedEmptyState, ContentSurface,
// Layout variants and Text variants.
// ============================================
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import { find, map, some } from "../../fn";
import { type Bucket, CompactBucketQueue } from "../BucketQueue";
import { SmallButton, SmallGhostButton } from "../Button";
import { Combobox, type ComboboxOption } from "../Combobox";
import { MutedEmptyState } from "../Feedback";
import { HotkeyButton } from "../HotkeyButton";
import { Kbd } from "../Kbd";
import {
	ClusterRow,
	ContentStack,
	GrowBox,
	NarrowStack,
	TightStack,
	WrapRow,
} from "../Layout";
import { ScoreBadge } from "../ScoreBadge";
import { ContentSurface } from "../Surface";
import {
	MonoMeta,
	MutedBody,
	SectionTitle,
	TextBody,
	TextValue,
} from "../Text";

/** One payment that waits for a group. */
export interface ManualGroupRow {
	readonly id: string;
	/** The position text, e.g. "Payment 1 of 6". */
	readonly pos: string;
	/** True for the payment the card shows. When none is current, the first shows. */
	readonly current: boolean;
	readonly payee: string;
	readonly date: string;
	/** A credit starts with "+" and shows in success ink. */
	readonly amount: string;
	/** A plain badge text. Empty for none. */
	readonly badge: string;
	readonly tip: string;
	/** Quick-pick group names, keys 1–9 (the first nine are used). */
	readonly quick: readonly string[];
	/** Suggested group names, each a "Put in" button. */
	readonly suggestions: readonly string[];
}

/** One existing group and its payment count. */
export interface ManualGroupRef {
	readonly name: string;
	readonly count: number;
}

/** One ignored payment. */
export interface ManualGroupIgnored {
	readonly id: string;
	readonly payee: string;
	readonly amount: string;
	readonly badge: string;
	readonly tip: string;
	readonly canUnignore: boolean;
}

/** The display data of the Manual group step. */
export interface ManualGroupView {
	/** The muted line over the card. */
	readonly sub: string;
	/** The payments that wait, in order. */
	readonly rows: readonly ManualGroupRow[];
	readonly groups: readonly ManualGroupRef[];
	readonly ignored: readonly ManualGroupIgnored[];
	/** Says what Undo takes back. */
	readonly undoLabel: string;
	readonly canUndo: boolean;
}

export interface ManualGroupCallbacks {
	/** Make a waiting payment the current one. */
	readonly onPick: (id: string) => void;
	/** Put a payment in a group (a new name makes a new group). */
	readonly onPlace: (id: string, group: string) => void;
	readonly onIgnore: (id: string) => void;
	readonly onUnignore: (id: string) => void;
	readonly onUndo: () => void;
}

export type ImportManualGroupStepProps = ManualGroupCallbacks & {
	readonly view: ManualGroupView;
};

interface RailItem {
	readonly key: string;
	readonly bucket: "ungrouped" | "groups" | "ignored";
	readonly label: string;
	readonly meta: string;
}

const BUCKETS: Bucket[] = [
	{
		key: "ungrouped",
		label: "UNGROUPED",
		tone: "warning",
		emptyLabel: "None left",
	},
	{ key: "groups", label: "GROUPS", tone: "default", collapsible: true },
	{
		key: "ignored",
		label: "IGNORED",
		tone: "muted",
		collapsible: true,
		emptyLabel: "None",
	},
];

/** The current payment: the one marked current, else the first. */
export const currentManualRow = (
	rows: readonly ManualGroupRow[],
): ManualGroupRow | undefined =>
	find((p: ManualGroupRow) => p.current, rows) ?? rows[0];

const railItems = (view: ManualGroupView): RailItem[] => [
	...map(
		(p: ManualGroupRow): RailItem => ({
			key: p.id,
			bucket: "ungrouped",
			label: p.payee,
			meta: p.amount,
		}),
		view.rows,
	),
	...map(
		(g: ManualGroupRef): RailItem => ({
			key: `g:${g.name}`,
			bucket: "groups",
			label: g.name,
			meta: String(g.count),
		}),
		view.groups,
	),
	...map(
		(p: ManualGroupIgnored): RailItem => ({
			key: `i:${p.id}`,
			bucket: "ignored",
			label: p.payee,
			meta: p.amount,
		}),
		view.ignored,
	),
];

/** The rail: waiting payments, groups and ignored payments. A click on a waiting payment picks it. */
export const ManualGroupQueue: Component<{
	view: ManualGroupView;
	onPick: (id: string) => void;
}> = (props) => (
	<CompactBucketQueue<RailItem>
		buckets={BUCKETS}
		items={railItems(props.view)}
		bucketOf={(item) => item.bucket}
		keyOf={(item) => item.key}
		selectedKey={currentManualRow(props.view.rows)?.id}
		onSelect={(key) =>
			key &&
			some((p: ManualGroupRow) => p.id === key, props.view.rows) &&
			props.onPick(key)
		}
		height={440}
		renderItem={(item) => (
			<ClusterRow>
				<TextBody>{item.label}</TextBody>
				<MonoMeta>{item.meta}</MonoMeta>
			</ClusterRow>
		)}
	/>
);

/** The keys of the Manual group step. */
export const ManualGroupLegend: Component = () => (
	<WrapRow>
		<ClusterRow>
			<Kbd>g</Kbd>
			<MutedBody>group</MutedBody>
		</ClusterRow>
		<ClusterRow>
			<Kbd>1–9</Kbd>
			<MutedBody>quick pick</MutedBody>
		</ClusterRow>
		<ClusterRow>
			<Kbd>i</Kbd>
			<MutedBody>ignore</MutedBody>
		</ClusterRow>
		<ClusterRow>
			<Kbd>u</Kbd>
			<MutedBody>undo</MutedBody>
		</ClusterRow>
	</WrapRow>
);

/** The card of one payment: quick picks, suggestions, the name box, Group, Ignore and Undo. */
export const ManualGroupCard: Component<{
	row: ManualGroupRow;
	groups: readonly ManualGroupRef[];
	undoLabel: string;
	canUndo: boolean;
	onPlace: (id: string, group: string) => void;
	onIgnore: (id: string) => void;
	onUndo: () => void;
}> = (props) => {
	const [name, setName] = createSignal<ComboboxOption | null>(null);
	const options = createMemo((): ComboboxOption[] =>
		map(
			(g: ManualGroupRef) => ({
				value: g.name,
				label: `${g.name} · ${g.count}`,
			}),
			props.groups,
		),
	);
	const put = (group: string) => {
		if (!group) return;
		props.onPlace(props.row.id, group);
		setName(null);
	};
	return (
		<ContentSurface>
			<TightStack>
				<MonoMeta>{props.row.pos}</MonoMeta>
				<SectionTitle>{props.row.payee}</SectionTitle>
				<ClusterRow>
					<TextValue
						tone={props.row.amount.startsWith("+") ? "success" : "default"}
					>
						{props.row.amount}
					</TextValue>
					<MonoMeta>{props.row.date}</MonoMeta>
					<Show when={props.row.badge}>
						<ScoreBadge
							badge={{
								label: props.row.badge,
								tone: "plain",
								tip: props.row.tip,
							}}
						/>
					</Show>
				</ClusterRow>
				<WrapRow>
					<For each={props.row.quick.slice(0, 9)}>
						{(g, i) => (
							<HotkeyButton once
								size="sm"
								hotkey={String(i() + 1)}
								onTrigger={() => put(g)}
							>
								{g}
							</HotkeyButton>
						)}
					</For>
					<For each={props.row.suggestions}>
						{(g) => (
							<SmallButton onClick={() => put(g)}>{`Put in ${g}`}</SmallButton>
						)}
					</For>
				</WrapRow>
				<Combobox
					placeholder="Group name — type to find or make one"
					options={options}
					value={name}
					onChange={setName}
					onCreate={(text) =>
						setName({ value: text, label: `New group “${text}”` })
					}
				/>
				<ClusterRow>
					<HotkeyButton once
						hotkey="g"
						variant="primary"
						disabled={!name()}
						onTrigger={() => put(name()?.value ?? "")}
					>
						Group
					</HotkeyButton>
					<HotkeyButton once hotkey="i" onTrigger={() => props.onIgnore(props.row.id)}>
						Ignore
					</HotkeyButton>
					<HotkeyButton once
						hotkey="u"
						variant="ghost"
						disabled={!props.canUndo}
						onTrigger={() => props.onUndo()}
					>
						Undo
					</HotkeyButton>
					<MonoMeta>{props.undoLabel}</MonoMeta>
				</ClusterRow>
			</TightStack>
		</ContentSurface>
	);
};

export const ImportManualGroupStep: Component<ImportManualGroupStepProps> = (
	props,
) => (
	<ClusterRow>
		<NarrowStack>
			<ManualGroupQueue view={props.view} onPick={props.onPick} />
		</NarrowStack>
		<GrowBox>
			<ContentStack>
				<MutedBody>{props.view.sub}</MutedBody>
				<Show
					when={currentManualRow(props.view.rows)}
					fallback={
						<MutedEmptyState message="Every payment is in a group or ignored. Press Enter to go on." />
					}
				>
					{(row) => (
						<ManualGroupCard
							row={row()}
							groups={props.view.groups}
							undoLabel={props.view.undoLabel}
							canUndo={props.view.canUndo}
							onPlace={props.onPlace}
							onIgnore={props.onIgnore}
							onUndo={props.onUndo}
						/>
					)}
				</Show>
				<ManualGroupLegend />
				<Show when={props.view.ignored.length > 0}>
					<SectionTitle>IGNORED</SectionTitle>
					<For each={props.view.ignored}>
						{(i) => (
							<ClusterRow>
								<TextBody>{i.payee}</TextBody>
								<MonoMeta>{i.amount}</MonoMeta>
								<Show when={i.badge}>
									<ScoreBadge
										badge={{ label: i.badge, tone: "plain", tip: i.tip }}
									/>
								</Show>
								<Show when={i.canUnignore}>
									<SmallGhostButton onClick={() => props.onUnignore(i.id)}>
										Un-ignore
									</SmallGhostButton>
								</Show>
							</ClusterRow>
						)}
					</For>
				</Show>
			</ContentStack>
		</GrowBox>
	</ClusterRow>
);
