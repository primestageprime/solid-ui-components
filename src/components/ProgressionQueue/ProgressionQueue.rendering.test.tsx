// ProgressionQueue — rendering & sizing. Split from ProgressionQueue.test.tsx
// (2026-07-24) to stay under the repo's 500-line file limit; substance
// unchanged from the original tests, see git history for prior home.
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ProgressionQueue, type ProgressionSection } from "./ProgressionQueue";
import {
  type Item,
  renderQueue,
  FIVE_IN_A,
  sectionHeights,
  SECTIONS,
} from "./testHelpers";

afterEach(cleanup);

describe("ProgressionQueue — rendering & sizing", () => {
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

  it("renders a section's emptyLabel when it has no items", () => {
    const sections: ProgressionSection[] = [
      { key: "a", label: "Alpha", tone: "success" },
      { key: "b", label: "Beta", tone: "accent", emptyLabel: "All clear" },
    ];
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={sections}
        items={[{ id: "1", bucket: "a" }]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    expect(container.querySelector(".prog-queue__empty")?.textContent).toBe("All clear");
  });

  it("omits the empty strip when a section declares no emptyLabel", () => {
    const { container } = renderQueue([{ id: "1", bucket: "a" }]);
    expect(container.querySelector(".prog-queue__empty")).toBeNull();
  });

  it("renders nothing for an item whose bucket matches no section", () => {
    const { container } = renderQueue([
      { id: "real", bucket: "a" },
      { id: "ghost", bucket: "nowhere" },
    ]);
    expect(container.textContent).toContain("real");
    expect(container.textContent).not.toContain("ghost");
  });

  it("shrink-wraps a section to its content when it declares no capRows", () => {
    const { container } = renderQueue(FIVE_IN_A);
    expect(sectionHeights(container)[0]).toBe("306px"); // 34 + 5*54 + 2
  });

  it("caps a section at capRows and keeps every row mounted so the body scrolls", () => {
    const capped: ProgressionSection[] = [
      { key: "a", label: "Alpha", tone: "success", capRows: 2 },
      { key: "b", label: "Beta", tone: "danger" },
      { key: "c", label: "Gamma", tone: "accent" },
    ];
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={capped}
        items={FIVE_IN_A}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    expect(sectionHeights(container)[0]).toBe("144px"); // 34 + 2*54 + 2
    // Capping is a viewport, not a filter — all five rows stay in the DOM.
    expect(container.querySelectorAll(".prog-queue__row")).toHaveLength(5);
  });

  // No ResizeObserver stub in this file on purpose — jsdom in this repo has
  // no ResizeObserver at all (see src/test-setup.ts), so omitting `height`
  // exercises the real "fill the parent" branch's guard. Without the guard
  // in ProgressionQueue.tsx, this throws `ReferenceError: ResizeObserver is
  // not defined` before anything renders.
  it("renders without a height prop even when ResizeObserver is unavailable", () => {
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={SECTIONS}
        items={[{ id: "1", bucket: "a" }, { id: "2", bucket: "b" }]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
      />
    ));
    expect(container.querySelectorAll(".prog-queue__row")).toHaveLength(2);
  });

  it("ignores capRows larger than the row count", () => {
    const capped: ProgressionSection[] = [
      { key: "a", label: "Alpha", tone: "success", capRows: 99 },
      { key: "b", label: "Beta", tone: "danger" },
      { key: "c", label: "Gamma", tone: "accent" },
    ];
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={capped}
        items={FIVE_IN_A}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    expect(sectionHeights(container)[0]).toBe("306px"); // still content-driven
  });
});
