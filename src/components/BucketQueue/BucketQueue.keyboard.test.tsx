// BucketQueue — keyboard navigation & roving tabindex. Split from
// BucketQueue.test.tsx (2026-07-24) to stay under the repo's 500-line
// file limit; substance unchanged from the original tests, see git history
// for prior home.
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { BucketQueue, type Bucket } from "./BucketQueue";
import {
  renderQueue,
  renderSelectable,
  renderMixed,
  rows,
  rowFor,
} from "./testHelpers";

afterEach(cleanup);

describe("BucketQueue — keyboard navigation", () => {
  it("gives exactly one row the tab stop", () => {
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {} },
    );
    const tabbable = rows(container).filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
  });

  it("prefers focusedKey for the tab stop", () => {
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {}, focusedKey: "2" },
    );
    expect(rowFor(container, "2").getAttribute("tabindex")).toBe("0");
    expect(rowFor(container, "1").getAttribute("tabindex")).toBe("-1");
  });

  it("moves focus DOWN across a bucket boundary and reports it", () => {
    const moved: (string | null)[] = [];
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {}, onFocusChange: (k: string | null) => moved.push(k) },
    );
    fireEvent.keyDown(rowFor(container, "1"), { key: "ArrowDown" });
    expect(moved).toEqual(["2"]);
  });

  it("does not wrap at either end", () => {
    const moved: (string | null)[] = [];
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {}, onFocusChange: (k: string | null) => moved.push(k) },
    );
    fireEvent.keyDown(rowFor(container, "1"), { key: "ArrowUp" });
    fireEvent.keyDown(rowFor(container, "2"), { key: "ArrowDown" });
    expect(moved).toEqual(["1", "2"]);
  });

  it("Home and End jump to the first and last row", () => {
    const moved: (string | null)[] = [];
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
        { id: "3", bucket: "c" },
      ],
      { onSelect: () => {}, onFocusChange: (k: string | null) => moved.push(k) },
    );
    fireEvent.keyDown(rowFor(container, "1"), { key: "End" });
    fireEvent.keyDown(rowFor(container, "3"), { key: "Home" });
    expect(moved).toEqual(["3", "1"]);
  });

  it("Enter selects the focused row", () => {
    let selected: string | undefined;
    const { container } = renderQueue([{ id: "1", bucket: "a" }], {
      onSelect: (k: string) => (selected = k),
    });
    fireEvent.keyDown(rowFor(container, "1"), { key: "Enter" });
    expect(selected).toBe("1");
  });

  it("Space toggles the check on a selectable row in select mode", () => {
    let toggled: string | undefined;
    let selected: string | undefined;
    const { container } = renderSelectable({
      onSelect: (k: string) => (selected = k),
      checkedKeys: new Set<string>(),
      onToggleCheck: (k: string) => (toggled = k),
    });
    fireEvent.keyDown(rowFor(container, "check"), { key: " " });
    expect(toggled).toBe("check");
    expect(selected).toBeUndefined();
  });

  it("prefers focusedKey over selectedKey for the tab stop", () => {
    const { container } = renderQueue(
      [
        { id: "1", bucket: "a" },
        { id: "2", bucket: "b" },
      ],
      { onSelect: () => {}, focusedKey: "2", selectedKey: "1" },
    );
    expect(rowFor(container, "2").getAttribute("tabindex")).toBe("0");
    expect(rowFor(container, "1").getAttribute("tabindex")).toBe("-1");
  });

  it("gives the tab stop to the selectable bucket's row when a non-selectable bucket renders first", () => {
    const { container } = renderMixed({
      checkedKeys: new Set<string>(),
      onToggleCheck: () => {},
    });
    const tabbable = rows(container).filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].dataset.bqKey).toBe("live-1");
  });

  it("skips non-interactive rows on arrow navigation and never reports them via onFocusChange", () => {
    // Three buckets — selectable / non-selectable / selectable — with the
    // inert row sandwiched between two interactive ones, so ArrowDown from
    // the first interactive row has an inert row to actually skip over.
    const SANDWICH: Bucket[] = [
      { key: "a", label: "Alpha", tone: "success", selectable: true },
      { key: "b", label: "Beta", tone: "danger" },
      { key: "c", label: "Gamma", tone: "accent", selectable: true },
    ];
    const moved: (string | null)[] = [];
    const { container } = render(() => (
      <BucketQueue<{ id: string; bucket: string }>
        buckets={SANDWICH}
        items={[
          { id: "live-1", bucket: "a" },
          { id: "inert-1", bucket: "b" },
          { id: "live-2", bucket: "c" },
        ]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
        checkedKeys={new Set<string>()}
        onToggleCheck={() => {}}
        onFocusChange={(k: string | null) => moved.push(k)}
      />
    ));
    fireEvent.keyDown(rowFor(container, "live-1"), { key: "ArrowDown" });
    expect(moved).toEqual(["live-2"]);
    expect(moved).not.toContain("inert-1");
  });

  it("has zero tab stops and does not throw for a fully read-only queue", () => {
    const { container } = renderQueue([
      { id: "1", bucket: "a" },
      { id: "2", bucket: "b" },
    ]);
    const tabbable = rows(container).filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(0);
  });
});
