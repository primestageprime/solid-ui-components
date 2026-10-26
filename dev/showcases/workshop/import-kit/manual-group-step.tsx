// ManualGroupStep — step 2, Manual group. The rail lists the payments that
// wait, the groups, and the ignored payments. The card shows the current
// payment with its quick picks (keys 1–9), Group (g), Ignore (i) and Undo (u).
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import {
	type Bucket,
	CompactBucketQueue,
} from "../../../../src/components/BucketQueue";
import {
	SmallButton,
	SmallGhostButton,
} from "../../../../src/components/Button";
import {
	Combobox,
	type ComboboxOption,
} from "../../../../src/components/Combobox";
import { MutedEmptyState } from "../../../../src/components/Feedback";
import { HotkeyButton } from "../../../../src/components/HotkeyButton";
import { Kbd } from "../../../../src/components/Kbd";
import {
	ClusterRow,
	ContentStack,
	GrowBox,
	NarrowStack,
	TightStack,
	WrapRow,
} from "../../../../src/components/Layout";
import { ContentSurface } from "../../../../src/components/Surface";
import {
	MonoMeta,
	MutedBody,
	SectionTitle,
	TextBody,
	TextValue,
} from "../../../../src/components/Text";
import {
	allQueued,
	assign,
	groupsWithCounts,
	ignore,
	ignoredNow,
	type MgState,
	pending,
	quickPicks,
	undo,
	undoLabel,
	unignore,
} from "./manual-group-model";
import { ScoreBadge } from "./score-badge";
import type { ManualGroupData, QueuePayment } from "./types";

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

export interface ManualGroupStepProps {
	readonly data: ManualGroupData;
	readonly state: MgState;
	readonly onState: (s: MgState) => void;
}

const Legend: Component = () => (
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

export const ManualGroupStep: Component<ManualGroupStepProps> = (props) => {
	const all = createMemo(() =>
		allQueued(props.data.queue, props.data.ignored, props.state),
	);
	const left = createMemo(() => pending(all(), props.state));
	const groups = createMemo(() =>
		groupsWithCounts(props.data.groups, props.state),
	);
	const ignored = createMemo(() =>
		ignoredNow(all(), props.data.ignored, props.state),
	);
	const [picked, setPicked] = createSignal<string | null>(null);
	const [name, setName] = createSignal<ComboboxOption | null>(null);
	const current = createMemo(
		(): QueuePayment | undefined =>
			left().find((p) => p.id === picked()) ?? left()[0],
	);
	const picks = createMemo(() => quickPicks(current(), groups()));

	const options = createMemo((): ComboboxOption[] =>
		groups().map((g, i) => ({
			value: g.name,
			label: `${i + 1}. ${g.name} · ${g.count}`,
		})),
	);
	const railItems = createMemo((): RailItem[] => [
		...left().map((p) => ({
			key: p.id,
			bucket: "ungrouped" as const,
			label: p.payee,
			meta: p.amt,
		})),
		...groups().map((g, i) => ({
			key: `g:${g.name}`,
			bucket: "groups" as const,
			label: `${i + 1}. ${g.name}`,
			meta: String(g.count),
		})),
		...ignored().map((p) => ({
			key: `i:${p.id}`,
			bucket: "ignored" as const,
			label: p.payee,
			meta: p.amt,
		})),
	]);

	const put = (group: string) => {
		const p = current();
		if (!p) return;
		props.onState(assign(props.state, p.id, group, props.data.groups));
		setName(null);
	};
	const skip = () => {
		const p = current();
		if (p) props.onState(ignore(props.state, p.id));
	};

	return (
		<ClusterRow>
			<NarrowStack>
				<CompactBucketQueue<RailItem>
					buckets={BUCKETS}
					items={railItems()}
					bucketOf={(item) => item.bucket}
					keyOf={(item) => item.key}
					selectedKey={current()?.id}
					onSelect={(key) =>
						key && left().some((p) => p.id === key) && setPicked(key)
					}
					height={440}
					renderItem={(item) => (
						<ClusterRow>
							<TextBody>{item.label}</TextBody>
							<MonoMeta>{item.meta}</MonoMeta>
						</ClusterRow>
					)}
				/>
			</NarrowStack>
			<GrowBox>
				<ContentStack>
					<MutedBody>{props.data.sub}</MutedBody>
					<Show
						when={current()}
						fallback={
							<MutedEmptyState message="Every payment is in a group or ignored. Press Enter to go on." />
						}
					>
						{(p) => (
							<ContentSurface>
								<TightStack>
									<MonoMeta>{`Payment ${all().indexOf(p()) + 1} of ${all().length}`}</MonoMeta>
									<SectionTitle>{p().payee}</SectionTitle>
									<ClusterRow>
										<TextValue
											tone={p().amt.startsWith("+") ? "success" : "default"}
										>
											{p().amt}
										</TextValue>
										<MonoMeta>{p().date}</MonoMeta>
										<Show when={p().badge}>
											<ScoreBadge
												badge={{ t: p().badge, tone: "plain", tip: p().tip }}
											/>
										</Show>
									</ClusterRow>
									<WrapRow>
										<For each={picks()}>
											{(g, i) => (
												<HotkeyButton
													size="sm"
													hotkey={String(i() + 1)}
													onTrigger={() => put(g)}
												>
													{g}
												</HotkeyButton>
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
										<HotkeyButton
											hotkey="g"
											variant="primary"
											disabled={!name()}
											onTrigger={() => put(name()?.value ?? "")}
										>
											Group
										</HotkeyButton>
										<HotkeyButton hotkey="i" onTrigger={skip}>
											Ignore
										</HotkeyButton>
										<HotkeyButton
											hotkey="u"
											variant="ghost"
											disabled={props.state.history.length === 0}
											onTrigger={() => props.onState(undo(props.state))}
										>
											Undo
										</HotkeyButton>
										<MonoMeta>{undoLabel(all(), props.state)}</MonoMeta>
									</ClusterRow>
								</TightStack>
							</ContentSurface>
						)}
					</Show>
					<Legend />
					<Show when={ignored().length > 0}>
						<SectionTitle>IGNORED</SectionTitle>
						<For each={ignored()}>
							{(i) => (
								<ClusterRow>
									<TextBody>{i.payee}</TextBody>
									<MonoMeta>{i.amt}</MonoMeta>
									<Show when={i.badge}>
										<ScoreBadge
											badge={{ t: i.badge, tone: "plain", tip: i.tip }}
										/>
									</Show>
									<SmallGhostButton
										onClick={() => props.onState(unignore(props.state, i.id))}
									>
										Un-ignore
									</SmallGhostButton>
								</ClusterRow>
							)}
						</For>
					</Show>
					<Show when={props.state.created.length > 0}>
						<ClusterRow>
							<MutedBody>New groups:</MutedBody>
							<For each={props.state.created}>
								{(g) => <SmallButton onClick={() => put(g)}>{g}</SmallButton>}
							</For>
						</ClusterRow>
					</Show>
				</ContentStack>
			</GrowBox>
		</ClusterRow>
	);
};
