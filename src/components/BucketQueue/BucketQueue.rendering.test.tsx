// BucketQueue — rendering & sizing. Split from BucketQueue.test.tsx
// (2026-07-24) to stay under the repo's 500-line file limit; substance
// unchanged from the original tests, see git history for prior home.
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BucketQueue, type Bucket } from "./BucketQueue";
import {
  type Item,
  renderQueue,
  FIVE_IN_A,
  bucketHeights,
  BUCKETS,
  SELECTABLE,
  rowFor,
  COLLAPSIBLE,
  renderBuckets,
  toggleButton,
  renderVeto,
  vetoOne,
} from "./testHelpers";

afterEach(cleanup);

describe("BucketQueue — rendering & sizing", () => {
  it("always renders every bucket with its count", () => {
    const { container } = renderQueue([
      { id: "1", bucket: "a" },
      { id: "2", bucket: "a" },
      { id: "3", bucket: "b" },
    ]);
    const counts = [...container.querySelectorAll(".bucket-queue__count")].map((c) => c.textContent);
    expect(counts).toEqual(["2", "1", "0"]); // gamma empty still shown
  });

  it("buckets items into their bucket and renders their rows", () => {
    const { container } = renderQueue([
      { id: "x", bucket: "a" },
      { id: "y", bucket: "c" },
    ]);
    const buckets = container.querySelectorAll(".bucket-queue__bucket");
    expect(buckets[0].textContent).toContain("x");
    expect(buckets[2].textContent).toContain("y");
  });

  it("carries the bucket tone on the dot only (chrome stays neutral)", () => {
    const { container } = renderQueue([{ id: "1", bucket: "a" }]);
    expect(container.querySelector(".bucket-queue__dot--success")).toBeTruthy();
    expect(container.querySelector(".bucket-queue__dot--danger")).toBeTruthy();
    expect(container.querySelector(".bucket-queue__dot--accent")).toBeTruthy();
  });

  it("renders a bucket's emptyLabel when it has no items", () => {
    const buckets: Bucket[] = [
      { key: "a", label: "Alpha", tone: "success" },
      { key: "b", label: "Beta", tone: "accent", emptyLabel: "All clear" },
    ];
    const { container } = render(() => (
      <BucketQueue<Item>
        buckets={buckets}
        items={[{ id: "1", bucket: "a" }]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    expect(container.querySelector(".bucket-queue__empty")?.textContent).toBe("All clear");
  });

  it("omits the empty strip when a bucket declares no emptyLabel", () => {
    const { container } = renderQueue([{ id: "1", bucket: "a" }]);
    expect(container.querySelector(".bucket-queue__empty")).toBeNull();
  });

  it("renders nothing for an item whose bucket matches no bucket", () => {
    const { container } = renderQueue([
      { id: "real", bucket: "a" },
      { id: "ghost", bucket: "nowhere" },
    ]);
    expect(container.textContent).toContain("real");
    expect(container.textContent).not.toContain("ghost");
  });

  it("shrink-wraps a bucket to its content when it declares no capRows", () => {
    const { container } = renderQueue(FIVE_IN_A);
    expect(bucketHeights(container)[0]).toBe("306px"); // 34 + 5*54 + 2
  });

  it("caps a bucket at capRows and keeps every row mounted so the body scrolls", () => {
    const capped: Bucket[] = [
      { key: "a", label: "Alpha", tone: "success", capRows: 2 },
      { key: "b", label: "Beta", tone: "danger" },
      { key: "c", label: "Gamma", tone: "accent" },
    ];
    const { container } = render(() => (
      <BucketQueue<Item>
        buckets={capped}
        items={FIVE_IN_A}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    expect(bucketHeights(container)[0]).toBe("144px"); // 34 + 2*54 + 2
    // Capping is a viewport, not a filter — all five rows stay in the DOM.
    expect(container.querySelectorAll(".bucket-queue__row")).toHaveLength(5);
  });

  // No ResizeObserver stub in this file on purpose — jsdom in this repo has
  // no ResizeObserver at all (see src/test-setup.ts), so omitting `height`
  // exercises the real "fill the parent" branch's guard. Without the guard
  // in BucketQueue.tsx, this throws `ReferenceError: ResizeObserver is
  // not defined` before anything renders.
  it("renders without a height prop even when ResizeObserver is unavailable", () => {
    const { container } = render(() => (
      <BucketQueue<Item>
        buckets={BUCKETS}
        items={[{ id: "1", bucket: "a" }, { id: "2", bucket: "b" }]}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
      />
    ));
    expect(container.querySelectorAll(".bucket-queue__row")).toHaveLength(2);
  });

  it("stretches a fill bucket to swallow the height the others left over", () => {
    // Without `fill` this bucket shrink-wraps to 306 and 206px of the 600 is
    // allocated to nobody — the dead band a consumer sees between the last row
    // and whatever is pinned under the queue.
    const filling: Bucket[] = [
      { key: "a", label: "Alpha", tone: "success", fill: true },
      { key: "b", label: "Beta", tone: "danger" },
      { key: "c", label: "Gamma", tone: "accent" },
    ];
    const { container } = render(() => (
      <BucketQueue<Item>
        buckets={filling}
        items={FIVE_IN_A}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    // 600 − 2×8 gap − 2×36 empty summary lines = 512, all of it to Alpha.
    expect(bucketHeights(container)).toEqual(["512px", "36px", "36px"]);
  });

  it("ignores capRows larger than the row count", () => {
    const capped: Bucket[] = [
      { key: "a", label: "Alpha", tone: "success", capRows: 99 },
      { key: "b", label: "Beta", tone: "danger" },
      { key: "c", label: "Gamma", tone: "accent" },
    ];
    const { container } = render(() => (
      <BucketQueue<Item>
        buckets={capped}
        items={FIVE_IN_A}
        bucketOf={(i) => i.bucket}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        height={600}
      />
    ));
    expect(bucketHeights(container)[0]).toBe("306px"); // still content-driven
  });

  // A POPULATED bucket rendered as a click-to-expand summary line
  // (Bucket.collapsible, 2026-07-31). Distinct from the empty-bucket collapse
  // above: this one has items, shows a chevron instead of its tone dot, and
  // shows no emptyLabel.
  describe("collapsible buckets", () => {
    const ITEMS: Item[] = [
      { id: "keep", bucket: "a" },
      { id: "d1", bucket: "b" },
      { id: "d2", bucket: "b" },
    ];

    it("renders a collapsedByDefault bucket as its header alone, with its count", () => {
      const { container } = renderBuckets(COLLAPSIBLE, ITEMS);
      const buckets = container.querySelectorAll(".bucket-queue__bucket");
      expect(buckets[1].querySelectorAll(".bucket-queue__row")).toHaveLength(0);
      expect(buckets[1].querySelector(".bucket-queue__count")?.textContent).toBe("2");
      expect(bucketHeights(container)[1]).toBe("36px"); // header 34 + 2 border
    });

    it("shows no empty strip while collapsed — it is populated, not empty", () => {
      const { container } = renderBuckets(COLLAPSIBLE, ITEMS);
      expect(container.querySelector(".bucket-queue__empty")).toBeNull();
    });

    it("replaces the tone dot with a tone-coloured chevron", () => {
      const { container } = renderBuckets(COLLAPSIBLE, ITEMS);
      const discard = container.querySelectorAll(".bucket-queue__bucket")[1];
      expect(discard.querySelector(".bucket-queue__dot")).toBeNull();
      expect(discard.querySelector(".bucket-queue__chevron--muted")).toBeTruthy();
      // The other bucket is untouched — still a dot.
      const alpha = container.querySelectorAll(".bucket-queue__bucket")[0];
      expect(alpha.querySelector(".bucket-queue__dot--success")).toBeTruthy();
    });

    it("expands on click, and re-collapses on a second click", () => {
      const { container } = renderBuckets(COLLAPSIBLE, ITEMS);
      const button = toggleButton(container)!;
      expect(button.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(button);
      expect(container.querySelectorAll(".bucket-queue__row")).toHaveLength(3);
      expect(toggleButton(container)!.getAttribute("aria-expanded")).toBe("true");

      fireEvent.click(toggleButton(container)!);
      expect(container.querySelectorAll(".bucket-queue__row")).toHaveLength(1);
    });

    it("renders an EMPTY collapsible bucket exactly as it did before the flag", () => {
      // Nothing to expand into: no chevron, no button, and its emptyLabel shows.
      const { container } = renderBuckets(COLLAPSIBLE, [{ id: "keep", bucket: "a" }]);
      expect(toggleButton(container)).toBeNull();
      expect(container.querySelector(".bucket-queue__chevron")).toBeNull();
      expect(container.querySelector(".bucket-queue__dot--muted")).toBeTruthy();
      expect(container.querySelector(".bucket-queue__empty")?.textContent).toBe(
        "Nothing discarded",
      );
    });

    it("IGNORES collapsedByDefault when the bucket is not collapsible", () => {
      const buckets: Bucket[] = [
        { key: "a", label: "Alpha", tone: "success" },
        { key: "b", label: "Discard", tone: "muted", collapsedByDefault: true },
      ];
      const { container } = renderBuckets(buckets, ITEMS);
      expect(container.querySelectorAll(".bucket-queue__row")).toHaveLength(3);
      expect(toggleButton(container)).toBeNull();
    });

    it("keeps the user's expansion across the bucket draining and refilling", () => {
      // Sticky by design: if the user opened the pile, they wanted it open, and
      // the consumer's "Empty N discards" button must not silently re-close it.
      const [items, setItems] = createSignal<Item[]>(ITEMS);
      const { container } = render(() => (
        <BucketQueue<Item>
          buckets={COLLAPSIBLE}
          items={items()}
          bucketOf={(i) => i.bucket}
          keyOf={(i) => i.id}
          renderItem={(i) => <span>{i.id}</span>}
          height={600}
        />
      ));

      fireEvent.click(toggleButton(container)!);
      expect(container.querySelectorAll(".bucket-queue__row")).toHaveLength(3);

      setItems([{ id: "keep", bucket: "a" }]); // "Empty 2 discards"
      expect(container.querySelector(".bucket-queue__empty")).toBeTruthy();

      setItems([{ id: "keep", bucket: "a" }, { id: "d3", bucket: "b" }]);
      expect(container.querySelectorAll(".bucket-queue__row")).toHaveLength(2);
      expect(toggleButton(container)!.getAttribute("aria-expanded")).toBe("true");
    });
  });

  // Regression for the select-mode layout bug found while verifying task 9:
  // `.bucket-queue__row` used to be a plain block, so a checkbox (select mode)
  // followed by a block/flex-row renderItem forced a line break between them
  // instead of laying them out side by side. jsdom applies no stylesheet
  // (see styling.test.ts's comment), so the CSS contract is asserted by
  // reading the source rule, and the wiring that depends on it — the
  // renderItem output actually being wrapped in the flex-growing content slot
  // — is asserted on the rendered DOM.
  describe("row layout beside the select-mode checkbox", () => {
    const cssPath = join(dirname(fileURLToPath(import.meta.url)), "./BucketQueue.css");
    const css = readFileSync(cssPath, "utf8");
    const ruleBody = (selector: string): string => {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*[{,]`));
      if (!match) throw new Error(`rule not found: ${selector}`);
      const open = css.indexOf("{", match.index! + match[0].length - 1);
      return css.slice(open + 1, css.indexOf("}", open));
    };

    it("declares the row a flex line with a non-shrinking checkbox and a growing content slot", () => {
      expect(ruleBody(".bucket-queue__row")).toMatch(/display\s*:\s*flex/);
      expect(ruleBody(".bucket-queue__row")).toMatch(/align-items\s*:\s*center/);
      expect(ruleBody(".bucket-queue__checkbox")).toMatch(/flex\s*:\s*none/);
      expect(ruleBody(".bucket-queue__content")).toMatch(/flex\s*:\s*1 1 auto/);
      expect(ruleBody(".bucket-queue__content")).toMatch(/min-width\s*:\s*0/);
    });

    it("renders the checkbox and the renderItem output as siblings, content wrapped for the growing slot", () => {
      const { container } = render(() => (
        <BucketQueue<Item>
          buckets={SELECTABLE}
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
      expect(row.children[0]!.classList.contains("bucket-queue__checkbox")).toBe(true);
      const content = row.children[1]!;
      expect(content.classList.contains("bucket-queue__content")).toBe(true);
      // The renderItem output is a child of the content slot, not a sibling of
      // the checkbox in its own right — it's the content slot that carries the
      // flex-grow contract that lets it sit beside the checkbox.
      expect(content.querySelector("div")).not.toBeNull();
    });
  });
});

describe("BucketQueue — refused row rendering", () => {
  const veto = () =>
    renderVeto({
      checkedKeys: new Set<string>(),
      onSelect: () => {},
      onToggleCheck: () => {},
      isCheckable: vetoOne,
      uncheckableReason: () => "different side than your current selection",
    });

  it("dims the refused row IN PLACE and drops its clickable affordance", () => {
    const { container } = veto();
    const row = rowFor(container, "veto");
    expect(row.classList.contains("bucket-queue__row--uncheckable")).toBe(true);
    // Dropping --interactive is what removes cursor:pointer and the hover fill.
    expect(row.classList.contains("bucket-queue__row--interactive")).toBe(false);
  });

  it("leaves the refused row IN the bucket — dimming, not filtering", () => {
    const { container } = veto();
    // The header count and the row itself both stay, which is half of why
    // dimming beat filtering: the count must not lie about the bucket.
    expect(rowFor(container, "veto")).toBeTruthy();
    expect(container.querySelectorAll('[data-bq-bucket="b"] [data-bq-key]')).toHaveLength(2);
  });

  it("marks the refused row aria-disabled and titles it with the reason", () => {
    const { container } = veto();
    const row = rowFor(container, "veto");
    expect(row.getAttribute("aria-disabled")).toBe("true");
    expect(row.getAttribute("title")).toBe("different side than your current selection");
  });

  it("dashes the refused row's checkbox", () => {
    const { container } = veto();
    const box = rowFor(container, "veto").querySelector(".bucket-queue__checkbox");
    expect(box?.classList.contains("bucket-queue__checkbox--disabled")).toBe(true);
  });

  it("leaves the neighbour untouched", () => {
    const { container } = veto();
    const row = rowFor(container, "ok");
    expect(row.classList.contains("bucket-queue__row--uncheckable")).toBe(false);
    expect(row.classList.contains("bucket-queue__row--interactive")).toBe(true);
    expect(row.getAttribute("aria-disabled")).toBeNull();
    expect(row.getAttribute("title")).toBeNull();
    expect(
      row.querySelector(".bucket-queue__checkbox")?.classList.contains(
        "bucket-queue__checkbox--disabled",
      ),
    ).toBe(false);
  });

  it("sets no title when uncheckableReason is omitted", () => {
    const { container } = renderVeto({
      checkedKeys: new Set<string>(),
      onSelect: () => {},
      onToggleCheck: () => {},
      isCheckable: vetoOne,
    });
    expect(rowFor(container, "veto").getAttribute("title")).toBeNull();
  });
});
