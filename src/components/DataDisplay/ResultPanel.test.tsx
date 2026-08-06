import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { ResultPanel } from "./ResultPanel";
import { useFormulaHighlight } from "../MathFormula/MathFormula";

// ResultPanel owns no CSS and renders no markup of its own — it is a Composite
// whose entire job is wiring. So the decisions worth pinning are the
// three-valued `formulaProvider` default and the pass-through to ResultDisplay,
// asserted through the classes ResultDisplay emits.
//
// FormulaProvider renders NO DOM — it is a bare context provider. So the only
// honest way to observe whether it wrapped is to ask a child whether it can
// reach the context. An earlier version of these tests asserted on rendered
// markup instead, which is identical on both branches; mutation-testing the
// default from `!== false` to `!!` showed it passing regardless. It was a
// hollow test of exactly the kind this task warns against, so it is now a
// probe.
const ContextProbe = (props: { seen: { hasContext: boolean } }) => {
  props.seen.hasContext = useFormulaHighlight() !== undefined;
  return <span class="kid">vars</span>;
};

describe("ResultPanel — formulaProvider default", () => {
  // `useFormulaProvider()` is `local.formulaProvider !== false`, deliberately
  // NOT a truthiness check. Omitted and explicit-true must both wrap; only an
  // explicit `false` opts out. The regression this guards is a rewrite to
  // `!!local.formulaProvider`, which would flip the default and silently kill
  // formula highlighting everywhere the prop is not passed.
  it("exposes the formula context to children when the prop is omitted", () => {
    const seen = { hasContext: false };
    render(() => (
      <ResultPanel label="NOx" value={1}>
        <ContextProbe seen={seen} />
      </ResultPanel>
    ));
    expect(seen.hasContext).toBe(true);
  });

  it("exposes the formula context when explicitly enabled", () => {
    const seen = { hasContext: false };
    render(() => (
      <ResultPanel label="NOx" value={1} formulaProvider={true}>
        <ContextProbe seen={seen} />
      </ResultPanel>
    ));
    expect(seen.hasContext).toBe(true);
  });

  it("withholds the formula context only on an explicit false", () => {
    const seen = { hasContext: true };
    render(() => (
      <ResultPanel label="NOx" value={1} formulaProvider={false}>
        <ContextProbe seen={seen} />
      </ResultPanel>
    ));
    expect(seen.hasContext).toBe(false);
  });

  it("renders the same content whether the provider is on or off", () => {
    const { container: on } = render(() => (
      <ResultPanel label="NOx" value={2.8} units="g/kWh" />
    ));
    const { container: off } = render(() => (
      <ResultPanel
        label="NOx"
        value={2.8}
        units="g/kWh"
        formulaProvider={false}
      />
    ));
    expect(on.querySelector(".sui-result-display__label")?.textContent).toBe(
      "NOx",
    );
    expect(off.querySelector(".sui-result-display__label")?.textContent).toBe(
      "NOx",
    );
    expect(
      off.querySelector(".sui-result-display__value-units")?.textContent,
    ).toBe("g/kWh");
  });

  it("still renders children with the provider explicitly off", () => {
    const { container } = render(() => (
      <ResultPanel label="NOx" value={1} formulaProvider={false}>
        <span class="kid">vars</span>
      </ResultPanel>
    ));
    expect(container.querySelector(".kid")?.textContent).toBe("vars");
  });
});

describe("ResultPanel — pass-through to ResultDisplay", () => {
  it("forwards label, sublabel, value, units, valueColor and badge", () => {
    const { container } = render(() => (
      <ResultPanel
        label="NOx Result"
        sublabel="Limit: 2.8 g/kWh"
        value={2.79}
        units="g/kWh"
        valueColor="rgb(0, 128, 0)"
        badge={<span class="b">pass</span>}
      />
    ));
    expect(
      container.querySelector(".sui-result-display__label")?.textContent,
    ).toBe("NOx Result");
    expect(
      container.querySelector(".sui-result-display__sublabel")?.textContent,
    ).toBe("Limit: 2.8 g/kWh");
    expect(
      container.querySelector(".sui-result-display__value")?.textContent,
    ).toContain("2.79");
    expect(
      container.querySelector(".sui-result-display__value-units")?.textContent,
    ).toBe("g/kWh");
    expect(
      container.querySelector<HTMLElement>(".sui-result-display__value")?.style
        .color,
    ).toBe("rgb(0, 128, 0)");
    expect(container.querySelector(".b")?.textContent).toBe("pass");
  });

  // `class` is consumed by splitProps and handed to the NarrowStack wrapper,
  // NOT to the inner ResultDisplay — so it must not land on the result node.
  it("puts a consumer class on the wrapper, not on the ResultDisplay", () => {
    const { container } = render(() => (
      <ResultPanel label="NOx" value={1} class="panel-wide" />
    ));
    const wrapper = container.querySelector(".panel-wide");
    expect(wrapper).not.toBeNull();
    expect(
      container.querySelector(".sui-result-display")?.className,
    ).not.toContain("panel-wide");
  });
});
