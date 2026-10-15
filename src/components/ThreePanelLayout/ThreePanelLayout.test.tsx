import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ThreePanelLayout } from "./ThreePanelLayout";

describe("ThreePanelLayout", () => {
  it("renders the center panel", () => {
    const { container } = render(() => (
      <ThreePanelLayout centerPanel={<div>center</div>} />
    ));
    expect(
      container.querySelector(".sui-three-panel__center")?.textContent,
    ).toBe("center");
  });

  it("writes the grid-columns custom property from leftPanelWidth", () => {
    const { container } = render(() => (
      <ThreePanelLayout
        leftPanel={<div>left</div>}
        leftPanelWidth="300px"
        centerPanel={<div>center</div>}
      />
    ));
    const style = container.firstElementChild!.getAttribute("style") ?? "";
    expect(style).toMatch(/--sui-three-panel-grid-columns: ?300px 1fr 0/);
  });

  it("defaults --sui-three-panel-aside-max to 200px", () => {
    const { container } = render(() => (
      <ThreePanelLayout centerPanel={<div>center</div>} />
    ));
    const style = container.firstElementChild!.getAttribute("style") ?? "";
    expect(style).toMatch(/--sui-three-panel-aside-max: ?200px/);
  });

  it("writes --sui-three-panel-aside-max from the asideMaxHeight prop", () => {
    const { container } = render(() => (
      <ThreePanelLayout asideMaxHeight="none" centerPanel={<div>center</div>} />
    ));
    const style = container.firstElementChild!.getAttribute("style") ?? "";
    expect(style).toMatch(/--sui-three-panel-aside-max: ?none/);
  });

  it("accepts an arbitrary CSS length for asideMaxHeight", () => {
    const { container } = render(() => (
      <ThreePanelLayout asideMaxHeight="60vh" centerPanel={<div>center</div>} />
    ));
    const style = container.firstElementChild!.getAttribute("style") ?? "";
    expect(style).toMatch(/--sui-three-panel-aside-max: ?60vh/);
  });

  it("marks the right panel flush only when rightPanelFlush is set", () => {
    const flush = render(() => (
      <ThreePanelLayout rightPanelFlush centerPanel={<div>center</div>} rightPanel={<div>right</div>} />
    ));
    expect(flush.container.querySelector(".sui-three-panel__right--flush")).not.toBeNull();
    const padded = render(() => <ThreePanelLayout centerPanel={<div>center</div>} rightPanel={<div>right</div>} />);
    expect(padded.container.querySelector(".sui-three-panel__right")).not.toBeNull();
    expect(padded.container.querySelector(".sui-three-panel__right--flush")).toBeNull();
  });
});
