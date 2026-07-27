// BucketQueue — the triage advance: when the SELECTED item leaves the
// queue the user is working, the selection follows to the next item still
// waiting there. `./selection.test.ts` covers the choice itself exhaustively;
// this file covers the wiring — that the component notices, and reports it
// through the same `onSelect` a click uses.
import { describe, it, expect, afterEach } from "vitest";
import { createSignal } from "solid-js";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { BucketQueue } from "./BucketQueue";
import { BUCKETS, type Item, rowFor } from "./testHelpers";

afterEach(cleanup);

// A controlled consumer: `items` and `selectedKey` are both signals, and
// onSelect feeds back into the selection exactly as a real call site would.
const renderTriage = (initial: Item[], initialSelected?: string) => {
  const [items, setItems] = createSignal<Item[]>(initial);
  const [selected, setSelected] = createSignal<string | undefined>(initialSelected);
  const selectCalls: (string | null)[] = [];

  const result = render(() => (
    <BucketQueue<Item>
      buckets={BUCKETS}
      items={items()}
      bucketOf={(i) => i.bucket}
      keyOf={(i) => i.id}
      renderItem={(i) => <span>{i.id}</span>}
      height={600}
      selectedKey={selected()}
      onSelect={(key) => {
        selectCalls.push(key);
        setSelected(key ?? undefined);
      }}
    />
  ));

  // One atomic mutation, the way the README tells consumers to move an item.
  const moveTo = (ids: string[], bucket: string) =>
    setItems((rows) =>
      rows.map((r) => (ids.includes(r.id) ? { ...r, bucket } : r)),
    );

  // A consumer-side MERGE: `members` are replaced by the single `head` row.
  const merge = (members: string[], head: Item) =>
    setItems((rows) => [head, ...rows.filter((r) => !members.includes(r.id))]);

  return { ...result, selectCalls, selected, moveTo, merge };
};

const inA = (...ids: string[]): Item[] => ids.map((id) => ({ id, bucket: "a" }));

