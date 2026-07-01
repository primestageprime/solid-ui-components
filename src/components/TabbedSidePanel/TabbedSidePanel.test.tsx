import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { TabbedSidePanel, createTabbedSidePanel, type TabbedPanelTab } from "./TabbedSidePanel";
import { RightDetailTabbedPanel, LeftNavTabbedPanel } from "./variants";

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
    const openChanges: boolean[] = [];
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
    const openChanges: boolean[] = [];
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

describe("TabbedSidePanel — side positioning", () => {
  it("side='right' renders strip before content (DOM order)", () => {
    const { container } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
        side="right"
      />
    ));
    const children = Array.from(container.firstElementChild!.children);
    // First child is the Tabs strip, then the PaddedBody wrapper containing the content.
    expect(children[0].getAttribute("role")).toBe("tablist");
    const lastChild = children[children.length - 1];
    expect(lastChild.getAttribute("data-sui-content-padding")).toBe("sm");
    expect(lastChild.firstElementChild!.getAttribute("data-testid")).toBe("a-body");
  });

  it("side='left' renders content before strip (DOM order)", () => {
    const { container } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
        side="left"
      />
    ));
    const children = Array.from(container.firstElementChild!.children);
    // First child is the PaddedBody wrapper; the testid is inside it.
    const firstChild = children[0];
    expect(firstChild.getAttribute("data-sui-content-padding")).toBe("sm");
    expect(firstChild.firstElementChild!.getAttribute("data-testid")).toBe("a-body");
    expect(children[children.length - 1].getAttribute("role")).toBe("tablist");
  });

  it("side='left' applies the left marker class", () => {
    const { container } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
        side="left"
      />
    ));
    expect(container.firstElementChild!.className).toMatch(/sui-tabbed-side-panel--left/);
  });
});

describe("createTabbedSidePanel factory", () => {
  it("applies the curried side default", () => {
    const Left = createTabbedSidePanel({ side: "left" });
    const { container } = render(() => (
      <Left
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
      />
    ));
    expect(container.firstElementChild!.className).toMatch(/sui-tabbed-side-panel--left/);
  });

  it("applies the curried tabsVariant default", () => {
    const Boxed = createTabbedSidePanel({ tabsVariant: "boxed" });
    const { container } = render(() => (
      <Boxed
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
      />
    ));
    // The inner Tabs gets the boxed class.
    expect(container.querySelector(".sui-tabs--boxed")).toBeTruthy();
  });
});

describe("Named variants", () => {
  it("RightDetailTabbedPanel applies side='right'", () => {
    const { container } = render(() => (
      <RightDetailTabbedPanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
      />
    ));
    expect(container.firstElementChild!.className).toMatch(/sui-tabbed-side-panel--right/);
  });

  it("LeftNavTabbedPanel applies side='left'", () => {
    const { container } = render(() => (
      <LeftNavTabbedPanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
      />
    ));
    expect(container.firstElementChild!.className).toMatch(/sui-tabbed-side-panel--left/);
  });
});

describe("TabbedSidePanel — contentPadding", () => {
  it("default contentPadding is 'sm' and wraps content in a padded container (side='right' → padding-left)", () => {
    const { getByTestId } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
      />
    ));
    const body = getByTestId("a-body");
    const wrapper = body.parentElement!;
    expect(wrapper.getAttribute("data-sui-content-padding")).toBe("sm");
    expect(wrapper.getAttribute("data-sui-content-side")).toBe("right");
  });

  it("contentPadding='none' produces a wrapper with data-sui-content-padding='none'", () => {
    const { getByTestId } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
        contentPadding="none"
      />
    ));
    const body = getByTestId("a-body");
    const wrapper = body.parentElement!;
    expect(wrapper.getAttribute("data-sui-content-padding")).toBe("none");
  });

  it("contentPadding='md' is forwarded to the wrapper data attribute", () => {
    const { getByTestId } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
        contentPadding="md"
      />
    ));
    const wrapper = getByTestId("a-body").parentElement!;
    expect(wrapper.getAttribute("data-sui-content-padding")).toBe("md");
  });

  it("side='left' flips the padded edge (data-sui-content-side='left')", () => {
    const { getByTestId } = render(() => (
      <TabbedSidePanel
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        isOpen={true}
        onOpenChange={() => {}}
        side="left"
      />
    ));
    const wrapper = getByTestId("a-body").parentElement!;
    expect(wrapper.getAttribute("data-sui-content-side")).toBe("left");
  });
});
