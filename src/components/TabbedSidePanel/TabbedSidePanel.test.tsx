import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
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

describe("TabbedSidePanel — behavior", () => {
  it("clicking an inactive tab calls onTabChange", () => {
    let lastChange = "";
    const { getByText } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={(id) => (lastChange = id)}
        isOpen={true}
        onOpenChange={() => {}}
      />
    ));
    fireEvent.click(getByText("Beta"));
    expect(lastChange).toBe("b");
  });

  it("clicking an inactive tab while closed also opens the panel", () => {
    let openChanges: boolean[] = [];
    const { getByText } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={false}
        onOpenChange={(o) => openChanges.push(o)}
      />
    ));
    fireEvent.click(getByText("Beta"));
    expect(openChanges).toEqual([true]);
  });

  it("clicking the active tab toggles isOpen", () => {
    let openChanges: boolean[] = [];
    const { getByText } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={(o) => openChanges.push(o)}
      />
    ));
    fireEvent.click(getByText("Alpha"));
    expect(openChanges).toEqual([false]);
  });

  it("when isOpen=false, no tab content is rendered", () => {
    const { queryByTestId } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={false}
        onOpenChange={() => {}}
      />
    ));
    expect(queryByTestId("a-body")).toBeNull();
    expect(queryByTestId("b-body")).toBeNull();
  });

  it("inactive tabs' content() is never invoked", () => {
    let aCalls = 0;
    let bCalls = 0;
    const tabs: TabbedPanelTab[] = [
      { id: "a", label: "Alpha", content: () => { aCalls++; return <div>A</div>; } },
      { id: "b", label: "Beta",  content: () => { bCalls++; return <div>B</div>; } },
    ];
    render(() => (
      <TabbedSidePanel
        tabs={tabs}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
      />
    ));
    expect(aCalls).toBe(1);
    expect(bCalls).toBe(0);
  });

  it("switching activeTab while open swaps the rendered content", () => {
    const [active, setActive] = createSignal("a");
    const { getByTestId, queryByTestId } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab={active()}
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
      />
    ));
    expect(getByTestId("a-body").textContent).toBe("A body");

    setActive("b");
    expect(queryByTestId("a-body")).toBeNull();
    expect(getByTestId("b-body").textContent).toBe("B body");
  });
});
