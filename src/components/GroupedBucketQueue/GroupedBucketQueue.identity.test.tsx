import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { GroupedBucketQueue } from "./GroupedBucketQueue";
import { GROUPS, type Item } from "./testHelpers";
import { headerFor, rowFor } from "./testHelpers";

// `flattenGroupHeaders` (./groupTree.ts) returns FRESH header objects on
// every call, by design (it is a pure function with no memoization of its
// own). If the component's `<For>` iterated that array directly, EVERY
// change — a collapse toggle, an unrelated item arriving, a count changing —
// would look like an all-new set of rows to Solid's reconciler and remount
// the entire tree. These tests prove the component does NOT do that: DOM
// node identity (and therefore keyboard focus) survives a change that
// doesn't affect that particular node.
describe("GroupedBucketQueue DOM/focus identity", () => {
  it("a header's own DOM node survives ITS OWN collapse toggle — focus doesn't drop to body", () => {
    const { container } = render(() => (
      <GroupedBucketQueue<Item>
        groups={GROUPS}
        items={[{ id: "a", bucket: "rev-lic-monthly" }]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
      />
    ));
    const header = headerFor(container, "revenue:license");
    header.focus();
    expect(document.activeElement).toBe(header);
    fireEvent.click(header); // collapse
    // The click handler's own button element must still be the live,
    // focused element afterward — not unmounted out from under the event.
    expect(document.activeElement).toBe(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
  });

  it("a row's DOM node survives an UNRELATED item arriving elsewhere in the tree", () => {
    // The SAME "a" object reference goes into both arrays — this is the
    // standard Solid/React list convention (a row a caller doesn't touch
    // keeps its identity) that `<For>`'s reference-based diffing relies on;
    // it is not this component's job to paper over a caller creating a new
    // object for an unchanged row.
    const a: Item = { id: "a", bucket: "rev-lic-monthly" };
    const [items, setItems] = createSignal<Item[]>([a]);
    const { container } = render(() => (
      <GroupedBucketQueue<Item>
        groups={GROUPS}
        items={items()}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
      />
    ));
    const before = rowFor(container, "a");
    before.focus();
    expect(document.activeElement).toBe(before);
    // A brand-new item in a DIFFERENT leaf changes every header's rolled-up
    // count (Revenue's and License's included) but "a"'s own row/header
    // chain must not remount.
    setItems([a, { id: "b", bucket: "exp-office-monthly" }]);
    const after = rowFor(container, "a");
    expect(after).toBe(before);
    expect(document.activeElement).toBe(before);
  });

  it("a header's DOM node survives an unrelated collapse toggle elsewhere in the tree", () => {
    const { container } = render(() => (
      <GroupedBucketQueue<Item>
        groups={GROUPS}
        items={[
          { id: "a", bucket: "rev-lic-monthly" },
          { id: "b", bucket: "exp-office-monthly" },
        ]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
      />
    ));
    const revenueHeader = headerFor(container, "revenue");
    const expenseHeader = headerFor(container, "expense");
    fireEvent.click(expenseHeader); // collapse a SIBLING branch
    expect(headerFor(container, "revenue")).toBe(revenueHeader);
  });
});
