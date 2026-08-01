import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { RangeAmountGroup, createRangeAmountGroup } from "./RangeAmountGroup";

const slots = (labels: [string, string, string]) =>
  labels.map((label) => ({ label, value: 100, onChange: () => {} }));

describe("RangeAmountGroup", () => {
  it("renders three labeled slots", () => {
    const { container } = render(() => (
      <RangeAmountGroup slots={slots(["Min", "p95", "Max"])} />
    ));
    const labels = container.querySelectorAll(".sui-range-amount-group__label");
    expect(labels.length).toBe(3);
    expect([...labels].map((l) => l.textContent)).toEqual([
      "Min",
      "p95",
      "Max",
    ]);
    expect(container.querySelectorAll("input").length).toBeGreaterThanOrEqual(
      3,
    );
  });

  it("falls back to Min / Standard / Max for empty labels", () => {
    const { container } = render(() => (
      <RangeAmountGroup slots={slots(["", "", ""])} />
    ));
    const labels = container.querySelectorAll(".sui-range-amount-group__label");
    expect([...labels].map((l) => l.textContent)).toEqual([
      "Min",
      "Standard",
      "Max",
    ]);
  });

  it("emits no inline break var (frozen to the CSS --rag-break fallback)", () => {
    const { container } = render(() => (
      <RangeAmountGroup slots={slots(["a", "b", "c"])} />
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--rag-break")).toBe("");
    expect(root.className).toContain("sui-range-amount-group");
  });

  it("children mode reuses the responsive container for arbitrary triples", () => {
    const { container } = render(() => (
      <RangeAmountGroup>
        <div class="d">1</div>
        <div class="d">2</div>
        <div class="d">3</div>
      </RangeAmountGroup>
    ));
    expect(
      container.querySelectorAll(".sui-range-amount-group > .d").length,
    ).toBe(3);
    expect(container.querySelectorAll("input").length).toBe(0);
  });

  it("createRangeAmountGroup bakes defaults", () => {
    const Curried = createRangeAmountGroup({ name: "baked" });
    const { container } = render(() => (
      <Curried slots={slots(["x", "y", "z"])} />
    ));
    expect(container.querySelector('input[name="baked-0"]')).toBeTruthy();
  });
});
