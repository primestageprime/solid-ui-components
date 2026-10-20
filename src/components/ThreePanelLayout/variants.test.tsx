import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  StandardThreePanel,
  ListDetailThreePanel,
  InspectorThreePanel,
  SplitThreePanel,
  FluidListDetailThreePanel,
  ListDetailLogThreePanel,
  THREE_PANEL_ASIDE_WIDTH as W,
} from "./index";

const cases = [
  ["StandardThreePanel", StandardThreePanel, "260px", "240px"],
  ["ListDetailThreePanel", ListDetailThreePanel, "320px", "240px"],
  ["InspectorThreePanel", InspectorThreePanel, "220px", "320px"],
  ["SplitThreePanel", SplitThreePanel, "560px", "240px"],
  ["FluidListDetailThreePanel", FluidListDetailThreePanel, "clamp(240px, 22vw, 360px)", "clamp(180px, 15vw, 260px)"],
  ["ListDetailLogThreePanel", ListDetailLogThreePanel, "320px", "clamp(320px, 28vw, 440px)"],
] as const;

describe("ThreePanelLayout curried variants", () => {
  for (const [name, Variant, left, right] of cases) {
    it(`${name} bakes ${left} / ${right} and full height`, () => {
      const { container } = render(() => (
        <Variant
          leftPanel={<div>l</div>}
          centerPanel={<div>c</div>}
          rightPanel={<div>r</div>}
        />
      ));
      const style = container.firstElementChild!.getAttribute("style") ?? "";
      expect(style).toContain(`--sui-three-panel-grid-columns: ${left} 1fr ${right}`);
      expect(style).toMatch(/height: ?100%/);
    });
  }

  it("fixed-width variants keep the 200px stacked-aside cap", () => {
    const { container } = render(() => (
      <ListDetailThreePanel leftPanel={<div>l</div>} centerPanel={<div>c</div>} />
    ));
    const style = container.firstElementChild!.getAttribute("style") ?? "";
    expect(style).toContain("--sui-three-panel-aside-max: 200px");
  });

  it("FluidListDetailThreePanel uncaps stacked asides (aside-max none)", () => {
    const { container } = render(() => (
      <FluidListDetailThreePanel leftPanel={<div>l</div>} centerPanel={<div>c</div>} />
    ));
    const style = container.firstElementChild!.getAttribute("style") ?? "";
    expect(style).toContain("--sui-three-panel-aside-max: none");
    expect(style).toContain(`${W.fluidList} 1fr 0`);
  });

  it("collapses an omitted aside to 0 as the primitive does", () => {
    const { container } = render(() => (
      <StandardThreePanel leftPanel={<div>l</div>} centerPanel={<div>c</div>} />
    ));
    const style = container.firstElementChild!.getAttribute("style") ?? "";
    expect(style).toContain(`${W.list} 1fr 0`);
  });

  it("ListDetailThreePanel rightWidth defaults to narrow (240, capped) and wide is the log column", () => {
    const style = (el: unknown) => (el as HTMLElement).getAttribute("style") ?? "";
    const narrow = render(() => (
      <ListDetailThreePanel leftPanel={<div>l</div>} centerPanel={<div>c</div>} rightPanel={<div>r</div>} />
    ));
    expect(style(narrow.container.firstElementChild)).toContain(`${W.wideList} 1fr ${W.context}`);
    expect(style(narrow.container.firstElementChild)).toContain("--sui-three-panel-aside-max: 200px");
    expect(narrow.container.querySelector(".sui-three-panel__right--flush")).toBeNull();
    const wide = render(() => (
      <ListDetailThreePanel rightWidth="wide" leftPanel={<div>l</div>} centerPanel={<div>c</div>} rightPanel={<div>r</div>} />
    ));
    expect(style(wide.container.firstElementChild)).toContain(`${W.wideList} 1fr ${W.logContext}`);
    expect(style(wide.container.firstElementChild)).toContain("--sui-three-panel-aside-max: none");
    expect(wide.container.querySelector(".sui-three-panel__right--flush")).not.toBeNull();
  });
});
