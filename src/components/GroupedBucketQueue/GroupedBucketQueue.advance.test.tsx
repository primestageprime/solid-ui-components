import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { GroupedBucketQueue } from "./GroupedBucketQueue";
import { GROUPS, type Item } from "./testHelpers";
import { rowFor } from "./testHelpers";

// Triage advance: when the SELECTED item's leaf bucket changes (an external
// mutation — e.g. the consumer re-buckets it after an edit), the selection
// should follow to the next survivor in the OLD leaf, mirroring BucketQueue's
// own advance.test.tsx.
describe("GroupedBucketQueue triage advance", () => {
  it("advances the selection to the next item still in the vacated leaf", () => {
    const [items, setItems] = createSignal<Item[]>([
      { id: "a", bucket: "rev-lic-monthly" },
      { id: "b", bucket: "rev-lic-monthly" },
      { id: "c", bucket: "rev-lic-monthly" },
    ]);
    const [selectedKey, setSelectedKey] = createSignal<string | undefined>("a");
    render(() => (
      <GroupedBucketQueue<Item>
        groups={GROUPS}
        items={items()}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        selectedKey={selectedKey()}
        onSelect={(k) => setSelectedKey(k ?? undefined)}
      />
    ));
    // "a" (selected) moves to a different leaf.
    setItems([
      { id: "a", bucket: "exp-office-monthly" },
      { id: "b", bucket: "rev-lic-monthly" },
      { id: "c", bucket: "rev-lic-monthly" },
    ]);
    expect(selectedKey()).toBe("b");
  });

  it("clears the selection when the vacated leaf is now empty", () => {
    const [items, setItems] = createSignal<Item[]>([
      { id: "a", bucket: "rev-lic-monthly" },
    ]);
    const [selectedKey, setSelectedKey] = createSignal<string | undefined>("a");
    render(() => (
      <GroupedBucketQueue<Item>
        groups={GROUPS}
        items={items()}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        selectedKey={selectedKey()}
        onSelect={(k) => setSelectedKey(k ?? undefined)}
      />
    ));
    setItems([{ id: "a", bucket: "exp-office-monthly" }]);
    expect(selectedKey()).toBeUndefined();
  });

  it("leaves the selection alone when an UNselected item's bucket changes", () => {
    const [items, setItems] = createSignal<Item[]>([
      { id: "a", bucket: "rev-lic-monthly" },
      { id: "b", bucket: "rev-lic-monthly" },
    ]);
    const [selectedKey, setSelectedKey] = createSignal<string | undefined>("a");
    const { container } = render(() => (
      <GroupedBucketQueue<Item>
        groups={GROUPS}
        items={items()}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        selectedKey={selectedKey()}
        onSelect={(k) => setSelectedKey(k ?? undefined)}
      />
    ));
    setItems([
      { id: "a", bucket: "rev-lic-monthly" },
      { id: "b", bucket: "exp-office-monthly" },
    ]);
    expect(selectedKey()).toBe("a");
    expect(rowFor(container, "a")).toBeTruthy();
  });
});
