// ============================================
// ButtonReason — Atomic (Depth 1)
// Tags: shows:tooltip, shows:text, does:hover, data:text, role:overlay
// The `disabledReason` popover of a HotkeyButton. No CSS file of its own
// (styles in HotkeyButton.css). No component imports. Internal: not exported.
//
// The box is placed by writing `top` / `left` on it from `measure`, as a
// positioning library does, not by an inline `style` prop.
//
// WHY NOT `Tooltip`: Tooltip is Kobalte, and every SUI button would then ship
// Kobalte and floating-ui to every consumer (ADR 0005, bundle budget
// `oneButtonKb`). The reason needs much less: a span around the button that
// takes the hover a disabled button cannot, and a text box portalled to
// `document.body` (so a parent's `overflow: hidden` or a Modal does not clip
// it), placed below the span and kept inside the viewport.
// ============================================
import {
	type Component,
	createEffect,
	createUniqueId,
	type JSX,
	onCleanup,
	Show,
} from "solid-js";
import { Portal } from "solid-js/web";

/** The gap between the button and its reason, in px. */
const GUTTER = 8;
/** The least distance from the reason to a viewport edge, in px. */
const EDGE = 8;

interface ButtonReasonProps {
	/** Shows the reason. The caller decides (hover, a hotkey press, `disabled`). */
	open: boolean;
	/** Reports pointer enter (`true`) and leave (`false`) on the span. */
	onHover: (hovered: boolean) => void;
	reason: string;
	children: JSX.Element;
}


export const ButtonReason: Component<ButtonReasonProps> = (props) => {
	const id = createUniqueId();
	let trigger: HTMLSpanElement | undefined;
	let box: HTMLDivElement | undefined;

	const measure = () => {
		if (!trigger || !box) return;
		const t = trigger.getBoundingClientRect();
		const width = box.offsetWidth;
		const centred = t.left + t.width / 2 - width / 2;
		const max = window.innerWidth - width - EDGE;
		box.style.top = `${t.bottom + GUTTER}px`;
		box.style.left = `${Math.max(EDGE, Math.min(centred, max))}px`;
		box.dataset.placed = "";
	};

	createEffect(() => {
		if (!props.open) return;
		// Measure once the box has its width, then on every scroll and resize
		// while it is open, as the span can move under a fixed box.
		queueMicrotask(measure);
		window.addEventListener("scroll", measure, true);
		window.addEventListener("resize", measure);
		onCleanup(() => {
			window.removeEventListener("scroll", measure, true);
			window.removeEventListener("resize", measure);
		});
	});

	return (
		<span
			ref={trigger}
			class="sui-btn-reason"
			aria-describedby={props.open ? id : undefined}
			onPointerEnter={() => props.onHover(true)}
			onPointerLeave={() => props.onHover(false)}
		>
			{props.children}
			<Show when={props.open}>
				<Portal>
					<div
						ref={box}
						id={id}
						role="tooltip"
						class="sui-btn-reason__content"
					>
						{props.reason}
					</div>
				</Portal>
			</Show>
		</span>
	);
};
