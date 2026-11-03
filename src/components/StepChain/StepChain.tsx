// ============================================
// StepChain — Composite (Depth 2)
// Tags: shows:text, shows:list, does:hover, does:view, does:layout, data:steps, role:row
// Owns StepChain.css. Composes PopoverTooltip for the omitted steps.
// A name, a muted tag, and a chain of steps: `amount →span amount →span amount →`.
// Laid out by measured width (the rule is the pure `foldChain` in ./fold):
//   1. the name and the whole chain fit: one line
//   2. they do not fit together: name and tag on line one, the whole chain on line two
//   3. the chain overflows a line of its own: first two steps, an ellipsis with
//      "N more" stacked above it in the duration slot, then the last step
// Hover, focus or tap the ellipsis for the full chain in a popover (wrapped to
// the width it needs, max 92vw; Escape closes). A step is never wrapped
// mid-step. Generic: a step is a label and an optional span; PayChain words
// pay steps into these.
// ============================================
import {
  type Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js";
import { flatMap, map } from "../../fn";
import { observeSize } from "../../internal/dom/observeSize";
import { PopoverTooltip } from "../Tooltip";
import "./StepChain.css";
import { type ChainFold, type ChainMeasure, foldChain } from "./fold";

export interface ChainStep {
  /** The amount or value, drawn as is. */
  label: string;
  /** What sits over the arrow after the step (a duration). Absent: a blank slot. */
  span?: string;
}

export interface StepChainProps {
  /** Who the chain belongs to. */
  name: string;
  /** Muted small text after the name (the cadence). */
  tag?: string;
  steps: readonly ChainStep[];
  /** A chain that stops ends in a muted "done"; an open one ends in a bare arrow. */
  ends?: boolean;
}

type Piece = { kind: "a" | "r"; i: number } | { kind: "more" };

const FALLBACK_GAP = 8;
type Probe = Omit<ChainMeasure, "available">;

const Arrow: Component<{ span?: string; probe?: number }> = (props) => (
  <span class="step-chain__arrow" data-r={props.probe}>
    <small>{props.span ?? " "}</small>
    <span aria-hidden="true">→</span>
  </span>
);

const MoreFace: Component<{ count: number }> = (props) => (
  <>
    <small>{props.count} more</small>
    <b>…</b>
  </>
);

export const StepChain: Component<StepChainProps> = (props) => {
  let root!: HTMLDivElement;
  let probe!: HTMLDivElement;
  const [avail, setAvail] = createSignal(Number.POSITIVE_INFINITY);
  const [probed, setProbed] = createSignal<Probe | null>(null);

  const n = () => props.steps.length;
  const indices = () => Array.from({ length: n() }, (_, i) => i);

  const measure = () => {
    if (!probe || !root) return;
    const widths = (sel: string) =>
      map((e: Element) => e.getBoundingClientRect().width, Array.from(probe.querySelectorAll(sel)));
    const chainEl = probe.querySelector(".step-chain__chain");
    const parsed = chainEl ? Number.parseFloat(getComputedStyle(chainEl).columnGap) : Number.NaN;
    setProbed({
      head: probe.querySelector("[data-head]")?.getBoundingClientRect().width ?? 0,
      gap: Number.isFinite(parsed) ? parsed : FALLBACK_GAP,
      amounts: widths("[data-a]"),
      arrows: widths("[data-r]"),
      more: probe.querySelector("[data-more]")?.getBoundingClientRect().width ?? 0,
    });
    setAvail(root.getBoundingClientRect().width);
  };

  onMount(() => {
    measure();
    const stop = observeSize(root, (size) => setAvail(size.width));
    onCleanup(stop);
    // Web fonts change glyph widths after first paint; re-measure when they land.
    void document.fonts?.ready.then(measure);
  });
  createEffect(on(() => [props.name, props.tag, props.ends, props.steps], () => queueMicrotask(measure), { defer: true }));

  const fold = createMemo<ChainFold>(() => {
    const p = probed();
    if (!p) return { mode: "one", shown: indices(), omitted: 0 };
    return foldChain({ ...p, available: avail() });
  });

  /** The pieces to draw: every step, or a0 r0 a1 r1 … r(n-2) a(n-1) r(n-1) around the ellipsis. */
  const pieces = (folded: boolean): Piece[] => {
    const last = n() - 1;
    if (!folded) return flatMap((i: number): Piece[] => [{ kind: "a", i }, { kind: "r", i }], indices());
    return [
      { kind: "a", i: 0 }, { kind: "r", i: 0 }, { kind: "a", i: 1 }, { kind: "r", i: 1 },
      { kind: "more" },
      { kind: "r", i: last - 1 }, { kind: "a", i: last }, { kind: "r", i: last },
    ];
  };

  const amount = (i: number, probeIt?: boolean) => (
    <span class="step-chain__amt" data-a={probeIt ? i : undefined}>{props.steps[i]?.label}</span>
  );
  const connector = (i: number, probeIt?: boolean) => {
    const isLast = i === n() - 1;
    if (!isLast) return <Arrow span={props.steps[i]?.span} probe={probeIt ? i : undefined} />;
    return (
      <span class="step-chain__tail" data-r={probeIt ? i : undefined}>
        <Show when={!props.ends || props.steps[i]?.span !== undefined}>
          <Arrow span={props.steps[i]?.span} />
        </Show>
        <Show when={props.ends}>
          <span class="step-chain__done">done</span>
        </Show>
      </span>
    );
  };

  const caption = () => `${props.name}${props.tag ? ` · ${props.tag}` : ""} · ${n()} steps`;

  const Popup: Component = () => (
    <div class="step-chain__popup">
      <div class="step-chain__caption">{caption()}</div>
      <div class="step-chain__chain step-chain__chain--wrap">
        <For each={pieces(false)}>{(p) => (p.kind === "a" ? amount(p.i) : p.kind === "r" ? connector(p.i) : null)}</For>
      </div>
    </div>
  );

  const head = (probeIt?: boolean) => (
    <span class="step-chain__head" data-head={probeIt ? "" : undefined}>
      <span class="step-chain__name">{props.name}</span>
      <Show when={props.tag}>
        <small class="step-chain__tag">{props.tag}</small>
      </Show>
    </span>
  );

  return (
    <div ref={root} class={`step-chain step-chain--${fold().mode}`} data-mode={fold().mode}>
      <div class="step-chain__line">
        {head()}
        <span class="step-chain__chain">
          <For each={pieces(fold().mode === "fold")}>
            {(p) =>
              p.kind === "a" ? amount(p.i)
              : p.kind === "r" ? connector(p.i)
              : (
                <PopoverTooltip
                  class="step-chain__more"
                  contentClass="step-chain__pop"
                  content={<Popup />}
                  placement="top"
                >
                  <MoreFace count={fold().omitted} />
                </PopoverTooltip>
              )
            }
          </For>
        </span>
      </div>
      <div ref={probe} class="step-chain__probe" aria-hidden="true">
        {head(true)}
        <span class="step-chain__chain">
          <For each={indices()}>{(i) => <>{amount(i, true)}{connector(i, true)}</>}</For>
        </span>
        <span class="step-chain__more" data-more>
          <MoreFace count={Math.max(0, n() - 3)} />
        </span>
      </div>
    </div>
  );
};
