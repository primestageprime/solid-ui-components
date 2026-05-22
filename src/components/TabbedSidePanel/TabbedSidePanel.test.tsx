import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { TabbedSidePanel, type TabbedPanelTab } from "./TabbedSidePanel";

const TABS: TabbedPanelTab[] = [
  { id: "a", label: "Alpha", content: () => <div data-testid="a-body">A body</div> },
  { id: "b", label: "Beta",  content: () => <div data-testid="b-body">B body</div> },
];

describe("TabbedSidePanel — basic render", () => {
  it("renders the tab strip", () => {
    const { getByText } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
      />
    ));
    expect(getByText("Alpha")).toBeTruthy();
    expect(getByText("Beta")).toBeTruthy();
  });

  it("renders the active tab's content when isOpen=true", () => {
    const { getByTestId } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
      />
    ));
    expect(getByTestId("a-body").textContent).toBe("A body");
  });

  it("applies the side marker class (default right)", () => {
    const { container } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
      />
    ));
    expect(container.firstElementChild!.className).toMatch(/sui-tabbed-side-panel--right/);
  });
});
