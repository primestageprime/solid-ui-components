import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ProductGridCard } from "./ProductGridCard";
import { domStructure } from "../../test-utils/domStructure";

afterEach(cleanup);

// Layout-purity regression guard. The card's centered-column arrangement is now
// composed from the CenteredColumn Layout variant (was display:flex;column;
// align-items:center;gap:6px, gap snapped to sm=8px). The card class, data-state
// attributes, click/keyboard semantics, and the label+bar children must persist.
describe("ProductGridCard layout purity", () => {
  it("composes a CenteredColumn root carrying the card hook + state attrs", () => {
    const { container } = render(() => (
      <ProductGridCard selected bar={<progress />}>
        Widget
      </ProductGridCard>
    ));
    expect(domStructure(container)).toBe(
      [
        "div.stack.stack--align-center.stack--gap-sm.sui-product-grid-card[data-selected]",
        "  div",
        '    "Widget"',
        "  div.sui-product-grid-card__bar",
        "    progress",
      ].join("\n"),
    );
  });

  it("promotes to role=button + tabindex when clickable (props unchanged)", () => {
    const { container } = render(() => (
      <ProductGridCard onClick={() => {}}>Click me</ProductGridCard>
    ));
    const root = container.querySelector(".sui-product-grid-card")!;
    expect(root.getAttribute("role")).toBe("button");
    expect(root.getAttribute("tabindex")).toBe("0");
  });

  it("stays static (no role/tabindex) when not clickable", () => {
    const { container } = render(() => <ProductGridCard>x</ProductGridCard>);
    const root = container.querySelector(".sui-product-grid-card")!;
    expect(root.getAttribute("role")).toBeNull();
    expect(root.getAttribute("tabindex")).toBeNull();
  });
});
