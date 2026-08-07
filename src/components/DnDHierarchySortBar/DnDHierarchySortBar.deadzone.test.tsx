import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { DnDHierarchySortBar } from "./DnDHierarchySortBar";
import {
  makeDataTransfer,
  fireDrag,
  flush,
  installRects,
  rectOf,
} from "../../test-utils";

// ── Dead-zone regression ─────────────────────────────────────────────────────
// The original bug: `onDragOver` lived on each PILL, so it only fired when the
// cursor was over a pill. In a DEAD ZONE — the gap between pills, the empty
// space PAST the last pill, or the label area — no handler fired and `insertPos`
// went stale: the native drag-image followed the cursor but the placeholder (and
// the commit) stuck at the last pill it crossed.
//
// The fix moves hit-testing to the CONTAINER row: a geometry-based dragover that
// updates `insertPos` for ANY cursor coordinate. These tests dispatch dragover/
// drop DIRECTLY on the container row at dead-zone coordinates and assert the
// committed order tracks the cursor. They would FAIL with per-pill-only handling
// (nothing fires in a dead zone → stale insertPos → wrong commit).

let restoreRects: (() => void) | undefined;

afterEach(() => {
  cleanup();
  restoreRects?.();
  restoreRects = undefined;
  vi.restoreAllMocks();
});

// Strip the ⋮ drag-handle glyph and whitespace to recover the pill's label.
const labelOf = (el: Element): string =>
  (el.textContent ?? "").replace(/[⋮\s]/g, "");

// Fixed (non-reflowing) geometry keyed by pill label, with deliberate GAPS and
// trailing empty space so the dead zones are real:
//   A: 0..40 (mid 20)   B: 100..140 (mid 120)   C: 200..240 (mid 220)   D: 300..340 (mid 320)
// Gaps: 40..100, 140..200, 240..300; trailing dead zone: > 340.
// The gaps are the whole point, so neither shared model fits: `verticalRows` is
// vertical and contiguous, `liveFlow` packs elements with a uniform gap and
// would leave no dead zone to aim at.
const RANGE: Record<string, [number, number]> = {
  A: [0, 40],
  B: [100, 140],
  C: [200, 240],
  D: [300, 340],
};

function installFixedLayout() {
  restoreRects = installRects((el) => {
    const range = RANGE[labelOf(el)];
    if (!range) return null;
    const [left, right] = range;
    return rectOf({ left, top: 0, width: right - left, height: 24 });
  });
}

function containerEl(root: HTMLElement): HTMLElement {
  return root.querySelector(".sui-dnd-hierarchy-sort-bar") as HTMLElement;
}

function srcPill(root: HTMLElement, label: string): HTMLElement {
  const pills = Array.from(
    root.querySelectorAll(".sui-dnd-hierarchy-sort-bar__pill"),
  ) as HTMLElement[];
  return pills.find((p) => labelOf(p) === label)!;
}

async function dragToDeadZone(opts: {
  initial: string[];
  drag: string;
  dropX: number;
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
  installFixedLayout();
  const dt = makeDataTransfer();

  // dragstart on the dragged pill, then let the deferred placeholder take over.
  fireDrag(srcPill(root, opts.drag), "dragstart", {
    clientX: 120,
    clientY: 12,
    dataTransfer: dt,
  });
  await flush();

  // dragover + drop fired on the CONTAINER ROW at a dead-zone coordinate (NOT
  // over any pill). With per-pill handling this would do nothing.
  const row = containerEl(root);
  const at = { clientX: opts.dropX, clientY: 12, dataTransfer: dt };
  fireDrag(row, "dragover", at);
  fireDrag(row, "drop", at);

  return onReorder.mock.calls.at(-1)?.[0] as string[] | undefined;
}

describe("DnDHierarchySortBar — container hit-test covers dead zones", () => {
  it("drop in the trailing empty space PAST the last pill → dragged item lands last", async () => {
    // Drag B (a middle pill). Drop far to the right of D (x=400, past 340).
    const out = await dragToDeadZone({
      initial: ["A", "B", "C", "D"],
      drag: "B",
      dropX: 400,
    });
    // non-dragged [A,C,D]; coord past all 3 midpoints → insert at end.
    expect(out).toEqual(["A", "C", "D", "B"]);
  });

  it("drop in a between-pills GAP commits to that gap", async () => {
    // Drag B. Drop in the gap between C and D (x=270, in 240..300 — no pill).
    const out = await dragToDeadZone({
      initial: ["A", "B", "C", "D"],
      drag: "B",
      dropX: 270,
    });
    // non-dragged [A,C,D] mids 20/220/320; count < 270 = 2 → [A,C,B,D].
    expect(out).toEqual(["A", "C", "B", "D"]);
  });

  it("drop in the gap before the first pill / label area → lands first", async () => {
    // Drag C. Drop at x=-5 (left of everything, e.g. the label area).
    const out = await dragToDeadZone({
      initial: ["A", "B", "C", "D"],
      drag: "C",
      dropX: -5,
    });
    expect(out).toEqual(["C", "A", "B", "D"]);
  });
});
