import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { createPanel } from "./Panel";
import { InfoPanel, AccentPanel, CompactPanel } from "./variants";

describe("Panel", () => {
  it("renders base frame, title header, and content region", () => {
    const Panel = createPanel({});
    const { container } = render(() => <Panel title="Status">body</Panel>);
    const root = container.querySelector(".sui-panel")!;
    expect(root).toBeTruthy();
    expect(root.querySelector(".sui-panel__title")!.textContent).toBe("Status");
    expect(root.querySelector(".sui-panel__content")!.textContent).toBe("body");
  });

  it("omits the header when no title is given", () => {
    const Panel = createPanel({});
    const { container } = render(() => <Panel>body</Panel>);
    expect(container.querySelector(".sui-panel__header")).toBeNull();
  });

  it("emits modifier classes for variant, size, glow, corners, and fill", () => {
    const Panel = createPanel({
      variant: "danger",
      size: "lg",
      glow: "strong",
      corners: "bracket",
    });
    const { container } = render(() => <Panel fill>x</Panel>);
    const root = container.querySelector(".sui-panel")!;
    expect(root.classList.contains("sui-panel--danger")).toBe(true);
    expect(root.classList.contains("sui-panel--lg")).toBe(true);
    expect(root.classList.contains("sui-panel--glow-strong")).toBe(true);
    expect(root.classList.contains("sui-panel--corners-bracket")).toBe(true);
    expect(root.classList.contains("sui-panel--fill")).toBe(true);
  });

  it("glow='none' does not add a glow class; bracket corners add decorations", () => {
    const Panel = createPanel({ glow: "none", corners: "bracket" });
    const { container } = render(() => <Panel>x</Panel>);
    const root = container.querySelector(".sui-panel")!;
    expect(root.classList.contains("sui-panel--glow-none")).toBe(false);
    expect(root.querySelector(".sui-panel__corner-bl")).toBeTruthy();
    expect(root.querySelector(".sui-panel__corner-br")).toBeTruthy();
  });

  it("curried variants bake their overrides", () => {
    const { container } = render(() => (
      <>
        <InfoPanel>a</InfoPanel>
        <AccentPanel>b</AccentPanel>
        <CompactPanel>c</CompactPanel>
      </>
    ));
    const panels = container.querySelectorAll(".sui-panel");
    expect(panels[0].classList.contains("sui-panel--corners-clip")).toBe(true);
    expect(panels[0].classList.contains("sui-panel--glow-subtle")).toBe(true);
    expect(panels[1].classList.contains("sui-panel--primary")).toBe(true);
    expect(panels[1].classList.contains("sui-panel--corners-bracket")).toBe(
      true,
    );
    expect(panels[2].classList.contains("sui-panel--sm")).toBe(true);
  });
});
