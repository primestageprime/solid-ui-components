/* SplitQueueList — the resolve/unresolve flight controller (reactive shell).
 *
 * This is the reactive core that OWNS the flight engine's state and lifecycle:
 * the `prevRects` FLIP snapshot, the `scrollAnimating` scroll-ownership lock, and
 * the `exitingKey` focus-suppression signal. It registers the three reactive
 * effects — capture (rAF FLIP snapshot), detect (order- and batch-independent
 * resolve/unresolve detection), and scroll-pin (keeps the newest resolved row
 * flush at the seam) — and the onCleanup.
 *
 * The imperative DOM-driving animations themselves live in siblings so this
 * shell stays legible: the two-phase forward/reverse flights in ./play, the FLIP
 * snapshot mechanics in ./flip, and the arrival bg-fade in ./arrival. This
 * controller wires them together, handing the flights read access to `prevRects`
 * and write access to the two pieces of state (via setters) they drive.
 *
 * Factored out of the component so the reactive SHELL (props, measurement,
 * layout, render) stays legible. The controller reads everything it needs as
 * accessors (see FlightDeps) and exposes only `exitingKey` — the one piece of
 * its state the shell's `focusedKey` memo needs.
 *
 * MUST be called synchronously during component setup: it registers effects and
 * an onCleanup in the caller's reactive owner. */
import {
  type Accessor,
  createEffect,
  createSignal,
  on,
  onCleanup,
} from "solid-js";
import { captureRects } from "./flip";
import type { SplitLayout } from "./layout";
import { createFlightAnimations } from "./play";

export interface FlightDeps {
  getRootEl: () => HTMLElement | undefined;
  getTopListEl: () => HTMLUListElement | undefined;
  // Sizing accessors (measured/derived in the shell).
  height: () => number;
  rowHeight: () => number;
  headerHeight: () => number;
  topCapRows: () => number;
  topFloorRows: () => number;
  animationMs: () => number;
  seamHeight: number;
  topOnly: () => boolean;
  topOnlyHeight: () => number;
  layout: () => SplitLayout;
  // Data as key arrays in list order (resolved oldest-first, unresolved next-first).
  resolvedKeys: () => string[];
  unresolvedKeys: () => string[];
  // Behavior.
  reducedMotion: () => boolean;
  onFocusChange: (key: string | null) => void;
}

export interface FlightController {
  /** The key whose exit collapse is in flight (focus is suppressed meanwhile),
   * or null. Consumed by the shell's `focusedKey` memo. */
  exitingKey: Accessor<string | null>;
}

