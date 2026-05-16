# Charts use d3-scale + d3-shape as peer deps; no d3-selection

SUI's chart family adds `d3-scale` and `d3-shape` as peer dependencies (~7kb gz combined). Both libraries are **pure math / path-builder** code with no DOM dependency. We explicitly **exclude `d3-selection`** because Solid owns rendering; d3-selection's imperative DOM mutation conflicts with Solid's reactive render model. Slots receive scales + descriptors from `useChart()` and emit JSX. Pattern matches `DagChart`'s existing `d3-dag` peer dep.

We chose this because (a) Solid's render model is the source of truth for the DOM — interleaving d3-selection would create two competing owners of each element, (b) `d3-scale`/`d3-shape` are stateless and trivially testable against the existing `Scale` interface, and (c) the bundle cost is acceptable for the time-axis + path generation features we get (`scaleTime`, optionally `line`/`area` generators if a future slot needs them).

The accepted cost is that contributors must internalize the split: **d3 = math only; Solid = render.** This is documented in CONTEXT.md's glossary additions ("Slot (chart)", "Descriptor (visual)"). Reversing this decision would require adopting d3-selection inside slots, which would force `createEffect` plumbing to coordinate Solid and d3 ownership; not worth it for the surface we have.
