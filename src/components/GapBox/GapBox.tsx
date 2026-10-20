// ============================================
// GapBox — Composite (Depth 2)
// Tags: shows:placeholder, shows:text, does:view, data:text, role:container
// Owns zero CSS files and zero inline style={} (STYLE_GUIDE Layout Purity —
// composes curried Primitives only).
// The canonical "this is a gap" placeholder: a titled InfoSurface holding the
// JSON of the props the missing component would take. A design canon page
// renders one wherever SUI has no component yet, so the gap is visible, sized
// and greppable instead of being a hand-drawn box.
// Data-only (title / kind / nearest / props) — nothing presentational to freeze,
// so it is exported directly, like CountChip.
// ============================================
import type { Component } from "solid-js";
import { CodeBlock } from "../CodeBlock";
import { TightStack } from "../Layout";
import { InfoSurface } from "../Surface";
import { TextLabel } from "../Text";

export interface GapBoxProps {
  /** The missing component's name, e.g. "LocaleSwitcher". */
  title: string;
  /** "visual" = no component draws it; "behaviour" = no hook or logic covers it. Default "visual". */
  kind?: "visual" | "behaviour";
  /** The closest existing SUI export, or omit for none. */
  nearest?: string;
  /** The props the missing component would take, shown as JSON. */
  props?: unknown;
}

/** The JSON body a GapBox shows. Pure so a test can read it without a DOM. */
export function gapBoxJson(p: Pick<GapBoxProps, "kind" | "nearest" | "props">): string {
  return JSON.stringify(
    { kind: p.kind ?? "visual", nearest: p.nearest ?? "none", props: p.props ?? null },
    null,
    2,
  );
}

export const GapBox: Component<GapBoxProps> = (p) => (
  <InfoSurface>
    <TightStack>
      <TextLabel>{`GAP: ${p.title}`}</TextLabel>
      <CodeBlock size="sm">{gapBoxJson(p)}</CodeBlock>
    </TightStack>
  </InfoSurface>
);
