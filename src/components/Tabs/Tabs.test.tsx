import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { type FakeSizer, installFakeSizer } from "../../test-utils/fakeSizer";
import { Tabs } from "./Tabs";

const TABS = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" },
];

describe("Tabs orientation", () => {
  it("defaults to horizontal (no vertical class)", () => {
    const { container } = render(() => (
      <Tabs tabs={TABS} activeTab="a" onTabChange={() => {}} />
    ));
    expect(container.firstElementChild!.className).not.toMatch(
      /sui-tabs--vertical/,
    );
  });

  it("applies sui-tabs--vertical when orientation='vertical'", () => {
    const { container } = render(() => (
      <Tabs
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        orientation="vertical"
      />
    ));
    expect(container.firstElementChild!.className).toMatch(
      /sui-tabs--vertical/,
    );
  });

  it("keeps the variant class when orientation is set", () => {
    const { container } = render(() => (
      <Tabs
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        orientation="vertical"
        variant="boxed"
      />
    ));
    const cls = container.firstElementChild!.className;
    expect(cls).toMatch(/sui-tabs--vertical/);
    expect(cls).toMatch(/sui-tabs--boxed/);
  });

  it("does not apply vertical class when orientation='horizontal'", () => {
    const { container } = render(() => (
      <Tabs
        tabs={TABS}
        activeTab="a"
        onTabChange={() => {}}
        orientation="horizontal"
      />
    ));
    expect(container.firstElementChild!.className).not.toMatch(
      /sui-tabs--vertical/,
    );
  });
});

// ---- Responsive overflow -------------------------------------------------
// jsdom has no layout, so the measuring path needs stubbed geometry: every
// tab measures TAB_PX wide and the strip `stripPx` wide. The fake sizer drives
// the strip's ResizeObserver.

const TAB_PX = 100;

const FOUR = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" },
  { id: "c", label: "Gamma" },
  { id: "d", label: "Delta" },
];

const afterFrames = (count: number): Promise<void> =>
  new Promise((resolve) => {
    const step = (left: number) =>
      left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
  });

describe("Tabs overflow kebab", () => {
  let stripPx = 1000;
  let sizer: FakeSizer;
  const undo: Array<() => void> = [];

  const stub = (key: "offsetWidth" | "clientWidth", get: (el: HTMLElement) => number) => {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, key);
    Object.defineProperty(HTMLElement.prototype, key, {
      configurable: true,
      get() {
        return get(this as HTMLElement);
      },
    });
    undo.push(() =>
      original
        ? Object.defineProperty(HTMLElement.prototype, key, original)
        : Reflect.deleteProperty(HTMLElement.prototype, key),
    );
  };

  beforeEach(() => {
    stripPx = 1000;
    sizer = installFakeSizer();
    stub("offsetWidth", (el) => (el.classList.contains("sui-tab") ? TAB_PX : 0));
    stub("clientWidth", (el) => (el.classList.contains("sui-tabs") ? stripPx : 0));
  });

  afterEach(() => {
    cleanup();
    sizer.restore();
    for (const u of undo.splice(0)) u();
  });

  const shownLabels = (container: HTMLElement): string[] =>
    Array.from(container.querySelectorAll('[role="tab"]')).map(
      (el) => el.textContent ?? "",
    );
  const kebab = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(".sui-popover-menu__trigger");
  const menuLabels = (): string[] =>
    Array.from(document.body.querySelectorAll('[role="menuitem"]')).map(
      (el) => el.textContent ?? "",
    );

  it("shows every tab and no kebab when they all fit", async () => {
    const { container } = render(() => (
      <Tabs tabs={FOUR} activeTab="a" onTabChange={() => {}} />
    ));
    await afterFrames(2);
    expect(shownLabels(container)).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
    expect(kebab(container)).toBeNull();
  });

  it("keeps the tabs in a tablist and the kebab outside it", async () => {
    stripPx = 250;
    const { container } = render(() => (
      <Tabs tabs={FOUR} activeTab="a" onTabChange={() => {}} />
    ));
    await afterFrames(2);
    const list = container.querySelector('[role="tablist"]')!;
    expect(list.querySelectorAll('[role="tab"]').length).toBe(2);
    expect(list.contains(kebab(container))).toBe(false);
    expect(kebab(container)!.getAttribute("aria-label")).toBe("More tabs");
  });

  it("folds the tabs that don't fit into the kebab, in order", async () => {
    stripPx = 250;
    const { container } = render(() => (
      <Tabs tabs={FOUR} activeTab="a" onTabChange={() => {}} />
    ));
    await afterFrames(2);
    expect(shownLabels(container)).toEqual(["Alpha", "Beta"]);
    fireEvent.click(kebab(container)!);
    expect(menuLabels()).toEqual(["Gamma", "Delta"]);
  });

  it("keeps a folded active tab in view, in its own place", async () => {
    stripPx = 250;
    const { container } = render(() => (
      <Tabs tabs={FOUR} activeTab="d" onTabChange={() => {}} />
    ));
    await afterFrames(2);
    expect(shownLabels(container)).toEqual(["Alpha", "Delta"]);
    fireEvent.click(kebab(container)!);
    expect(menuLabels()).toEqual(["Beta", "Gamma"]);
  });

  it("choosing a folded tab from the kebab selects it", async () => {
    stripPx = 250;
    const [active, setActive] = createSignal("a");
    const { container } = render(() => (
      <Tabs tabs={FOUR} activeTab={active()} onTabChange={setActive} />
    ));
    await afterFrames(2);
    fireEvent.click(kebab(container)!);
    const gamma = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ).find((el) => el.textContent === "Gamma")!;
    fireEvent.click(gamma);
    expect(active()).toBe("c");
    await afterFrames(2);
    expect(shownLabels(container)).toEqual(["Alpha", "Gamma"]);
  });

  it("unfolds when the strip grows", async () => {
    stripPx = 250;
    const { container } = render(() => (
      <Tabs tabs={FOUR} activeTab="a" onTabChange={() => {}} />
    ));
    await afterFrames(2);
    expect(kebab(container)).not.toBeNull();
    stripPx = 600;
    await sizer.resizeAll({ width: 600, height: 40 });
    await afterFrames(2);
    expect(shownLabels(container)).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
    expect(kebab(container)).toBeNull();
  });

  it("never folds a vertical strip", async () => {
    stripPx = 50;
    const { container } = render(() => (
      <Tabs
        tabs={FOUR}
        activeTab="a"
        onTabChange={() => {}}
        orientation="vertical"
      />
    ));
    await afterFrames(2);
    expect(container.firstElementChild!.getAttribute("role")).toBe("tablist");
    expect(shownLabels(container)).toHaveLength(4);
    expect(kebab(container)).toBeNull();
  });
});
