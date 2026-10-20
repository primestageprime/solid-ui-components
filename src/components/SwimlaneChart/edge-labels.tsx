// SwimlaneChart — edge labels. One <text> per labelled edge at the midpoint of its routed path. The
// midpoint is measured from a hidden twin of the path (getPointAtLength), so any routing style works;
// a vertical edge takes its label to the right, any other above. Re-measured whenever `d` changes.
import { createEffect, createSignal, For, type JSX, onCleanup, Show } from "solid-js";
import type { EdgeView } from "./geometry";

export type SwimlaneEdgeLabelsProps = {
  edges: EdgeView[];
  labelOf: (key: string) => string | undefined;
  enabled: boolean;
};

type Anchor = { x: number; y: number; vertical: boolean };

/** Where a label sits for a path: its midpoint, and whether the path runs vertically. */
export const anchorOf = (path: SVGPathElement): Anchor | undefined => {
  if (typeof path.getTotalLength !== "function") return undefined;
  const len = path.getTotalLength();
  if (!Number.isFinite(len) || len === 0) return undefined;
  const a = path.getPointAtLength(0);
  const b = path.getPointAtLength(len);
  const m = path.getPointAtLength(len / 2);
  return { x: m.x, y: m.y, vertical: Math.abs(b.x - a.x) < 1 };
};

function EdgeLabel(props: { d: string; label: string }): JSX.Element {
  const [anchor, setAnchor] = createSignal<Anchor | undefined>(undefined);
  let twin: SVGPathElement | undefined;
  // Measure after the twin's `d` has reached the DOM (next frame), and once more after the drawn
  // edge's 0.55 s transition, so a label never sits at a midpoint the path has left behind.
  createEffect(() => {
    void props.d;
    const measure = () => {
      if (twin) setAnchor(anchorOf(twin));
    };
    measure();
    const frame = typeof requestAnimationFrame === "function" ? requestAnimationFrame(measure) : undefined;
    const later = setTimeout(measure, 600);
    onCleanup(() => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      clearTimeout(later);
    });
  });
  return (
    <>
      <path ref={twin} d={props.d} class="sui-swimlane__edge-twin" />
      <Show when={anchor()}>
        {(a) => (
          <text
            class="sui-swimlane__edge-label"
            x={a().vertical ? a().x + 10 : a().x}
            y={a().vertical ? a().y : a().y - 6}
            text-anchor={a().vertical ? "start" : "middle"}
            dominant-baseline={a().vertical ? "middle" : "auto"}
          >
            {props.label}
          </text>
        )}
      </Show>
    </>
  );
}

export function SwimlaneEdgeLabels(props: SwimlaneEdgeLabelsProps): JSX.Element {
  return (
    <Show when={props.enabled}>
      <For each={props.edges}>
        {(edge) => (
          <Show when={props.labelOf(edge.key)}>
            {(label) => <EdgeLabel d={edge.d} label={label()} />}
          </Show>
        )}
      </For>
    </Show>
  );
}
