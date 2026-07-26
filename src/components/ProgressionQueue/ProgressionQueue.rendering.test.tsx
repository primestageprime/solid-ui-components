// ProgressionQueue — rendering & sizing. Split from ProgressionQueue.test.tsx
// (2026-07-24) to stay under the repo's 500-line file limit; substance
// unchanged from the original tests, see git history for prior home.
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ProgressionQueue, type ProgressionSection } from "./ProgressionQueue";
import {
  type Item,
  renderQueue,
  FIVE_IN_A,
  sectionHeights,
  SECTIONS,
  SELECTABLE,
  rowFor,
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

  // Regression for the select-mode layout bug found while verifying task 9:
  // `.prog-queue__row` used to be a plain block, so a checkbox (select mode)
  // followed by a block/flex-row renderItem forced a line break between them
  // instead of laying them out side by side. jsdom applies no stylesheet
  // (see styling.test.ts's comment), so the CSS contract is asserted by
  // reading the source rule, and the wiring that depends on it — the
  // renderItem output actually being wrapped in the flex-growing content slot
  // — is asserted on the rendered DOM.
  describe("row layout beside the select-mode checkbox", () => {
    const cssPath = join(dirname(fileURLToPath(import.meta.url)), "./ProgressionQueue.css");
    const css = readFileSync(cssPath, "utf8");
    const ruleBody = (selector: string): string => {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*[{,]`));
      if (!match) throw new Error(`rule not found: ${selector}`);
      const open = css.indexOf("{", match.index! + match[0].length - 1);
      return css.slice(open + 1, css.indexOf("}", open));
    };

    it("declares the row a flex line with a non-shrinking checkbox and a growing content slot", () => {
      expect(ruleBody(".prog-queue__row")).toMatch(/display\s*:\s*flex/);
      expect(ruleBody(".prog-queue__row")).toMatch(/align-items\s*:\s*center/);
      expect(ruleBody(".prog-queue__checkbox")).toMatch(/flex\s*:\s*none/);
      expect(ruleBody(".prog-queue__content")).toMatch(/flex\s*:\s*1 1 auto/);
      expect(ruleBody(".prog-queue__content")).toMatch(/min-width\s*:\s*0/);
    });

    it("renders the checkbox and the renderItem output as siblings, content wrapped for the growing slot", () => {
      const { container } = render(() => (
        <ProgressionQueue<Item>
          sections={SELECTABLE}
          items={[
            { id: "plain", bucket: "a" },
            { id: "check", bucket: "b" },
          ]}
          bucketOf={(i) => i.bucket}
          keyOf={(i) => i.id}
          // A block-level, full-width renderItem — the shape that wrapped onto
          // its own line under the old block-row layout.
          renderItem={(i) => <div style={{ display: "flex", width: "100%" }}>{i.id}</div>}
          checkedKeys={new Set<string>()}
          height={600}
        />
      ));
      const row = rowFor(container, "check");
      expect(row.children).toHaveLength(2);
      expect(row.children[0]!.classList.contains("prog-queue__checkbox")).toBe(true);
      const content = row.children[1]!;
      expect(content.classList.contains("prog-queue__content")).toBe(true);
      // The renderItem output is a child of the content slot, not a sibling of
      // the checkbox in its own right — it's the content slot that carries the
      // flex-grow contract that lets it sit beside the checkbox.
      expect(content.querySelector("div")).not.toBeNull();
    });
  });
});
