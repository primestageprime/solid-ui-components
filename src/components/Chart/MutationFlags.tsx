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
import { type Component, Index, createMemo, createSignal, onCleanup, onMount } from "solid-js";
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
	/** Let a dragged flag cross its neighbours: clamp to the domain only. */
	passNeighbours?: boolean;
	/** Called once when a drag ends: on release, on a cancel or a lost
	 *  pointer capture, or on Escape. Leaving the chart does not end it. */
	onMoveMutationEnd?: () => void;
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
				/** Where the flag stood at the press: Escape puts it back there. */
				readonly startAt: number;
				/** The flag holding the pointer capture. */
				readonly target: Element;
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
			startAt: flag.at,
			target: event.currentTarget as Element,
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
		// THE DRAG HOLDS WHILE THE BUTTON IS DOWN, inside the chart or out of
		// it: pointer capture keeps the moves coming, and the time clamps to the
		// domain. Only a release, a cancel, a lost capture or Escape ends it.
		// A MOVE WITH NO BUTTON DOWN IS A MISSED RELEASE: the drag ends here.
		if (event.buttons === 0 && event.pointerType === "mouse") {
			endPress();
			return;
		}
		const id = pressedId();
		if (id === undefined) return;
		const raw = ctx.xScale().invert(x - press.grab);
		report(id, clampMutationTime(props.mutations, id, raw, domain(), props.passNeighbours === true));
	};

	const onPointerEnd = (event: PointerEvent): void => {
		if (press === undefined || press.pointerId !== event.pointerId) return;
		endPress();
	};

	/** End the press: release the capture, and tell the consumer a drag ended. */
	const endPress = (): void => {
		if (press === undefined) return;
		const { moved: wasDrag, target, pointerId } = press;
		if (press.moved) {
			swallowClick = true;
			setTimeout(() => {
				swallowClick = false;
			}, 0);
		}
		// Cleared FIRST: the release fires `lostpointercapture`, which lands here
		// again and must find nothing to end.
		press = undefined;
		if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
		setDraggingId(undefined);
		if (wasDrag) props.onMoveMutationEnd?.();
	};

	// ESCAPE CANCELS A DRAG: the flag goes back to where the press found it,
	// and the drag ends.
	const onDragKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== "Escape" || press === undefined || !press.moved) return;
		event.preventDefault();
		event.stopPropagation();
		const id = pressedId();
		// Straight to the consumer, past `report`'s dedupe: whatever the props
		// show, the consumer last heard `lastAt`, so it must hear the start.
		if (id !== undefined && press.lastAt !== undefined && press.lastAt !== press.startAt) {
			props.onMoveMutation?.(id, press.startAt);
		}
		endPress();
	};
	onMount(() => document.addEventListener("keydown", onDragKeyDown, true));
	onCleanup(() => document.removeEventListener("keydown", onDragKeyDown, true));

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
				clampMutationTime(
					props.mutations,
					flag.id,
					flag.at + step,
					domain(),
					props.passNeighbours === true,
				),
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
						onLostPointerCapture={onPointerEnd}
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
