// src/components/AnimatedSwimlaneChart/variants.ts
//
// Curried, default-named variant. This is the component the package
// publishes (as `AnimatedSwimlaneChart` / `SwimlaneChart`): it accepts only
// data props (`nodes`, `onNodeClick`) so no visual/layout config leaks to the
// call site. To bake your own overrides (custom `renderNode`, `nodeSize`,
// `columns`, timing, …) build a variant with `createAnimatedSwimlaneChart`.
import { createAnimatedSwimlaneChart } from "./AnimatedSwimlaneChart";

export const AnimatedSwimlaneChart = createAnimatedSwimlaneChart({});
