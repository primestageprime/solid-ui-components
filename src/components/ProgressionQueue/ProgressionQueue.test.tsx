import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { ProgressionQueue, type ProgressionSection } from "./ProgressionQueue";

afterEach(cleanup);

interface Item {
  id: string;
  bucket: string;
}

const SECTIONS: ProgressionSection[] = [
  { key: "a", label: "Alpha", tone: "success" },
  { key: "b", label: "Beta", tone: "danger" },
  { key: "c", label: "Gamma", tone: "accent", weight: 2 },
];

const renderQueue = (items: Item[], extra: Record<string, unknown> = {}) =>
  render(() => (
    <ProgressionQueue<Item>
      sections={SECTIONS}
      items={items}
      bucketOf={(i) => i.bucket}
      keyOf={(i) => i.id}
      renderItem={(i) => <span>{i.id}</span>}
      height={600}
      {...extra}
    />
  ));

describe("ProgressionQueue", () => {
  it("always renders every section with its count", () => {
    const { container } = renderQueue([
      { id: "1", bucket: "a" },
      { id: "2", bucket: "a" },
      { id: "3", bucket: "b" },
    ]);
    const counts = [...container.querySelectorAll(".prog-queue__count")].map((c) => c.textContent);
    expect(counts).toEqual(["2", "1", "0"]); // gamma empty still shown
  });

  it("buckets items into their section and renders their rows", () => {
    const { container } = renderQueue([
      { id: "x", bucket: "a" },
      { id: "y", bucket: "c" },
    ]);
    const sections = container.querySelectorAll(".prog-queue__section");
    expect(sections[0].textContent).toContain("x");
    expect(sections[2].textContent).toContain("y");
  });

  it("carries the section tone on the dot only (chrome stays neutral)", () => {
    const { container } = renderQueue([{ id: "1", bucket: "a" }]);
    expect(container.querySelector(".prog-queue__dot--success")).toBeTruthy();
    expect(container.querySelector(".prog-queue__dot--danger")).toBeTruthy();
    expect(container.querySelector(".prog-queue__dot--accent")).toBeTruthy();
  });

  it("fires onSelect with the item key and marks the row interactive", () => {
    let picked: string | undefined;
    const { container } = renderQueue([{ id: "row-1", bucket: "a" }], {
      onSelect: (k: string) => (picked = k),
    });
    const row = container.querySelector(".prog-queue__row--interactive") as HTMLElement;
    expect(row).toBeTruthy();
    fireEvent.click(row);
    expect(picked).toBe("row-1");
  });

  it("marks the selected row", () => {
    const { container } = renderQueue([{ id: "row-1", bucket: "a" }], {
      onSelect: () => {},
      selectedKey: "row-1",
    });
    expect(container.querySelector(".prog-queue__row--selected")).toBeTruthy();
  });
});
