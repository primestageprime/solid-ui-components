// ============================================
// ManualProjectionCenter — Composite (Depth 2). UNSTABLE: exported from `/unstable` only.
// Tags: shows:header, shows:card, shows:notice, shows:legend, does:click, data:list, role:section
// Promoted 2026-10-26 on the owner's word, pending Peter's review.
//
// The center pieces of the Manual (projection) step.
// `ManualProjectionHeader`: the done alert, the drop warning, the group
// title with its reason badge, and two muted lines. `ManualChartLegend`: the
// legend of the lane chart. `ManualSuggestionCards`: the new config
// suggestions, each with Add. `ManualConfigCards`: the group's configs, each
// with edit and delete icon buttons. Each card list has its section title
// and an empty state.
//
// No CSS. Composes SuccessAlert, WarningAlert, SmStatusBadge, Legend,
// CompactSurface, LooseCardGrid, IconOnlyButton, Icon, SmallButton,
// SmallOutlinedButton, MutedEmptyState, Layout variants and Text variants.
// ============================================
import { type Component, For, Show } from "solid-js";
import { SmStatusBadge } from "../Badge";
import { IconOnlyButton, SmallButton, SmallOutlinedButton } from "../Button";
import { MutedEmptyState, SuccessAlert, WarningAlert } from "../Feedback";
import { Icon } from "../Icon";
import {
	ClusterRow,
	ContentStack,
	LooseCardGrid,
	SpreadRow,
	TightStack,
} from "../Layout";
import { Legend } from "../Legend";
import { CompactSurface } from "../Surface";
import {
	MonoValue,
	MutedBody,
	SectionTitle,
	TextTitle,
} from "../Text";
import type { ManualConfig, ManualDoneNotice, ManualSuggestion } from "./types";

export interface ManualProjectionHeaderProps {
	readonly title: string;
	/** The reason badge text. */
	readonly why: string;
	/** True shows the reason badge as a warning. */
	readonly whyWarn: boolean;
	readonly sub: string;
	/** A second muted line. Empty for none. */
	readonly desc: string;
	/** The done alert. Absent when the review is not done. */
	readonly done?: ManualDoneNotice;
	readonly onDone?: () => void;
	/** A warning line. Empty or absent for none. */
	readonly dropNote?: string;
}

export const ManualProjectionHeader: Component<ManualProjectionHeaderProps> = (
	props,
) => (
	<ContentStack>
		<Show when={props.done}>
			{(done) => (
				<SuccessAlert
					title={done().title}
					description={done().text}
					action={
						<SmallButton onClick={() => props.onDone?.()}>
							{done().next}
						</SmallButton>
					}
				/>
			)}
		</Show>
		<Show when={props.dropNote}>
			<WarningAlert description={props.dropNote} />
		</Show>
		<TightStack>
			<ClusterRow>
				<TextTitle>{props.title}</TextTitle>
				<SmStatusBadge
					variant={props.whyWarn ? "warning" : "compliant"}
					label={props.why}
				/>
			</ClusterRow>
			<MutedBody>{props.sub}</MutedBody>
			<Show when={props.desc}>
				<MutedBody>{props.desc}</MutedBody>
			</Show>
		</TightStack>
	</ContentStack>
);

const LEGEND = [
	{ label: "On time", color: "var(--sui-success)" },
	{ label: "Late", color: "var(--sui-warning)" },
	{ label: "Catch-up", color: "var(--sui-warning)", line: { dash: "3 3" } },
	{ label: "Missing", color: "var(--sui-danger)" },
];

/** The legend of the LaneChart marks. */
export const ManualChartLegend: Component = () => <Legend items={LEGEND} />;

export const ManualSuggestionCards: Component<{
	items: readonly ManualSuggestion[];
	onAdd: (key: string) => void;
}> = (props) => (
	<ContentStack>
		<SectionTitle>NEW CONFIG SUGGESTIONS</SectionTitle>
		<Show
			when={props.items.length > 0}
			fallback={
				<MutedEmptyState message="Every payment in this group is matched. Nothing to suggest." />
			}
		>
			<LooseCardGrid>
				<For each={props.items}>
					{(s) => (
						<CompactSurface>
							<TightStack>
								<TextTitle>{s.title}</TextTitle>
								<MonoValue>{s.amount}</MonoValue>
								<MutedBody>{s.sub}</MutedBody>
								<SmallOutlinedButton onClick={() => props.onAdd(s.key)}>
									Add
								</SmallOutlinedButton>
							</TightStack>
						</CompactSurface>
					)}
				</For>
			</LooseCardGrid>
		</Show>
	</ContentStack>
);

const ConfigCard: Component<{
	cfg: ManualConfig;
	onEdit: (key: string) => void;
	onDelete: (key: string) => void;
}> = (props) => (
	<CompactSurface>
		<TightStack>
			<SpreadRow>
				<TextTitle>{props.cfg.name}</TextTitle>
				<ClusterRow>
					<IconOnlyButton
						aria-label={props.cfg.editLabel}
						title={props.cfg.editLabel}
						onClick={() => props.onEdit(props.cfg.key)}
					>
						<Icon name="edit" size="sm" />
					</IconOnlyButton>
					<IconOnlyButton
						aria-label={props.cfg.deleteLabel}
						title={props.cfg.deleteLabel}
						onClick={() => props.onDelete(props.cfg.key)}
					>
						<Icon name="trash" size="sm" />
					</IconOnlyButton>
				</ClusterRow>
			</SpreadRow>
			<MonoValue>{props.cfg.amount}</MonoValue>
			<MutedBody>{props.cfg.sub}</MutedBody>
		</TightStack>
	</CompactSurface>
);

export const ManualConfigCards: Component<{
	items: readonly ManualConfig[];
	onEdit: (key: string) => void;
	/** Called on the delete button. The consumer asks to confirm. */
	onDelete: (key: string) => void;
}> = (props) => (
	<ContentStack>
		<SectionTitle>CONFIGS</SectionTitle>
		<Show
			when={props.items.length > 0}
			fallback={
				<MutedEmptyState message="No configs yet. Add one from the suggestions." />
			}
		>
			<LooseCardGrid>
				<For each={props.items}>
					{(c) => (
						<ConfigCard cfg={c} onEdit={props.onEdit} onDelete={props.onDelete} />
					)}
				</For>
			</LooseCardGrid>
		</Show>
	</ContentStack>
);
