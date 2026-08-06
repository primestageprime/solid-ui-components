import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { ResultDisplay } from "./ResultDisplay";

const root = (c: HTMLElement) =>
  c.querySelector<HTMLElement>(".sui-result-display");

describe("ResultDisplay — header block", () => {
  // The header is a `Show` on `label || sublabel`. Both halves matter: the
  // row must appear when EITHER is present, and must not render an empty
  // SpreadRow when neither is.
  it("renders no header row when there is neither label nor sublabel", () => {
    const { container } = render(() => <ResultDisplay value={1} />);
    expect(container.querySelector(".sui-result-display__header")).toBeNull();
  });

  it("renders the header for a label alone", () => {
    const { container } = render(() => <ResultDisplay value={1} label="NOx" />);
    expect(
      container.querySelector(".sui-result-display__header"),
    ).not.toBeNull();
    expect(
      container.querySelector(".sui-result-display__label")?.textContent,
    ).toBe("NOx");
    expect(container.querySelector(".sui-result-display__sublabel")).toBeNull();
  });

  it("renders the header for a sublabel alone", () => {
    const { container } = render(() => (
      <ResultDisplay value={1} sublabel="Limit: 2.8" />
    ));
    expect(
      container.querySelector(".sui-result-display__header"),
    ).not.toBeNull();
    expect(container.querySelector(".sui-result-display__label")).toBeNull();
    expect(
      container.querySelector(".sui-result-display__sublabel")?.textContent,
    ).toBe("Limit: 2.8");
  });

  it("puts the label in a heading element, not a bare span", () => {
    const { container } = render(() => <ResultDisplay value={1} label="NOx" />);
    expect(
      container.querySelector("h3.sui-result-display__label"),
    ).not.toBeNull();
  });
});

describe("ResultDisplay — highlight affordance", () => {
  it("adds no highlight classes by default", () => {
    const { container } = render(() => <ResultDisplay value={1} />);
    expect(root(container)?.className).toBe("sui-result-display");
  });

  it("adds the hover-target class for highlightable", () => {
    const { container } = render(() => (
      <ResultDisplay value={1} highlightable />
    ));
    expect(root(container)?.className).toContain(
      "sui-result-display--highlightable",
    );
    expect(root(container)?.className).not.toContain(
      "sui-result-display--highlighted",
    );
  });

  // The two flags are INDEPENDENT in the markup. The prop's JSDoc reads
  // "when true (and `highlightable`)", which overstates it — the CSS rule
  // `.sui-result-display--highlighted` is standalone, so `highlighted` alone
  // really does paint the tint. Pinned as-is rather than "fixed": coupling
  // them would silently stop painting for anyone already relying on it. The
  // doc comment was corrected to match instead.
  it("applies the highlighted tint even without highlightable", () => {
    const { container } = render(() => <ResultDisplay value={1} highlighted />);
    expect(root(container)?.className).toContain(
      "sui-result-display--highlighted",
    );
  });

  it("carries both classes when both flags are set", () => {
    const { container } = render(() => (
      <ResultDisplay value={1} highlightable highlighted />
    ));
    const cls = root(container)?.className ?? "";
    expect(cls).toContain("sui-result-display--highlightable");
    expect(cls).toContain("sui-result-display--highlighted");
  });
});

describe("ResultDisplay — value, units and slots", () => {
  it("switches the value class and renders a units span when units are given", () => {
    const { container } = render(() => (
      <ResultDisplay value={2.8} units="g/kWh" />
    ));
    expect(
      container.querySelector(".sui-result-display__value")?.className,
    ).toContain("sui-result-display__value--with-units");
    expect(
      container.querySelector(".sui-result-display__value-units")?.textContent,
    ).toBe("g/kWh");
  });

  it("omits the units span when units are absent", () => {
    const { container } = render(() => <ResultDisplay value={2.8} />);
    expect(
      container.querySelector(".sui-result-display__value-units"),
    ).toBeNull();
  });

  it("paints the value inline only when valueColor is supplied", () => {
    const { container: with_ } = render(() => (
      <ResultDisplay value={1} valueColor="rgb(0, 128, 0)" />
    ));
    const { container: without } = render(() => <ResultDisplay value={1} />);
    expect(
      with_.querySelector<HTMLElement>(".sui-result-display__value")?.style
        .color,
    ).toBe("rgb(0, 128, 0)");
    expect(
      without
        .querySelector<HTMLElement>(".sui-result-display__value")
        ?.getAttribute("style"),
    ).toBeNull();
  });

  it("renders the badge and children slots", () => {
    const { container } = render(() => (
      <ResultDisplay value={1} badge={<span class="b">ok</span>}>
        <span class="kid">note</span>
      </ResultDisplay>
    ));
    expect(container.querySelector(".b")?.textContent).toBe("ok");
    expect(container.querySelector(".kid")?.textContent).toBe("note");
  });

  it("appends a consumer class and forwards unconsumed attributes", () => {
    const { container } = render(() => (
      <ResultDisplay value={1} class="wide" id="nox" />
    ));
    expect(root(container)?.className).toContain("sui-result-display");
    expect(root(container)?.className).toContain("wide");
    expect(root(container)?.id).toBe("nox");
  });
});
