import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { DnDHierarchySortBar } from "./DnDHierarchySortBar";
import {
  makeDataTransfer,
  fireDrag,
  flush,
  installRects,
  liveFlow,
} from "../../test-utils";

let restoreRects: (() => void) | undefined;

afterEach(() => {
  cleanup();
  restoreRects?.();
  restoreRects = undefined;
  vi.restoreAllMocks();
});

// Variable widths to surface any reflow hysteresis. Gap 8.
const WIDTH: Record<string, number> = { A: 40, B: 80, C: 40, D: 80 };
const GAP = 8;
const PILL = ".sui-dnd-hierarchy-sort-bar__pill";

function pillEls(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll(PILL)) as HTMLElement[];
}
function labelOf(el: Element): string {
  return (el.textContent ?? "").replace(/[⋮\s]/g, "");
}

// `liveFlow` recomputes positions from CURRENT DOM order on every rect query,
// so as the component reorders its preview the rects move with it — the browser
// behaviour this sweep exists to exercise. The placeholder assumes the dragged
// pill's width, which is why `widthOf` closes over the dragged label.
function installLiveLayout(root: HTMLElement, draggedLabel: string) {
  restoreRects = installRects(
    liveFlow(root, {
      selector: PILL,
      gap: GAP,
      height: 24,
      widthOf: (el) =>
        el.classList.contains("sui-dnd-hierarchy-sort-bar__placeholder")
          ? WIDTH[draggedLabel]
          : (WIDTH[labelOf(el)] ?? 40),
    }),
  );
}

// Hit-testing now reads the installed rects rather than a second private copy
// of the layout maths.
function elementUnderX(root: HTMLElement, cx: number) {
  for (const el of pillEls(root)) {
    const r = el.getBoundingClientRect();
    if (cx >= r.left && cx <= r.left + r.width) return { el, rect: r };
  }
  return null;
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
  const srcRect0 = src.getBoundingClientRect();
  const startX = srcRect0.left + srcRect0.width / 2;
  fireDrag(src, "dragstart", {
    clientX: startX,
    clientY: 12,
    dataTransfer: dt,
  });
  await flush();

  // Continuous monotonic sweep from the grab point to the drop point — exactly
  // how a real pointer moves (it does not teleport to x=0 first).
  const step = opts.finalX >= startX ? 4 : -4;
  for (
    let cx = startX;
    step > 0 ? cx <= opts.finalX : cx >= opts.finalX;
    cx += step
  ) {
    const hit = elementUnderX(root, cx);
    if (hit)
      fireDrag(hit.el, "dragover", {
        clientX: cx,
        clientY: 12,
        dataTransfer: dt,
      });
  }
  const dropHit = elementUnderX(root, opts.finalX);
  if (dropHit)
    fireDrag(dropHit.el, "drop", {
      clientX: opts.finalX,
      clientY: 12,
      dataTransfer: dt,
    });

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
