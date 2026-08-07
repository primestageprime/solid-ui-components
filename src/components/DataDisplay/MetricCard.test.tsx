import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { MetricCard } from "./MetricCard";

const root = (c: HTMLElement) =>
  c.querySelector<HTMLElement>(".sui-metric-card");

describe("MetricCard — colour modifier", () => {
  // "default" is a named value that must NOT produce a modifier class. The
  // regression this guards is a refactor to `if (local.color)`, which would
  // emit `sui-metric-card--default` and style against a class the CSS has no
  // rule for.
  it("emits no modifier for the default colour, whether explicit or omitted", () => {
    const { container: explicit } = render(() => (
      <MetricCard label="NOx" value={1} color="default" />
    ));
    const { container: omitted } = render(() => (
      <MetricCard label="NOx" value={1} />
    ));
    expect(root(explicit)?.className).toBe("sui-metric-card");
    expect(root(omitted)?.className).toBe("sui-metric-card");
  });

  it("emits a modifier for each non-default colour", () => {
    for (const color of ["success", "warning", "danger"] as const) {
      const { container } = render(() => (
        <MetricCard label="NOx" value={1} color={color} />
      ));
      expect(root(container)?.className).toContain(`sui-metric-card--${color}`);
    }
  });
});

describe("MetricCard — class composition", () => {
  // A consumer class must be additive. Replacing the base class would drop
  // every style the Primitive owns.
  it("appends a consumer class rather than replacing the base", () => {
    const { container } = render(() => (
      <MetricCard label="NOx" value={1} color="danger" class="wide" />
    ));
    const cls = root(container)?.className ?? "";
    expect(cls).toContain("sui-metric-card");
    expect(cls).toContain("sui-metric-card--danger");
    expect(cls).toContain("wide");
  });

  it("forwards unconsumed HTML attributes to the root", () => {
    const { container } = render(() => (
      <MetricCard label="NOx" value={1} id="nox" data-testid="metric" />
    ));
    expect(root(container)?.id).toBe("nox");
    expect(root(container)?.getAttribute("data-testid")).toBe("metric");
  });
});

describe("MetricCard — units", () => {
  it("switches the value class and renders a units span when units are given", () => {
    const { container } = render(() => (
      <MetricCard label="NOx" value={2.8} units="g/kWh" />
    ));
    expect(
      container.querySelector(".sui-metric-card__value")?.className,
    ).toContain("sui-metric-card__value--with-units");
    expect(
      container.querySelector(".sui-metric-card__value-units")?.textContent,
    ).toBe("g/kWh");
  });

  it("omits the units span and the modifier when units are absent", () => {
    const { container } = render(() => <MetricCard label="NOx" value={2.8} />);
    expect(
      container.querySelector(".sui-metric-card__value")?.className,
    ).not.toContain("--with-units");
    expect(container.querySelector(".sui-metric-card__value-units")).toBeNull();
  });

  it("renders the label and value it was given", () => {
    const { container } = render(() => (
      <MetricCard label="NOx Result" value={2.8} units="g/kWh" />
    ));
    expect(
      container.querySelector(".sui-metric-card__label")?.textContent,
    ).toBe("NOx Result");
    expect(
      container.querySelector(".sui-metric-card__value")?.textContent,
    ).toContain("2.8");
  });
});
