import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { CollapsiblePanel, createCollapsiblePanel } from "./CollapsiblePanel";

describe("CollapsiblePanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders expanded by default with the body and a collapse tab", () => {
    const { container } = render(() => (
      <CollapsiblePanel side="left" label="Filters">
        content
      </CollapsiblePanel>
    ));
    const aside = container.querySelector("aside.sui-collapsible-panel")!;
    expect(aside.classList.contains("sui-collapsible-panel--left")).toBe(true);
    expect(aside.querySelector(".sui-collapsible-panel__body")!.textContent).toBe(
      "content",
    );
    expect(container.querySelector(".sui-collapsible-panel__strip")).toBeNull();
  });

  it("starts collapsed as a strip when defaultCollapsed is set", () => {
    const { container } = render(() => (
      <CollapsiblePanel side="right" label="Details" defaultCollapsed />
    ));
    const strip = container.querySelector(".sui-collapsible-panel__strip")!;
    expect(strip).toBeTruthy();
    expect(
      strip.querySelector(".sui-collapsible-panel__strip-label")!.textContent,
    ).toBe("Details");
    expect(container.querySelector("aside")).toBeNull();
  });

  it("toggles between expanded and collapsed via the tab/strip buttons", () => {
    const { container } = render(() => (
      <CollapsiblePanel side="left" label="Nav">
        body
      </CollapsiblePanel>
    ));
    fireEvent.click(container.querySelector(".sui-collapsible-panel__tab")!);
    expect(container.querySelector(".sui-collapsible-panel__strip")).toBeTruthy();
    fireEvent.click(container.querySelector(".sui-collapsible-panel__strip")!);
    expect(container.querySelector("aside.sui-collapsible-panel")).toBeTruthy();
  });

  it("mirrors collapsed state to localStorage under persistKey", () => {
    const { container } = render(() => (
      <CollapsiblePanel side="left" label="Nav" persistKey="cp-nav">
        body
      </CollapsiblePanel>
    ));
    expect(window.localStorage.getItem("cp-nav")).toBe("0");
    fireEvent.click(container.querySelector(".sui-collapsible-panel__tab")!);
    expect(window.localStorage.getItem("cp-nav")).toBe("1");
  });

  it("reads initial collapsed state from a persisted value", () => {
    window.localStorage.setItem("cp-restore", "1");
    const { container } = render(() => (
      <CollapsiblePanel side="left" label="Nav" persistKey="cp-restore" />
    ));
    expect(container.querySelector(".sui-collapsible-panel__strip")).toBeTruthy();
  });

  it("createCollapsiblePanel bakes defaults", () => {
    const RightPanel = createCollapsiblePanel({
      side: "right",
      defaultCollapsed: true,
    });
    const { container } = render(() => <RightPanel side="right" label="Info" />);
    const strip = container.querySelector(".sui-collapsible-panel__strip")!;
    expect(strip.classList.contains("sui-collapsible-panel__strip--right")).toBe(
      true,
    );
  });
});