describe("BucketQueue — triage advance", () => {
  it("selects the next item in the source bucket when the selected item moves", () => {
    const { selected, selectCalls, moveTo } = renderTriage(inA("1", "2", "3"), "2");
    moveTo(["2"], "b");
    expect(selectCalls).toEqual(["3"]);
    expect(selected()).toBe("3");
  });

  it("falls back to the item ABOVE when the last item in the queue is processed", () => {
    const { selected, moveTo } = renderTriage(inA("1", "2", "3"), "3");
    moveTo(["3"], "b");
    expect(selected()).toBe("2");
  });

  it("skips items that left in the same batch", () => {
    const { selected, moveTo } = renderTriage(inA("1", "2", "3", "4"), "2");
    moveTo(["2", "3"], "b");
    expect(selected()).toBe("4");
  });

  // With every bucket `selectable`, a check set can span buckets, so one
  // mutation can pull rows out of several queues at once. The advance must key
  // off the SELECTED row's own source bucket, not whichever move it finds.
  // The "b" rows are listed FIRST deliberately: transfers come out in `items`
  // order, so the batch's first move is the one from "b". Reaching for it
  // instead of the selected row's own move is the natural bug, and this
  // ordering is what makes the assertion catch it.
  it("advances within the selected row's OWN bucket when a batch spans buckets", () => {
    const { selected, moveTo } = renderTriage(
      [
        { id: "8", bucket: "b" },
        { id: "9", bucket: "b" },
        { id: "1", bucket: "a" },
        { id: "2", bucket: "a" },
      ],
      "1",
    );
    moveTo(["1", "8"], "c"); // leaves "a" AND "b" in the same mutation
    expect(selected()).toBe("2"); // next in "a" — never "9", which is in "b"
  });

  it("clears when the batch drains the selected row's bucket but not the other", () => {
    const { selected, selectCalls, moveTo } = renderTriage(
      [
        { id: "8", bucket: "b" },
        { id: "9", bucket: "b" },
        { id: "1", bucket: "a" },
      ],
      "1",
    );
    moveTo(["1", "8"], "c");
    // "b" still has "9", but the queue the USER was working is empty.
    expect(selectCalls).toEqual([null]);
    expect(selected()).toBeUndefined();
  });

  it("does not fire when some OTHER item moves", () => {
    const { selected, selectCalls, moveTo } = renderTriage(inA("1", "2", "3"), "2");
    moveTo(["1"], "b");
    expect(selectCalls).toEqual([]);
    expect(selected()).toBe("2");
  });

  it("clears the selection when the last item leaves the queue", () => {
    // The consumer needs to hear this to close its detail panel and show a
    // "nothing left" state — which it cannot infer from a callback that only
    // ever carries a key.
    const { selected, selectCalls, moveTo } = renderTriage(inA("1"), "1");
    moveTo(["1"], "b");
    expect(selectCalls).toEqual([null]);
    expect(selected()).toBeUndefined();
  });

  it("clears when a multi-item move empties the queue", () => {
    const { selectCalls, moveTo } = renderTriage(inA("1", "2", "3"), "2");
    moveTo(["1", "2", "3"], "b");
    expect(selectCalls).toEqual([null]);
  });

  it("never emits null from a plain activation", () => {
    // Only the advance can deselect; clicking a row always carries its key.
    const { container, selectCalls } = renderTriage(inA("1", "2"), "1");
    fireEvent.click(rowFor(container, "2"));
    expect(selectCalls).toEqual(["2"]);
  });

  it("releases the tab stop when the queue drains", () => {
    // The stop must not stay pinned to the row that left. Focusing "1" first is
    // what makes this assertion mean anything — the last-focused row wins the
    // precedence in createRowKeyboard, so without the release it would still
    // hold the stop from inside the bucket it moved to.
    const { container, moveTo } = renderTriage(
      [
        { id: "1", bucket: "a" },
        { id: "9", bucket: "b" },
      ],
      "1",
    );
    fireEvent.focus(rowFor(container, "1"));
    expect(rowFor(container, "1").getAttribute("tabindex")).toBe("0");

    moveTo(["1"], "c"); // bucket "a" drains; "1" lands below "9"
    expect(rowFor(container, "1").getAttribute("tabindex")).toBe("-1");
    expect(rowFor(container, "9").getAttribute("tabindex")).toBe("0");
  });

  it("advances again on each successive move — the whole triage loop", () => {
    const { selected, moveTo } = renderTriage(inA("1", "2", "3", "4"), "1");
    moveTo(["1"], "b");
    expect(selected()).toBe("2");
    moveTo(["2"], "c");
    expect(selected()).toBe("3");
    moveTo(["3"], "b");
    expect(selected()).toBe("4");
  });

  // MERGE is deliberately not a concept in this component — a consumer that
  // groups N checked rows into one does it with its own `setItems` and repairs
  // its own selection (see README, "Merging checked items"). These two tests
  // pin the behavior that recipe rests on, so it cannot drift silently.
  describe("consumer-side merge", () => {
    it("stays silent when a merge replaces N rows with one NEW key", () => {
      const { selected, selectCalls, merge } = renderTriage(
        inA("1", "2", "3", "4"),
        "2", // the selected row is one of the members
      );
      merge(["1", "2", "3"], { id: "g1", bucket: "a" });

      // Not a transfer in any part: a remove is not a move and an add is not a
      // move, so nothing is diffed and the advance never runs. That silence is
      // the guarantee — the consumer's own setSelectedKey(head) will not be
      // clobbered a tick later by an advance it did not ask for.
      expect(selectCalls).toEqual([]);
      // The flip side, and why the recipe has to repair the selection: the
      // selected key survives while its row does not.
      expect(selected()).toBe("2");
    });

    it("fires a MISLEADING clear when the head reuses a member key and moves", () => {
      // This is why the recipe says to mint a fresh key for the merged row.
      // Reusing "1" as the head makes it a genuine transfer, and from the
      // queue's point of view bucket "a" just drained — so it reports the
      // queue-empty signal even though "1" is alive and is the merge result.
      const { selectCalls, merge } = renderTriage(inA("1", "2", "3"), "1");
      merge(["1", "2", "3"], { id: "1", bucket: "b" });
      expect(selectCalls).toEqual([null]);
    });
  });

  it("carries the roving tab stop to the advanced row", () => {
    // Focus a DIFFERENT row first: the last-focused row outranks the selection
    // in createRowKeyboard's precedence, so this fails unless the advance
    // actually relocates the stop rather than the selection incidentally
    // winning it.
    const { container, moveTo } = renderTriage(inA("1", "2", "3"), "2");
    fireEvent.focus(rowFor(container, "1"));
    expect(rowFor(container, "1").getAttribute("tabindex")).toBe("0");

    moveTo(["2"], "b");
    expect(rowFor(container, "3").getAttribute("tabindex")).toBe("0");
    expect(rowFor(container, "1").getAttribute("tabindex")).toBe("-1");
  });
});
