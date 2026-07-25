// ProgressionQueue — scrollToKey and the transfer animation. Split from
// ProgressionQueue.test.tsx (2026-07-24) to stay under the repo's 500-line
// file limit; the two scrollToKey tests are unchanged in substance from
// their original home (see git history). Only the reduced-motion and
// arrival-reveal paths are testable in jsdom — the motion itself is verified
// in the dev showcase (see docs/adr/0004-one-queue-component-and-the-motion-seam.md).
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { ProgressionQueue } from "./ProgressionQueue";
import { SECTIONS, type Item } from "./testHelpers";

afterEach(cleanup);

// jsdom does not implement scrollIntoView at all, so each test installs its
// own recording stub on the prototype. Restoring it after every test (rather
// than leaving the last test's stub in place, as the pre-split file did)
// keeps a stray call from one test out of a different test's recorder array.
let originalScrollIntoView: (() => void) | undefined;
beforeEach(() => {
  originalScrollIntoView = (
    Element.prototype as unknown as { scrollIntoView?: () => void }
  ).scrollIntoView;
});
afterEach(() => {
  if (originalScrollIntoView) {
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
      originalScrollIntoView;
  } else {
    delete (Element.prototype as unknown as { scrollIntoView?: () => void }).scrollIntoView;
  }
});

const recordScrollIntoView = (calls: string[]) => {
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
    function (this: Element) {
      calls.push((this as HTMLElement).dataset.pqKey ?? "");
    };
};

describe("ProgressionQueue — scrollToKey", () => {
  it("scrolls the matching row into view when scrollToKey changes", async () => {
    const calls: string[] = [];
    recordScrollIntoView(calls);
    const [key, setKey] = createSignal<string | undefined>(undefined);
    const { container } = render(() => (
      <ProgressionQueue<Item>
        sections={SECTIONS}
        items={[
          { id: "1", bucket: "a" },
          { id: "2", bucket: "b" },
        ]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
        scrollToKey={key()}
      />
    ));
    expect(container).toBeTruthy();
    setKey("2");
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(calls).toEqual(["2"]);
  });

  it("is a no-op when scrollToKey matches no row", async () => {
    const calls: string[] = [];
    recordScrollIntoView(calls);
    const [key, setKey] = createSignal<string | undefined>(undefined);
    render(() => (
      <ProgressionQueue<Item>
        sections={SECTIONS}
        items={[{ id: "1", bucket: "a" }]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
        scrollToKey={key()}
      />
    ));
    setKey("nope");
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(calls).toEqual([]);
  });

  it("re-requests the same key after clearing then setting it again", async () => {
    const calls: string[] = [];
    recordScrollIntoView(calls);
    const [key, setKey] = createSignal<string | undefined>(undefined);
    render(() => (
      <ProgressionQueue<Item>
        sections={SECTIONS}
        items={[
          { id: "1", bucket: "a" },
          { id: "2", bucket: "b" },
        ]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
        scrollToKey={key()}
      />
    ));
    setKey("2");
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    setKey(undefined);
    setKey("2");
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(calls).toEqual(["2", "2"]);
  });
});

describe("ProgressionQueue — transfer animation", () => {
  it("reveals the arriving row after an item changes bucket", async () => {
    const calls: string[] = [];
    recordScrollIntoView(calls);
    const [items, setItems] = createSignal<Item[]>([
      { id: "1", bucket: "b" },
      { id: "2", bucket: "b" },
    ]);
    render(() => (
      <ProgressionQueue<Item>
        sections={SECTIONS}
        items={items()}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    calls.length = 0;
    setItems([
      { id: "1", bucket: "a" }, // moved b → a
      { id: "2", bucket: "b" },
    ]);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(calls).toContain("1");
  });

  it("does not reveal anything when no item changed bucket", async () => {
    const calls: string[] = [];
    recordScrollIntoView(calls);
    const [items, setItems] = createSignal<Item[]>([{ id: "1", bucket: "a" }]);
    render(() => (
      <ProgressionQueue<Item>
        sections={SECTIONS}
        items={items()}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    calls.length = 0;
    setItems([{ id: "1", bucket: "a" }, { id: "2", bucket: "a" }]); // an add, not a move
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(calls).toEqual([]);
  });
});
