import { Component } from "solid-js";
import { SectionTitle } from "../../src/components/Text";

// ─── Workshop ────────────────────────────────────────────────────────────
// Scratch bench for building new components before they graduate into the
// catalog (their own showcase + an export from `src/index.ts`). Intentionally
// empty between projects: add experiment rows here while iterating on a
// component, then remove them once the component ships.
//
// Prior contents (StatusFlowChart frame explorer, edge-router demo, animation
// experiments) graduated to `src/components/StatusFlowChart/` and live on in
// `animation-experiments.tsx` / `router-demo.tsx`; recover the old bench from
// git history if you need the composed view again.

export const WorkshopShowcase: Component = () => {
  return (
    <div class="component-section component-section--full">
      <SectionTitle>Workshop</SectionTitle>
      <p
        style={{
          "font-size": "12px",
          color: "var(--sui-text-secondary)",
          margin: "8px 0 16px",
        }}
      >
        Empty bench. New component experiments land here while in progress, then
        graduate to their own showcase and a <code>src/index.ts</code> export.
      </p>
    </div>
  );
};
