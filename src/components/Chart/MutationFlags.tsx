// MutationFlags — Structural (Depth 1). SVG chart slot: LevelsTimeline's
// mutation contract inside any `<Chart>` (G24). Each mutation is a NUMBERED
// flag in the top margin (numbered in time order) with a rule down through
// the plot. Given `onSelectMutation`, flags are buttons (click, Enter/Space);
// given `onMoveMutation`, they drag along x and the arrow keys nudge a day —
// clamped between neighbours and to the x domain (`clampMutationTime`).
//
// The geometry is LevelsTimeline's own: `inTimeOrder`, `nudgeFlagCentres`,
// `clampMutationTime`, `rekeyPressedMutation` (G22 — a consumer that changes
// a flag's id mid-drag keeps the drag). Styles live in Chart.css.
//
// Internal: composed by StackedTimelineChart, not exported from the barrel.
import { type Component, Index, createMemo, createSignal } from "solid-js";
import { filter, findIndex, join, map } from "../../fn";

const classNames = (names: readonly string[]): string =>
	join(" ", filter((name: string) => name !== "", names));
import {
	DAY_MS,
	DRAG_THRESHOLD_PX,
	FLAG_BOX_WIDTH,
	type Mutation,
	type TimeValue,
	clampMutationTime,
	inTimeOrder,
	nudgeFlagCentres,
	rekeyPressedMutation,
	timeOf,
} from "../LevelsTimeline/geometry";
import { useChart } from "./context";

/** The flag box's height, and its top inside the top margin. */
export const MUTATION_FLAG_HEIGHT = 16;
export const MUTATION_FLAG_TOP = 2;
/** The top margin a chart needs to hold the flags. */
export const MUTATION_FLAG_LANE = MUTATION_FLAG_TOP + MUTATION_FLAG_HEIGHT + 4;

export interface MutationFlagsProps {
	mutations: readonly Mutation[];
	selectedMutationId?: string;
	onSelectMutation?: (id: string) => void;
	onMoveMutation?: (id: string, at: TimeValue) => void;
}

interface PlacedFlag {
	readonly id: string;
	readonly number: number;
	readonly at: number;
	readonly title: string;
	readonly x: number;
	readonly boxX: number;
}

