// ManualGroupStep — step 2, Manual group. The rail lists the payments that
// wait, the groups, and the ignored payments. The card shows the current
// payment with its quick picks (keys 1–9: the groups made in this step, as
// on the board), Group (g), Ignore (i) and Undo (u). The board holds the
// state (assign, created, history); this step only calls its handlers.
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
import { ScoreBadge } from "../../../../src/components/ScoreBadge";
import type { MgActions, MgRow, MgView } from "./types";

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
	readonly view: MgView;
	readonly act: MgActions;
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
	const left = () => props.view.rows;
	const [name, setName] = createSignal<ComboboxOption | null>(null);
	const current = createMemo(
		(): MgRow | undefined => left().find((p) => p.current) ?? left()[0],
	);
	const options = createMemo((): ComboboxOption[] =>
		props.view.groups.map((g) => ({
			value: g.name,
			label: `${g.name} · ${g.count}`,
		})),
	);
	const railItems = createMemo((): RailItem[] => [
		...left().map((p) => ({
			key: p.id,
			bucket: "ungrouped" as const,
			label: p.payee,
			meta: p.amt,
		})),
		...props.view.groups.map((g) => ({
			key: `g:${g.name}`,
			bucket: "groups" as const,
			label: g.name,
			meta: String(g.count),
		})),
		...props.view.ignored.map((p) => ({
			key: `i:${p.id}`,
			bucket: "ignored" as const,
			label: p.payee,
			meta: p.amt,
		})),
	]);

	const put = (group: string) => {
		const p = current();
		if (!p || !group) return;
		props.act.place(p.id, group);
		setName(null);
	};
	const skip = () => {
		const p = current();
		if (p) props.act.ignore(p.id);
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
						key && left().some((p) => p.id === key) && props.act.pick(key)
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
					<MutedBody>{props.view.sub}</MutedBody>
					<Show
						when={current()}
						fallback={
							<MutedEmptyState message="Every payment is in a group or ignored. Press Enter to go on." />
						}
					>
						{(p) => (
							<ContentSurface>
								<TightStack>
									<MonoMeta>{p().pos}</MonoMeta>
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
												badge={{ label: p().badge, tone: "plain", tip: p().tip }}
											/>
										</Show>
									</ClusterRow>
									<WrapRow>
										<For each={p().quick.slice(0, 9)}>
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
										<For each={p().sugs}>
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
											disabled={!props.view.canUndo}
											onTrigger={() => props.act.undo()}
										>
											Undo
										</HotkeyButton>
										<MonoMeta>{props.view.undoLabel}</MonoMeta>
									</ClusterRow>
								</TightStack>
							</ContentSurface>
						)}
					</Show>
					<Legend />
					<Show when={props.view.ignored.length > 0}>
						<SectionTitle>IGNORED</SectionTitle>
						<For each={props.view.ignored}>
							{(i) => (
								<ClusterRow>
									<TextBody>{i.payee}</TextBody>
									<MonoMeta>{i.amt}</MonoMeta>
									<Show when={i.badge}>
										<ScoreBadge
											badge={{ label: i.badge, tone: "plain", tip: i.tip }}
										/>
									</Show>
									<Show when={i.canUnignore}>
										<SmallGhostButton onClick={() => props.act.unignore(i.id)}>
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
};
