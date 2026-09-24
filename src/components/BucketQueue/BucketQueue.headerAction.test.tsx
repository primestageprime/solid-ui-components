// BucketQueue — Bucket.headerAction. Split out (2026-09-24) rather than
// folded into an existing file, following the repo's split-by-concern
// convention for this component (see the other BucketQueue.*.test.tsx files).
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent } from "@solidjs/testing-library";
import type { Bucket } from "./types";
import { renderBuckets, COLLAPSIBLE, toggleButton } from "./testHelpers";

afterEach(cleanup);

const WITH_ACTION: Bucket[] = [
  { key: "a", label: "Alpha", tone: "success" },
  {
    key: "b",
    label: "Beta",
    tone: "danger",
    headerAction: <button type="button" data-testid="bucket-action">Dismiss all</button>,
  },
];

const COLLAPSIBLE_WITH_ACTION: Bucket[] = COLLAPSIBLE.map((b) =>
  b.key === "b"
    ? {
        ...b,
        headerAction: (
          <button type="button" data-testid="bucket-action">Dismiss all</button>
        ),
      }
    : b,
);

describe("BucketQueue — Bucket.headerAction", () => {
  it("renders the action in the header of the bucket that declares it, and no other", () => {
    const { container } = renderBuckets(WITH_ACTION, []);
    const buckets = [...container.querySelectorAll(".bucket-queue__bucket")];
    expect(buckets[0].querySelector('[data-testid="bucket-action"]')).toBeNull();
    expect(buckets[1].querySelector('[data-testid="bucket-action"]')).not.toBeNull();
  });

  it("does not affect the count badge", () => {
    const { container } = renderBuckets(WITH_ACTION, [
      { id: "1", bucket: "b" },
      { id: "2", bucket: "b" },
    ]);
    const counts = [...container.querySelectorAll(".bucket-queue__count")].map(
      (c) => c.textContent,
    );
    expect(counts).toEqual(["0", "2"]);
  });

  it("renders the action as a DOM sibling of the header, never inside it", () => {
    const { container } = renderBuckets(WITH_ACTION, []);
    const action = container.querySelector('[data-testid="bucket-action"]') as HTMLElement;
    const row = action.closest(".bucket-queue__header-row") as HTMLElement;
    const header = row.querySelector(".bucket-queue__header") as HTMLElement;
    expect(header.contains(action)).toBe(false);
    // Both live under the same header-row shell.
    expect(action.closest(".bucket-queue__header-row")?.contains(header)).toBe(true);
  });

  it("fires the action's own handler on click, and nothing else", () => {
    const onDismiss = vi.fn();
    const buckets: Bucket[] = [
      { key: "a", label: "Alpha", tone: "success" },
      {
        key: "b",
        label: "Beta",
        tone: "danger",
        headerAction: (
          <button type="button" data-testid="bucket-action" onClick={onDismiss}>
            Dismiss all
          </button>
        ),
      },
    ];
    const { container } = renderBuckets(buckets, []);
    fireEvent.click(container.querySelector('[data-testid="bucket-action"]') as HTMLElement);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("clicking the action on a collapsible bucket does not toggle collapse", () => {
    const { container } = renderBuckets(COLLAPSIBLE_WITH_ACTION, [
      { id: "1", bucket: "b" },
    ]);
    const toggle = toggleButton(container);
    expect(toggle?.getAttribute("aria-expanded")).toBe("false"); // collapsedByDefault
    fireEvent.click(container.querySelector('[data-testid="bucket-action"]') as HTMLElement);
    expect(toggleButton(container)?.getAttribute("aria-expanded")).toBe("false");
  });

  it("clicking the header toggle itself still works alongside an action", () => {
    const { container } = renderBuckets(COLLAPSIBLE_WITH_ACTION, [
      { id: "1", bucket: "b" },
    ]);
    fireEvent.click(toggleButton(container) as HTMLElement);
    expect(toggleButton(container)?.getAttribute("aria-expanded")).toBe("true");
  });

  it("omits the header-row wrapper entirely for a bucket with no headerAction", () => {
    const { container } = renderBuckets(WITH_ACTION, []);
    const buckets = [...container.querySelectorAll(".bucket-queue__bucket")];
    expect(buckets[0].querySelector(".bucket-queue__header-row")).toBeNull();
    expect(buckets[0].querySelector(".bucket-queue__header")).not.toBeNull();
  });
});