export const MutationFlags: Component<MutationFlagsProps> = (props) => {
	const ctx = useChart();
	const domain = (): [number, number] => {
		const [a, b] = ctx.xScale().domain;
		return [a, b];
	};

	const flags = createMemo((): readonly PlacedFlag[] => {
		const ordered = inTimeOrder(props.mutations);
		const scale = ctx.xScale();
		const xs = map((m: Mutation) => scale(timeOf(m.at)), ordered);
		const centres = nudgeFlagCentres(xs, ctx.innerWidth());
		return map(
			(m: Mutation, i: number) => ({
				id: m.id,
				number: i + 1,
				at: timeOf(m.at),
				title: m.label,
				x: xs[i],
				boxX: centres[i] - FLAG_BOX_WIDTH / 2,
			}),
			ordered,
		);
	});

	const selectable = () => props.onSelectMutation !== undefined;
	const draggable = () => props.onMoveMutation !== undefined;
	const interactive = () => selectable() || draggable();
	const isSelected = (id: string) => props.selectedMutationId === id;
	const isMuted = (id: string) =>
		props.selectedMutationId !== undefined && !isSelected(id);

	// ── the drag (G22-safe) ────────────────────────────────────────────────
	let press:
		| {
				id: string;
				lastAt: number | undefined;
				readonly index: number;
				readonly pointerId: number;
				readonly startX: number;
				readonly grab: number;
				readonly svgLeft: number;
				moved: boolean;
		  }
		| undefined;
	let swallowClick = false;
	const [draggingId, setDraggingId] = createSignal<string>();

	/** The pressed flag's CURRENT id — the consumer may have re-keyed it. */
	const pressedId = (): string | undefined => {
		if (press === undefined) return undefined;
		const id = rekeyPressedMutation(props.mutations, press);
		if (id !== undefined && id !== press.id) {
			press.id = id;
			setDraggingId(id);
		}
		return id;
	};

	const report = (id: string, at: number): void => {
		const current = findIndex(
			(m: Mutation) => m.id === id && timeOf(m.at) === at,
			props.mutations,
		);
		if (current >= 0) return;
		if (press !== undefined) press.lastAt = at;
		props.onMoveMutation?.(id, at);
	};

	const plotX = (event: PointerEvent, svgLeft: number): number =>
		event.clientX - svgLeft - ctx.margin().left;

	const onPointerDown = (event: PointerEvent, flag: PlacedFlag): void => {
		event.stopPropagation();
		if (!draggable() || event.button !== 0) return;
		const svg = (event.currentTarget as SVGElement).ownerSVGElement;
		const svgLeft = svg?.getBoundingClientRect().left ?? 0;
		(event.currentTarget as Element).setPointerCapture?.(event.pointerId);
		const x = plotX(event, svgLeft);
		press = {
			id: flag.id,
			lastAt: undefined,
			index: flag.number - 1,
			pointerId: event.pointerId,
			startX: x,
			grab: x - flag.x,
			svgLeft,
			moved: false,
		};
		swallowClick = false;
	};

	const onPointerMove = (event: PointerEvent): void => {
		if (press === undefined || press.pointerId !== event.pointerId) return;
		const x = plotX(event, press.svgLeft);
		if (!press.moved) {
			if (Math.abs(x - press.startX) < DRAG_THRESHOLD_PX) return;
			press.moved = true;
			setDraggingId(press.id);
		}
		const id = pressedId();
		if (id === undefined) return;
		const raw = ctx.xScale().invert(x - press.grab);
		report(id, clampMutationTime(props.mutations, id, raw, domain()));
	};

	const onPointerEnd = (event: PointerEvent): void => {
		if (press === undefined || press.pointerId !== event.pointerId) return;
		if (press.moved) {
			swallowClick = true;
			setTimeout(() => {
				swallowClick = false;
			}, 0);
		}
		(event.currentTarget as Element).releasePointerCapture?.(event.pointerId);
		press = undefined;
		setDraggingId(undefined);
	};

	const onClick = (event: MouseEvent, flag: PlacedFlag): void => {
		// A flag click is not a pick on the plot underneath.
		event.stopPropagation();
		if (swallowClick) {
			swallowClick = false;
			return;
		}
		props.onSelectMutation?.(flag.id);
	};

	const onKeyDown = (event: KeyboardEvent, flag: PlacedFlag): void => {
		if (draggable() && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
			event.preventDefault();
			const step = event.key === "ArrowLeft" ? -DAY_MS : DAY_MS;
			report(
				flag.id,
				clampMutationTime(props.mutations, flag.id, flag.at + step, domain()),
			);
			return;
		}
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		props.onSelectMutation?.(flag.id);
	};

	const flagClass = (id: string): string =>
		classNames([
			"sui-chart__mutation",
			isSelected(id) ? "sui-chart__mutation--selected" : "",
			isMuted(id) ? "sui-chart__mutation--muted" : "",
			draggable() ? "sui-chart__mutation--draggable" : "",
			draggingId() === id ? "sui-chart__mutation--dragging" : "",
		]);

	const top = () => -ctx.margin().top + MUTATION_FLAG_TOP;

	return (
		<g class="sui-chart__mutations">
			<Index each={flags()}>
				{(flag) => (
					// biome-ignore lint/a11y/noStaticElementInteractions: role="button" + tabindex are set whenever a handler is wired (selectable or draggable); without handlers the flag is an inert mark and the listeners no-op.
					<g
						class={flagClass(flag().id)}
						data-mutation-id={flag().id}
						role={interactive() ? "button" : undefined}
						tabindex={interactive() ? 0 : undefined}
						aria-label={`Mutation ${flag().number}${
							flag().title && flag().title !== String(flag().number)
								? `, ${flag().title}`
								: ""
						}${isSelected(flag().id) ? ", selected" : ""}`}
						onClick={(e) => onClick(e, flag())}
						onKeyDown={(e) => onKeyDown(e, flag())}
						onPointerDown={(e) => onPointerDown(e, flag())}
						onPointerMove={onPointerMove}
						onPointerUp={onPointerEnd}
						onPointerCancel={onPointerEnd}
					>
						<line
							class="sui-chart__mutation-rule"
							x1={flag().x}
							x2={flag().x}
							y1={top() + MUTATION_FLAG_HEIGHT}
							y2={ctx.innerHeight()}
						/>
						<rect
							class="sui-chart__mutation-box"
							x={flag().boxX}
							y={top()}
							width={FLAG_BOX_WIDTH}
							height={MUTATION_FLAG_HEIGHT}
							rx={2}
						/>
						<text
							class="sui-chart__mutation-label"
							x={flag().boxX + FLAG_BOX_WIDTH / 2}
							y={top() + MUTATION_FLAG_HEIGHT / 2}
							dy="0.35em"
							text-anchor="middle"
						>
							{flag().number}
						</text>
					</g>
				)}
			</Index>
		</g>
	);
};
