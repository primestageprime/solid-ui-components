// ============================================
// SequenceFlow — Composite (Depth 2)
// Owns CSS (SequenceFlow.css). Composes Surface (node chrome), Layout
// variants (TightStack, BaselineSpreadRow, ClusterRow), Text and
// HatchedProgressBar.
//
// An ordered sequence of nodes drawn as a flow diagram, the way a pencil
// sketch shows "what happened, what is happening, what is next":
//
//   ┌ done ┐                                   ┌ next ┐
//   └──────┘ ─18 min─┐    ┌──── active ────┐   └──────┘
//   ┌ done ┐         │    │ label           │
//   └──────┘ ─1h 2m─┘ ──▶│ description     │──▶ 2 min
//   ┌ done ┐  3 min       │ Est 12m  Act 3:02│
//   └──────┘ ────────────▶│ ▓▓▓░░░░░░░░░░░  │
//                         └─────────────────┘
//
// Done nodes stack in the left lane, small (label + bar); the active node is
// the large card in the middle (label, description, estimate / actual, bar,
// and an `action` slot for the caller's button); next nodes stack in the
// right lane, small (label + estimate). Every edge between consecutive nodes
// can carry a label (an elapsed time, a count). No app nouns: nodes are
// nodes, the caller names them.
// ============================================
import { type Component, For, type JSX, Show, createMemo } from "solid-js";
import { findIndex } from "../../fn";
import type { FlowNodeSpec } from "../../listDetail/views";
import { BaselineSpreadRow, TightStack } from "../Layout/variants";
import { HatchedProgressBar } from "../Progress/HatchedProgressBar";
import { Text } from "../Text/Text";
import "./SequenceFlow.css";

/** One node of the flow. */
export type SequenceNode = FlowNodeSpec & { id: string };

export interface SequenceFlowProps {
  nodes: SequenceNode[];
  /** `edgeLabels[i]` sits on the edge from `nodes[i]` to `nodes[i + 1]`. */
  edgeLabels?: (string | undefined)[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Drawn inside the active node, under its bar (a hotkey button, say). */
  action?: JSX.Element;
  /** Labels before `estimate` and `actual`. Default "Est" and "Act". */
  estimateLabel?: string;
  actualLabel?: string;
  /** Shown when there are no nodes. Default "Nothing yet". */
  emptyLabel?: string;
}

/** The lanes a node list splits into: the done nodes, the active one (if any), the next ones. */
export const lanesOf = <N extends { size: FlowNodeSpec["size"] }>(nodes: N[]) => {
  const active = findIndex((n: N) => n.size === "active", nodes);
  const firstNext = findIndex((n: N) => n.size === "next", nodes);
  const cut = active >= 0 ? active : firstNext >= 0 ? firstNext : nodes.length;
  return {
    done: nodes.slice(0, cut),
    active: active >= 0 ? nodes[active] : undefined,
    next: nodes.slice(active >= 0 ? active + 1 : cut),
  };
};

const Arrow: Component<{ direction: "down" | "right"; label?: string }> = (props) => (
  <div class={`sui-sequence-flow__edge sui-sequence-flow__edge--${props.direction}`}>
    <svg class="sui-sequence-flow__arrow" viewBox="0 0 24 24" aria-hidden="true">
      <Show when={props.direction === "down"} fallback={<path d="M2 12h18m-5-5 5 5-5 5" />}>
        <path d="M12 2v18m-5-5 5 5 5-5" />
      </Show>
    </svg>
    <Show when={props.label}>
      <Text as="span" class="sui-sequence-flow__edge-label">
        {props.label}
      </Text>
    </Show>
  </div>
);

export const SequenceFlow: Component<SequenceFlowProps> = (props) => {
  const lanes = createMemo(() => lanesOf(props.nodes));
  const indexOf = (id: string): number => findIndex((n: SequenceNode) => n.id === id, props.nodes);
  const edgeAfter = (id: string): string | undefined => props.edgeLabels?.[indexOf(id)];
  const estimateLabel = () => props.estimateLabel ?? "Est";
  const actualLabel = () => props.actualLabel ?? "Act";

  const node = (n: SequenceNode) => (
    <div
      class={`sui-sequence-flow__node sui-sequence-flow__node--${n.size}`}
      role="option"
      tabIndex={-1}
      data-node-id={n.id}
      aria-selected={props.selectedId === n.id}
      onClick={() => props.onSelect?.(n.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onSelect?.(n.id);
        }
      }}
    >
      <TightStack>
        <Text as="span" class="sui-sequence-flow__label" title={n.label}>
          {n.label}
        </Text>
        <Show when={n.size === "active" && n.description}>
          <Text as="p" class="sui-sequence-flow__description">
            {n.description}
          </Text>
        </Show>
        <Show when={n.size === "active" && (n.estimate || n.actual)}>
          <BaselineSpreadRow>
            <Text as="span" class="sui-sequence-flow__meta">
              {n.estimate ? `${estimateLabel()} ${n.estimate}` : ""}
            </Text>
            <Text as="span" class="sui-sequence-flow__meta">
              {n.actual ? `${actualLabel()} ${n.actual}` : ""}
            </Text>
          </BaselineSpreadRow>
        </Show>
        <Show when={n.size === "next" && n.estimate}>
          <Text as="span" class="sui-sequence-flow__meta">
            {`${estimateLabel().toLowerCase()} ${n.estimate}`}
          </Text>
        </Show>
        <Show when={n.size !== "next" && n.progress}>
          {(p) => (
            <HatchedProgressBar done={p().done} active={p().active} total={p().total} label={n.label} />
          )}
        </Show>
        <Show when={n.size === "active" && props.action != null}>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: click-isolation barrier so the action's click does not also select the node. */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: onClick only stops propagation. */}
          <div class="sui-sequence-flow__action" onClick={(e) => e.stopPropagation()}>
            {props.action}
          </div>
        </Show>
      </TightStack>
    </div>
  );

  return (
    <Show when={props.nodes.length > 0} fallback={<Text as="span" class="sui-sequence-flow__empty">{props.emptyLabel ?? "Nothing yet"}</Text>}>
      <div class="sui-sequence-flow" role="listbox">
        <Show when={lanes().done.length > 0}>
          <div class="sui-sequence-flow__lane sui-sequence-flow__lane--done">
            <For each={lanes().done}>
              {(n, i) => (
                <>
                  {node(n)}
                  <Show when={i() < lanes().done.length - 1}>
                    <Arrow direction="down" label={edgeAfter(n.id)} />
                  </Show>
                </>
              )}
            </For>
          </div>
        </Show>
        <Show when={lanes().active}>
          {(a) => (
            <>
              <Show when={lanes().done.length > 0}>
                <Arrow direction="right" label={edgeAfter(lanes().done[lanes().done.length - 1].id)} />
              </Show>
              <div class="sui-sequence-flow__lane sui-sequence-flow__lane--active">{node(a())}</div>
            </>
          )}
        </Show>
        <Show when={lanes().next.length > 0}>
          <Show when={lanes().active || lanes().done.length > 0}>
            <Arrow
              direction="right"
              label={edgeAfter((lanes().active ?? lanes().done[lanes().done.length - 1]).id)}
            />
          </Show>
          <div class="sui-sequence-flow__lane sui-sequence-flow__lane--next">
            <For each={lanes().next}>
              {(n, i) => (
                <>
                  {node(n)}
                  <Show when={i() < lanes().next.length - 1}>
                    <Arrow direction="down" label={edgeAfter(n.id)} />
                  </Show>
                </>
              )}
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
};
