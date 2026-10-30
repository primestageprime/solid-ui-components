// ============================================
// hotkeyRegistry — the ONE hotkey listener of a page (#53325).
//
// Every SUI hotkey is a CLAIM here: a Button's `hotkeys`, a buttonless
// `useHotkey`, a Modal's Escape, a `HotkeyButton`, a `createHotkeyScope`
// table. One capture-phase `keydown` listener on the window feeds every press
// to the pure `dispatchHotkey` with the claims that are live, and acts on the
// outcome. So one key press runs at most one claim, wherever it was declared.
//
// THE REGISTRY LIVES ON `globalThis` under a versioned key, so two copies of
// SUI in one page (a linked package, a duplicate in node_modules) share it. A
// second copy logs a dev warning: it works, but the app ships SUI twice.
//
// LAYERS: a Modal opens a layer while it is open. While any layer is open,
// only the claims of the TOP layer fire; page claims (layer 0) are blocked.
// A claim with `layer: "any"` ignores layers (the old `createHotkeyScope`
// tables, which hold their own "modal" scope).
//
// RANKS AND TIES: inside a layer, modal > step > page. A tie on the same rank
// goes to DOM order (the claim's `element`), with a dev warning. A claim with
// no element sorts after those with one, by when it registered. Mount order
// is never used for claims with an element: a `Show` that remounts a button,
// or a tab that loads late, must not move a key.
// ============================================
import {
	type ChordState,
	DEFAULT_CHORD_WINDOW_MS,
	dispatchHotkey,
	type HotkeyEntry,
	type HotkeyRank,
	IDLE_CHORD,
} from "../hotkeyDispatch";
import { filter, flatMap, join, map, some } from "../../fn";
import { sortWith } from "../../fn/sortWith";
import { isReservedKey, type KeyMatchMode } from "./hotkeyKeys";

type Claimed = readonly [number, HotkeyClaim];
type Placed = readonly [number, Element];

/** One claim on one or more keys. */
export interface HotkeyClaim {
	/** The keys ("Enter", "Mod+z", "g t"). Any one of them fires the claim. */
	keys: readonly string[];
	/** What the key does. */
	run: (event: KeyboardEvent) => void;
	/** Default "page". */
	rank?: HotkeyRank;
	/** The layer the claim lives in: 0 is the page, a Modal's id, or "any". Default 0. */
	layer?: number | "any";
	/** The element whose DOM position breaks a tie on the same rank. */
	element?: () => Element | null | undefined;
	/** Read at key time. False: the claim is not there for this press. Default true. */
	enabled?: () => boolean;
	/** Default "keys" (see hotkeyKeys). */
	match?: KeyMatchMode;
	/** An auto-repeat runs it again. Default false. */
	repeats?: boolean;
	/** Fires even from a text field (a Modal's Escape). Default false. */
	inFields?: boolean;
	/** How long a chord that starts with this claim waits. Default 1500. */
	chordWindowMs?: number;
	/** Stop the event reaching other listeners. Default: rank "modal". */
	stopPropagation?: boolean;
}

interface RegistryState {
	readonly version: 1;
	readonly claims: Map<number, HotkeyClaim>;
	/** Open layers, bottom first. */
	layers: number[];
	nextId: number;
	chord: ChordState;
	listening: boolean;
	readonly copies: Set<symbol>;
	readonly warned: Set<string>;
	readonly onKey: (event: Event) => void;
}

/** Bump with any change to `RegistryState`'s shape. */
const REGISTRY_KEY = "__suiHotkeyRegistry_v1";
/** This copy of SUI. */
const COPY = Symbol("sui-hotkeys");

const isDev = (): boolean => {
	try {
		return Boolean(import.meta.env?.DEV);
	} catch {
		return false;
	}
};

const warnOnce = (state: RegistryState, key: string, message: string): void => {
	if (!isDev() || state.warned.has(key)) return;
	state.warned.add(key);
	console.warn(message);
};

const topLayer = (state: RegistryState): number =>
	state.layers[state.layers.length - 1] ?? 0;

const inLayer = (claim: HotkeyClaim, top: number): boolean =>
	claim.layer === "any" || (claim.layer ?? 0) === top;

/** DOM order first, then the claims with no element by id. */
const tieOrder = (
	claims: ReadonlyArray<Claimed>,
): Map<number, number> => {
	const located = map(([id, c]: Claimed) => [id, c.element?.() ?? null] as const, claims);
	const placed = sortWith(
		([, a]: Placed, [, b]: Placed) =>
			a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
		filter((p): p is Placed => p[1] !== null, located),
	);
	const rest = filter(([id]: Claimed) => !some(([p]: Placed) => p === id, placed), claims);
	const ids = [...map(([id]: Placed) => id, placed), ...map(([id]: Claimed) => id, rest)];
	return new Map(map((id: number, i): [number, number] => [id, i], ids));
};

