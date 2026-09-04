// ============================================
// DataTableContainer — one boolean prop switches the whole scroll strategy, and
// the two modes are mutually exclusive in a way nothing enforces:
//
//   fill=false → ScrollBox     + inline max-height (a HEIGHT-CAPPED region)
//   fill=true  → ScrollFillBox + NO max-height    (GROWS into a flex parent)
//
// A max-height leaking into fill mode would cap a container whose whole job is
// to grow, and a fill box in capped mode would ignore the cap. Both render
// something that looks fine in isolation, so both are asserted here.
//
// Assertions read the Layout variants' observable output — `box--grow` is what
// ScrollFillBox adds over ScrollBox (Box.tsx:27), and the baked `overflow`/
// `min-height` arrive via mergeStyle. Asserting the rendered result rather than
// the component identity means the test still holds if the variant is swapped
// for an equivalent one, and breaks if the scroll behaviour actually changes.
// ============================================
import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { DataTableContainer } from "./DataTableContainer";

const root = (container: HTMLElement) =>
  container.querySelector(".data-table-container") as HTMLElement;

describe("DataTableContainer capped mode (default)", () => {
  it("caps height at 500px by default", () => {
    // The default lives in the component as `?? "500px"`, not in CSS — omitting
    // maxHeight is the only way to see it, so a fixture that always passes one
    // would let the default drift to anything.
    const { container } = render(() => (
      <DataTableContainer>
        <div>rows</div>
      </DataTableContainer>
    ));
    expect(root(container).style.maxHeight).toBe("500px");
  });

  it("honours an explicit maxHeight", () => {
    const { container } = render(() => (
      <DataTableContainer maxHeight="240px">
        <div>rows</div>
      </DataTableContainer>
    ));
    expect(root(container).style.maxHeight).toBe("240px");
  });

  it("scrolls both axes without growing", () => {
    const { container } = render(() => (
      <DataTableContainer>
        <div>rows</div>
      </DataTableContainer>
    ));
    const el = root(container);
    expect(el.style.overflow).toBe("auto");
    // ScrollBox bakes no flex — a capped table must not also grow.
    expect(el.classList.contains("box--grow")).toBe(false);
    expect(el.classList.contains("data-table-container--fill")).toBe(false);
  });
});

describe("DataTableContainer fill mode", () => {
  it("grows into its flex parent and scrolls", () => {
    const { container } = render(() => (
      <DataTableContainer fill>
        <div>rows</div>
      </DataTableContainer>
    ));
    const el = root(container);
    expect(el.classList.contains("box--grow")).toBe(true);
    expect(el.style.overflow).toBe("auto");
    // min-height:0 is what actually lets a flex child shrink below its content
    // and scroll; without it the box grows past its parent and never scrolls.
    // ScrollFillBox bakes a unitless "0". jsdom 26 preserved it verbatim;
    // jsdom 30 normalises it to "0px", the way a browser does. Both readings
    // mean the same declaration, so the assertion takes either.
    expect(["0", "0px"]).toContain(el.style.minHeight);
  });

  it("applies NO max-height in fill mode", () => {
    // The exclusivity that nothing else enforces. A container told to fill its
    // parent must not also be capped at 500px.
    const { container } = render(() => (
      <DataTableContainer fill>
        <div>rows</div>
      </DataTableContainer>
    ));
    expect(root(container).style.maxHeight).toBe("");
  });

  it("ignores maxHeight when fill is set", () => {
    // Both props supplied — fill wins, and the cap is dropped rather than
    // merged. Pins which of the two takes precedence.
    const { container } = render(() => (
      <DataTableContainer fill maxHeight="240px">
        <div>rows</div>
      </DataTableContainer>
    ));
    expect(root(container).style.maxHeight).toBe("");
  });

  it("adds the fill modifier class", () => {
    const { container } = render(() => (
      <DataTableContainer fill>
        <div>rows</div>
      </DataTableContainer>
    ));
    expect(
      root(container).classList.contains("data-table-container--fill"),
    ).toBe(true);
  });
});

describe("DataTableContainer pass-through", () => {
  it("appends a consumer class after the component's own", () => {
    const { container } = render(() => (
      <DataTableContainer class="my-table">
        <div>rows</div>
      </DataTableContainer>
    ));
    const el = root(container);
    expect(el.classList.contains("data-table-container")).toBe(true);
    expect(el.classList.contains("my-table")).toBe(true);
  });

  it("forwards unrecognised props to the underlying element", () => {
    const { container } = render(() => (
      <DataTableContainer id="tbl" aria-label="Results">
        <div>rows</div>
      </DataTableContainer>
    ));
    const el = root(container);
    expect(el.id).toBe("tbl");
    expect(el.getAttribute("aria-label")).toBe("Results");
  });

  it("does not leak maxHeight or fill as DOM attributes", () => {
    // splitProps must consume both; leaking them puts invalid attributes on a
    // div, which React-style consumers would never notice until validation.
    const { container } = render(() => (
      <DataTableContainer fill maxHeight="240px">
        <div>rows</div>
      </DataTableContainer>
    ));
    const el = root(container);
    expect(el.hasAttribute("maxHeight")).toBe(false);
    expect(el.hasAttribute("fill")).toBe(false);
  });

  it("renders its children", () => {
    const { getByText } = render(() => (
      <DataTableContainer>
        <div>rows</div>
      </DataTableContainer>
    ));
    expect(getByText("rows")).toBeTruthy();
  });
});
