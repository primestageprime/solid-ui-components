import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { DnDHierarchySortBar } from "./DnDHierarchySortBar";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeDataTransfer() {
  const store: Record<string, string> = {};
  return {
    effectAllowed: "",
    dropEffect: "",
    setData: (k: string, v: string) => {
      store[k] = v;
    },
    getData: (k: string) => store[k] ?? "",
    setDragImage: () => {},
  };
}
function fireDrag(el: Element, type: string, clientX: number, dt: any) {
  const ev: any = new Event(type, { bubbles: true, cancelable: true });
  ev.clientX = clientX;
  ev.clientY = 12;
  ev.dataTransfer = dt;
  el.dispatchEvent(ev);
}
const flush = () => new Promise((r) => setTimeout(r, 0));

// Variable widths to surface any reflow hysteresis. Gap 8.
const WIDTH: Record<string, number> = { A: 40, B: 80, C: 40, D: 80 };
const GAP = 8;

// Live, reflow-aware geometry: each pill/placeholder's rect is derived from its
// CURRENT position in DOM order (exactly like a browser after the row reflows).
function pillEls(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll(".sui-dnd-hierarchy-sort-bar__pill"),
  ) as HTMLElement[];
}
function labelOf(el: HTMLElement): string {
  return (el.textContent ?? "").replace(/[⋮\s]/g, "");
}
function widthOf(el: HTMLElement, draggedLabel: string): number {
  const isPlaceholder = el.classList.contains(
    "sui-dnd-hierarchy-sort-bar__placeholder",
  );
  return isPlaceholder ? WIDTH[draggedLabel] : (WIDTH[labelOf(el)] ?? 40);
}
function layout(root: HTMLElement, draggedLabel: string) {
  let x = 0;
  const rects = new Map<HTMLElement, { left: number; width: number }>();
  for (const el of pillEls(root)) {
    const w = widthOf(el, draggedLabel);
    rects.set(el, { left: x, width: w });
    x += w + GAP;
  }
  return rects;
}
function elementUnderX(root: HTMLElement, draggedLabel: string, cx: number) {
  const rects = layout(root, draggedLabel);
  for (const [el, r] of rects) {
    if (cx >= r.left && cx <= r.left + r.width) return { el, rect: r };
  }
  return null;
}
function installLiveLayout(root: HTMLElement, draggedLabel: string) {
  const orig = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const r = layout(root, draggedLabel).get(this as HTMLElement);
      if (r)
        return {
          left: r.left,
          top: 0,
          width: r.width,
          height: 24,
          right: r.left + r.width,
          bottom: 24,
          x: r.left,
          y: 0,
          toJSON() {},
        } as DOMRect;
      return orig.call(this);
    },
  );
}

// Drag `drag`, sweeping the cursor from x=0 to the right edge in small steps,
// firing dragover on whatever element is under the cursor at each step (the
// browser does exactly this on mousemove). Drop at `finalX`. Returns committed.
async function sweepDrag(opts: {
  initial: string[];
  drag: string;
  finalX: number;
}) {
  const [items, setItems] = createSignal(
    opts.initial.map((id) => ({ id, label: id })),
  );
  const onReorder = vi.fn((ids: string[]) =>
    setItems(ids.map((id) => ({ id, label: id }))),
  );
  const { container } = render(() => (
    <DnDHierarchySortBar items={items()} onReorder={onReorder} />
  ));
  const root = container as HTMLElement;
  installLiveLayout(root, opts.drag);
  const dt = makeDataTransfer();

  const src = pillEls(root).find((p) => labelOf(p) === opts.drag)!;
  // Grab point = centre of the dragged pill in the original (pre-drag) layout.
  const srcRect0 = layout(root, opts.drag).get(src)!;
  const startX = srcRect0.left + srcRect0.width / 2;
  fireDrag(src, "dragstart", startX, dt);
  await flush();

  // Continuous monotonic sweep from the grab point to the drop point — exactly
  // how a real pointer moves (it does not teleport to x=0 first).
  const step = opts.finalX >= startX ? 4 : -4;
  for (
    let cx = startX;
    step > 0 ? cx <= opts.finalX : cx >= opts.finalX;
    cx += step
  ) {
    const hit = elementUnderX(root, opts.drag, cx);
    if (hit) fireDrag(hit.el, "dragover", cx, dt);
  }
  const dropHit = elementUnderX(root, opts.drag, opts.finalX);
  if (dropHit) fireDrag(dropHit.el, "drop", opts.finalX, dt);

  return onReorder.mock.calls.at(-1)?.[0] as string[] | undefined;
}

describe("DnDHierarchySortBar — cursor-sweep drag commits the slot under the cursor", () => {
  // Layout of [A,B,C,D] (widths 40,80,40,80, gap 8):
  //   A: 0..40   B: 48..128   C: 136..176   D: 184..264
  // Dropping with the cursor near the FAR RIGHT must land the dragged item last.
  it("drag A all the way right → A lands last [B,C,D,A]", async () => {
    const out = await sweepDrag({
      initial: ["A", "B", "C", "D"],
      drag: "A",
      finalX: 260,
    });
    expect(out).toEqual(["B", "C", "D", "A"]);
  });

  it("drag A to just past C's midpoint → A lands after C [B,C,A,D]", async () => {
    // C midpoint in original layout ≈ 156. Stop at 160 (just right of it).
    const out = await sweepDrag({
      initial: ["A", "B", "C", "D"],
      drag: "A",
      finalX: 160,
    });
    expect(out).toEqual(["B", "C", "A", "D"]);
  });

  it("drag D all the way left → D lands first [D,A,B,C]", async () => {
    const out = await sweepDrag({
      initial: ["A", "B", "C", "D"],
      drag: "D",
      finalX: 4,
    });
    expect(out).toEqual(["D", "A", "B", "C"]);
  });

  // Middle-item drags that CROSS the removed slot in both directions — the
  // exact case where a coordinate-space off-by-one would surface.
  it("drag B rightward past C → [A,C,B,D]", async () => {
    // Drop just right of C's midpoint.
    const out = await sweepDrag({
      initial: ["A", "B", "C", "D"],
      drag: "B",
      finalX: 165,
    });
    expect(out).toEqual(["A", "C", "B", "D"]);
  });

  it("drag B all the way right → [A,C,D,B]", async () => {
    const out = await sweepDrag({
      initial: ["A", "B", "C", "D"],
      drag: "B",
      finalX: 260,
    });
    expect(out).toEqual(["A", "C", "D", "B"]);
  });

  it("drag C leftward before B → [A,C,B,D]", async () => {
    // Drop in B's left half.
    const out = await sweepDrag({
      initial: ["A", "B", "C", "D"],
      drag: "C",
      finalX: 60,
    });
    expect(out).toEqual(["A", "C", "B", "D"]);
  });

  it("drag C all the way left → [C,A,B,D]", async () => {
    const out = await sweepDrag({
      initial: ["A", "B", "C", "D"],
      drag: "C",
      finalX: 4,
    });
    expect(out).toEqual(["C", "A", "B", "D"]);
  });
});
