// The positive control. MathFormula genuinely needs KaTeX, so katex MUST be
// present here — if it ever goes missing, the shaking got too aggressive and
// formulas ship unrendered.
import { render } from "solid-js/web";
import { MathFormula } from "@primestageprime/solid-ui-components";
render(() => <MathFormula expression="x^2" />, document.body);