export function createFlightController(deps: FlightDeps): FlightController {
  // True while a resolve animation owns the top list's scrollTop (its scroll-up
  // tween, or a grow that ends by sitting at the bottom). The scroll-pin effect
  // skips its snap-to-bottom while this is set, so it can't race the tween and
  // collapse it to an instant jump. Always cleared at settle / instant-return.
  //
  // The flights (./play) only ever WRITE this lock, through the setter injected
  // below; the scroll-pin effect here is its sole READER. Keeping the read side
  // in the controller is why the write side can live in a sibling module.
  let scrollAnimating = false;

  // Rects of every keyed row captured on the previous render — the "First" in
  // FLIP. Read synchronously before the data swap reflows the DOM.
  const prevRects = new Map<string, DOMRect>();

  // While a resolve's exit collapse is animating, we suppress focus entirely so
  // the new head doesn't light up orange/▸ until the resolved card is fully gone
  // from the bottom list. Set to the resolving key for the duration of phase 1.
  const [exitingKey, setExitingKey] = createSignal<string | null>(null);

  // The imperative forward/reverse flights. They read `prevRects` and drive the
  // two pieces of state above through the injected setters — never reading the
  // scroll lock, so the controller keeps sole ownership of it.
  const { playFlight, playReverse } = createFlightAnimations({
    deps,
    prevRects,
    setExitingKey,
    setScrollAnimating: (active: boolean) => {
      scrollAnimating = active;
    },
  });

  // Re-snapshot after every render's paint. Reading both array lengths makes
  // this effect depend on any data change; the rAF defers capture past paint.
  // Resolve-detection schedules playFlight on a microtask (runs before the next
  // rAF), so during a flight `prevRects` still holds the pre-swap rects.
  createEffect(
    on(
      () => [deps.resolvedKeys().length, deps.unresolvedKeys().length] as const,
      () => requestAnimationFrame(() => captureRects(deps, prevRects)),
    ),
  );

  // Detect a resolve and play the flight, then advance focus.
  //
  // A newly-resolved key is simply one that is in `resolved` now but was not in
  // the previous `resolved`. We intentionally do NOT also require it to have
  // been in the previous `unresolved`: consumers update the two arrays in two
  // separate (un-batched) setter calls, and depending on order there is an
  // intermediate frame where the key sits in NEITHER list. Guarding on the
  // unresolved snapshot would miss the resolve in that frame — this was the
  // "stuck after one item" bug. Entering `resolved` is sufficient evidence of a
  // resolve; `playFlight` self-guards by only animating rows it captured a rect
  // for (i.e. rows that were actually rendered in the unresolved list).
  //
  // This single effect owns `prevResolvedKeys`; nothing else writes it, so the
  // diff is order- and batch-independent.
  let prevResolvedKeys: string[] = deps.resolvedKeys();
  // Previous unresolved order, so we can recover the resolved card's ORIGINAL
  // position and collapse the exit at that index (random access — resolving a
  // MIDDLE card animates in place, not at the head). Owned solely by this effect.
  let prevUnresolvedKeys: string[] = deps.unresolvedKeys();
  let detectFirstRun = true;

  createEffect(() => {
    const resolvedKeys = deps.resolvedKeys();
    const unresolvedKeys = deps.unresolvedKeys();

    // FORWARD (resolve): a key now in `resolved` that wasn't before.
    const newlyResolved = resolvedKeys.filter(
      (k) => !prevResolvedKeys.includes(k),
    );
    // REVERSE (unresolve): a key now in `unresolved` that was in the PREVIOUS
    // `resolved` (came back from done) and wasn't already in `unresolved`. Read
    // against the OLD snapshots, before we overwrite them below.
    const newlyUnresolved = unresolvedKeys.filter(
      (k) => prevResolvedKeys.includes(k) && !prevUnresolvedKeys.includes(k),
    );

    if (newlyResolved.length === 0 && newlyUnresolved.length === 0) {
      // No swap this run. Consumers update the two arrays in two separate
      // (un-batched) setter calls, so this may be the intermediate frame where a
      // moving card is in NEITHER list. We must NOT refresh the snapshot a moving
      // card was leaving, or we'd lose its pre-swap index/membership before the
      // swap is detected. Only refresh each snapshot when its list GREW (genuine
      // new items), never when it shrank (a swap in flight).
      if (resolvedKeys.length > prevResolvedKeys.length)
        prevResolvedKeys = resolvedKeys;
      if (unresolvedKeys.length > prevUnresolvedKeys.length)
        prevUnresolvedKeys = unresolvedKeys;
      detectFirstRun = false;
      return;
    }

    // The forward card's index in the PREVIOUS unresolved order (before the swap
    // removed it), for the random-access exit collapse. Captured from the old
    // snapshot, which still contains the key.
    const movedKey = newlyResolved[newlyResolved.length - 1];
    const exitIndex = movedKey ? prevUnresolvedKeys.indexOf(movedKey) : 0;
    const unmovedKey = newlyUnresolved[newlyUnresolved.length - 1];

    prevResolvedKeys = resolvedKeys;
    prevUnresolvedKeys = unresolvedKeys;

    const willAnimate = !detectFirstRun && !deps.reducedMotion();
    detectFirstRun = false;

    if (!willAnimate) {
      // Reduced-motion / first-run: no phases. Advance focus to the current head
      // of the unresolved list (an unresolve prepends, so the head is that card).
      deps.onFocusChange(unresolvedKeys[0] ?? null);
      return;
    }

    // Claim ownership of the top list's scrollTop NOW, synchronously, before any
    // microtask is queued. The scroll-pin effect queues its snap-to-bottom in a
    // microtask too, and depending on effect-run order that microtask can run
    // BEFORE the flight's; setting the flag here (not inside the flight) means the
    // pin always sees it true and skips, so it can't pre-snap and collapse the
    // tween. The flight clears it at settle. (Cleared in bail() too.)
    scrollAnimating = true;

    if (movedKey) {
      // Suppress focus during the exit collapse: no real bottom row shows the
      // orange ▸ until the resolved card is entirely gone. Fire onFocusChange at
      // the END of phase 1 (in playFlight's exit-finish callback).
      setExitingKey(movedKey);
      // Defer to a microtask so the resolved row is in its final DOM spot for
      // `last`; `prevRects` still holds the pre-swap rect for `first`.
      queueMicrotask(() => playFlight(movedKey, exitIndex));
    } else if (unmovedKey) {
      // Reverse: the mirror of the forward flight (done tail collapses, card
      // grows in at the to-categorize head). Focus advances at settle.
      setExitingKey(unmovedKey);
      queueMicrotask(() => playReverse(unmovedKey));
    }
  });

  // When the top pane is capped/scrolling, pin it to the bottom so the newest
  // resolved row sits flush at the seam, adjacent to the next unresolved item.
  createEffect(
    on(
      () =>
        [
          deps.resolvedKeys().length,
          deps.layout().topScrollToBottom,
          deps.layout().topHeight,
        ] as const,
      ([, scrollToBottom]) => {
        queueMicrotask(() => {
          // Skip while a resolve tween owns scrollTop — otherwise this snap races
          // the tween and collapses it to an instant jump (the "scrolls once then
          // stops / card just appears" bug). The tween itself ends flush at the
          // bottom, so the pin is only needed for non-animated settles (mount with
          // pre-resolved items, reduced-motion, zero-duration).
          const topListEl = deps.getTopListEl();
          if (topListEl && scrollToBottom && !scrollAnimating) {
            topListEl.scrollTop = topListEl.scrollHeight;
          }
        });
      },
    ),
  );

  onCleanup(() => prevRects.clear());

  return { exitingKey };
}
