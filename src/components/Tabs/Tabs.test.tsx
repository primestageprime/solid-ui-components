import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
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
    expect(container.firstElementChild!.className).not.toMatch(/sui-tabs--vertical/);
  });

  it("applies sui-tabs--vertical when orientation='vertical'", () => {
    const { container } = render(() => (
      <Tabs tabs={TABS} activeTab="a" onTabChange={() => {}} orientation="vertical" />
    ));
    expect(container.firstElementChild!.className).toMatch(/sui-tabs--vertical/);
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
      <Tabs tabs={TABS} activeTab="a" onTabChange={() => {}} orientation="horizontal" />
    ));
    expect(container.firstElementChild!.className).not.toMatch(/sui-tabs--vertical/);
  });
});
