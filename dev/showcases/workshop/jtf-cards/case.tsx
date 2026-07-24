// Shared presentation for the JTF Card Catalog detail pane: every card variant
// is shown inside a fixed-width frame (its real container constrains width) with
// a description and the routes it appears on beside it — the treatment the
// EntityCard entry established, applied to every section.
import { type JSX, For, Show } from "solid-js";
import {
  TopClusterRow,
  NarrowStack,
  GrowBox,
  TightStack,
  WrappedClusterRow,
  TextLabel,
  TextBody,
  TextSublabel,
} from "../../../../src";
import "./catalog.css";

// A monospace route/path chip.
export function RouteChip(props: { path: string }): JSX.Element {
  return <div class="jtf-route-chip">{props.path}</div>;
}

// One catalog row: the card in a width-constrained frame + a description and its
// routes. `width` sizes the frame to the card's real container (a narrow rail
// card ~300px, a detail card wider). Defaults to a 320px rail width.
export function CardCase(props: {
  title: string;
  why: string;
  routes?: string[];
  width?: string;
  children: JSX.Element;
}): JSX.Element {
  const frameClass = (): string =>
    `jtf-card-frame jtf-card-frame--w${(props.width ?? "320px").replace("px", "")}`;
  return (
    <TopClusterRow>
      <div class={frameClass()}>{props.children}</div>
      <GrowBox>
        <TightStack>
          <TextLabel>{props.title}</TextLabel>
          <TextBody>{props.why}</TextBody>
          <Show when={props.routes && props.routes.length}>
            <WrappedClusterRow>
              <TextSublabel>Routes:</TextSublabel>
              <For each={props.routes}>{(r) => <RouteChip path={r} />}</For>
            </WrappedClusterRow>
          </Show>
        </TightStack>
      </GrowBox>
    </TopClusterRow>
  );
}

// Vertical stack of CardCases — one catalog entry's detail pane.
export function CardBench(props: { children: JSX.Element }): JSX.Element {
  return <NarrowStack>{props.children}</NarrowStack>;
}