/** The table `dispatchHotkey` reads: one entry per key of every live claim. */
const liveTable = (state: RegistryState): HotkeyEntry<"claim">[] => {
	const top = topLayer(state);
	const live = filter(
		([, c]: Claimed) => inLayer(c, top) && (c.enabled?.() ?? true),
		[...state.claims],
	);
	const order = tieOrder(live);
	return flatMap(([id, c]: Claimed) =>
		map((keys: string): HotkeyEntry<"claim"> => ({
			action: String(id),
			keys,
			scope: "claim" as const,
			rank: c.rank ?? "page",
			order: order.get(id) ?? 0,
			match: c.match ?? "keys",
			repeats: c.repeats ?? false,
			inFields: c.inFields ?? false,
			chordWindowMs: c.chordWindowMs,
		}), c.keys),
		live,
	);
};

const createState = (): RegistryState => {
	const state: RegistryState = {
		version: 1,
		claims: new Map(),
		layers: [],
		nextId: 1,
		chord: IDLE_CHORD,
		listening: false,
		copies: new Set(),
		warned: new Set(),
		onKey: (event) => {
			const ke = event as KeyboardEvent;
			const outcome = dispatchHotkey<"claim">({
				table: liveTable(state),
				scopes: ["claim"],
				press: {
					key: ke.key,
					code: ke.code,
					metaKey: ke.metaKey,
					ctrlKey: ke.ctrlKey,
					altKey: ke.altKey,
					shiftKey: ke.shiftKey,
					repeat: ke.repeat,
					isComposing: ke.isComposing,
					target: ke.target,
				},
				state: state.chord,
				now: Date.now(),
				chordWindowMs: DEFAULT_CHORD_WINDOW_MS,
			});
			state.chord = outcome.state;
			if (outcome.kind === "ignored") return;
			// The press is ours: the browser does not act on it, and a focused
			// button does not also click (the native click of Enter or Space).
			ke.preventDefault();
			if (outcome.kind !== "fire") return;
			const claim = state.claims.get(Number(outcome.entry.action));
			if (!claim) return;
			if (outcome.rivals.length > 0) {
				warnOnce(
					state,
					`tie:${outcome.entry.keys}:${join(",", sortWith((a: string, b: string) => a.localeCompare(b), [outcome.entry.action, ...outcome.rivals]))}`,
					`[sui hotkeys] "${outcome.entry.keys}" is claimed ${outcome.rivals.length + 1} times on rank "${outcome.entry.rank}"; the first in DOM order wins. Give one claim a higher rank.`,
				);
			}
			if (claim.stopPropagation ?? claim.rank === "modal") ke.stopPropagation();
			claim.run(ke);
		},
	};
	return state;
};

/** The page's registry, made on first use. */
function registry(): RegistryState {
	const g = globalThis as typeof globalThis & {
		[REGISTRY_KEY]?: RegistryState;
	};
	const state = g[REGISTRY_KEY] ?? createState();
	g[REGISTRY_KEY] = state;
	if (!state.copies.has(COPY)) {
		state.copies.add(COPY);
		if (state.copies.size > 1) {
			warnOnce(
				state,
				"copies",
				"[sui hotkeys] A second copy of @primestageprime/solid-ui-components joined the hotkey registry. Keys still work, but the app bundles SUI twice.",
			);
		}
	}
	return state;
}

const sync = (state: RegistryState): void => {
	if (typeof window === "undefined") return;
	const want = state.claims.size > 0;
	if (want === state.listening) return;
	state.listening = want;
	if (want) window.addEventListener("keydown", state.onKey, true);
	else {
		window.removeEventListener("keydown", state.onKey, true);
		state.chord = IDLE_CHORD;
	}
};

/**
 * Add a claim. Returns the function that removes it. A browser-reserved chord
 * (`Mod+w`, `Mod+t`, `Mod+n`, `Mod+q`) is a dev error and is left out.
 * A no-op on the server.
 */
export function registerHotkey(claim: HotkeyClaim): () => void {
	if (typeof window === "undefined") return () => {};
	const state = registry();
	const reserved = filter(isReservedKey, claim.keys);
	if (reserved.length > 0 && isDev()) {
		console.error(
			`[sui hotkeys] ${join(", ", reserved)}: the browser keeps this chord; it is not registered.`,
		);
	}
	const keys = filter((k: string) => !isReservedKey(k), claim.keys);
	if (keys.length === 0) return () => {};
	const id = state.nextId++;
	state.claims.set(id, { ...claim, keys });
	sync(state);
	return () => {
		state.claims.delete(id);
		sync(state);
	};
}

/** A new layer id for a Modal. The layer is not open until `openHotkeyLayer`. */
export function allocateHotkeyLayer(): number {
	const state = registry();
	return state.nextId++;
}

/** Open a layer on top of the others. Returns the function that closes it. */
export function openHotkeyLayer(layer: number): () => void {
	const state = registry();
	const without = (): number[] => filter((l: number) => l !== layer, state.layers);
	state.layers = [...without(), layer];
	return () => {
		state.layers = without();
	};
}

/** The open layer that fires now, or 0 for the page. For tests and showcases. */
export const activeHotkeyLayer = (): number => topLayer(registry());
