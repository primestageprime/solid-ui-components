// ============================================
// useHotkey — a registry claim for a component (#53325).
//
// The buttonless entry: Undo on ⌘Z, the Triage number keys. A SUI button
// with `hotkeys` uses it too. The claim lives while the owner lives, and is
// made again when `keys` or `rank` change.
//
//   useHotkey({ keys: ["Mod+z", "u"], run: undo });
//   useHotkey({ keys: () => (manualDone() ? [] : ["Enter"]), run: nextGroup, rank: "step" });
//
// THE LAYER comes from the nearest `Modal` (`HotkeyLayerContext`): a claim
// inside an open Modal fires while that Modal is the top layer, and a page
// claim is blocked while any Modal is open. The default rank is "modal"
// inside a Modal and "page" outside one.
// ============================================
import {
	type Accessor,
	createContext,
	createRenderEffect,
	onCleanup,
	useContext,
} from "solid-js";
import type { HotkeyRank } from "../hotkeyDispatch";
import { registerHotkey } from "./hotkeyRegistry";

/** The hotkey layer of the nearest open Modal; 0 on the page. */
export const HotkeyLayerContext = createContext<number>(0);

/** The hotkey layer a component is in: its nearest Modal's, or 0 for the page. */
export const useHotkeyLayer = (): number => useContext(HotkeyLayerContext);

type MaybeAccessor<T> = T | Accessor<T>;
const read = <T>(v: MaybeAccessor<T>): T =>
	typeof v === "function" ? (v as Accessor<T>)() : v;

export interface UseHotkeyOptions {
	/** The keys ("Enter", "Mod+z", "i", "g t"). Empty: no claim. May be an accessor. */
	keys: MaybeAccessor<readonly string[] | undefined>;
	/** What the key does. */
	run: (event: KeyboardEvent) => void;
	/** modal > step > page. Default: "modal" inside a Modal, else "page". May be an accessor. */
	rank?: MaybeAccessor<HotkeyRank | undefined>;
	/** Read at key time. False: the key is not claimed for this press. Default true. */
	enabled?: Accessor<boolean>;
	/** The element whose DOM order breaks a tie on the same rank. */
	element?: Accessor<Element | null | undefined>;
	/** Fires even from a text field. Default false: a field keeps every key. */
	inFields?: boolean;
	/** An auto-repeat runs it again. Default false: a held key fires once. */
	repeats?: boolean;
	/** The layer, when not the nearest Modal's. */
	layer?: number;
}

/** Claim keys for as long as the calling component lives. */
export function useHotkey(opts: UseHotkeyOptions): void {
	const layer = opts.layer ?? useHotkeyLayer();
	createRenderEffect(() => {
		const keys = read(opts.keys) ?? [];
		if (keys.length === 0) return;
		const rank = read(opts.rank) ?? (layer > 0 ? "modal" : "page");
		const off = registerHotkey({
			keys: [...keys],
			rank,
			layer,
			run: (event) => opts.run(event),
			enabled: opts.enabled,
			element: opts.element,
			inFields: opts.inFields,
			repeats: opts.repeats,
		});
		onCleanup(off);
	});
}
