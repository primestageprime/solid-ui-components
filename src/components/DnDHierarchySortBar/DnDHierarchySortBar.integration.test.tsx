import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { DnDHierarchySortBar } from "./DnDHierarchySortBar";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── Fake DnD plumbing ───────────────────────────────────────────────────────
// jsdom has no DataTransfer/DragEvent; build a minimal stand-in.
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

function fireDrag(
  el: Element,
  type: string,
  opts: { clientX?: number; clientY?: number; dataTransfer: ReturnType<typeof makeDataTransfer> },
) {
  const ev: any = new Event(type, { bubbles: true, cancelable: true });
  ev.clientX = opts.clientX ?? 0;
  ev.clientY = opts.clientY ?? 0;
  ev.dataTransfer = opts.dataTransfer;
  el.dispatchEvent(ev);
  return ev;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

// Layout: single row, each pill 40px wide, 8px gap → pitch 48. Height 24.
// We key geometry by the pill's text label so it follows the node through reflow.
function installLayout(labels: string[]) {
  const PITCH = 48;
  const W = 40;
  const xByLabel = new Map<string, number>();
  labels.forEach((l, i) => xByLabel.set(l, i * PITCH));
  const orig = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element,
  ) {
    const txt = (this.textContent ?? "").replace(/[⋮\s]/g, "");
    if (xByLabel.has(txt)) {
      const left = xByLabel.get(txt)!;
      return { left, top: 0, width: W, height: 24, right: left + W, bottom: 24, x: left, y: 0, toJSON() {} } as DOMRect;
    }
    return orig.call(this);
  });
}

function findPill(container: HTMLElement, label: string): HTMLElement {
  const pills = Array.from(
    container.querySelectorAll(".sui-dnd-hierarchy-sort-bar__pill"),
  ) as HTMLElement[];
  const hit = pills.find(
    (p) => (p.textContent ?? "").replace(/[⋮\s]/g, "") === label,
  );
  if (!hit) throw new Error(`pill ${label} not found`);
  return hit;
}

interface Case {
  name: string;
  initial: string[];
  drag: string;
  over: string;
  // cursor X relative to the OVER pill: "before" = left half, "after" = right half
  half: "before" | "after";
  expected: string[];
}

const cases: Case[] = [
  {
    name: "drag A right, after C → A lands after C",
    initial: ["A", "B", "C", "D"],
    drag: "A",
    over: "C",
    half: "after",
    expected: ["B", "C", "A", "D"],
  },
  {
    name: "drag D left, before B → D lands before B",
    initial: ["A", "B", "C", "D"],
    drag: "D",
    over: "B",
    half: "before",
    expected: ["A", "D", "B", "C"],
  },
  {
    name: "drag A right, before B → no-op (A stays first)",
    initial: ["A", "B", "C", "D"],
    drag: "A",
    over: "B",
    half: "before",
    expected: ["A", "B", "C", "D"],
  },
  {
    name: "drag B left, before A → B to front",
    initial: ["A", "B", "C", "D"],
    drag: "B",
    over: "A",
    half: "before",
    expected: ["B", "A", "C", "D"],
  },
];

describe("DnDHierarchySortBar — placeholder matches the source pill's size (bug 1)", () => {
  it("applies BOTH width and height from the captured drag size, border-box", async () => {
    installLayout(["A", "B", "C"]); // mocked source rect: 40 x 24
    const [items] = createSignal([
      { id: "A", label: "A" },
      { id: "B", label: "B" },
      { id: "C", label: "C" },
    ]);
    const { container } = render(() => (
      <DnDHierarchySortBar items={items()} onReorder={() => {}} />
    ));
    const root = container as HTMLElement;
    const dt = makeDataTransfer();
    const src = findPill(root, "A");
    fireDrag(src, "dragstart", { clientX: 0, clientY: 12, dataTransfer: dt });
    await flush();

    const ph = root.querySelector(
      ".sui-dnd-hierarchy-sort-bar__placeholder",
    ) as HTMLElement;
    expect(ph).toBeTruthy();
    // Source pill rect was 40 x 24 → placeholder must reserve the same box.
    expect(ph.style.width).toBe("40px");
    expect(ph.style.height).toBe("24px");
    expect(ph.style.boxSizing).toBe("border-box");
  });
});

describe("DnDHierarchySortBar integration — full drag drops at cursor intent", () => {
  for (const c of cases) {
    it(c.name, async () => {
      installLayout(c.initial);
      const [items, setItems] = createSignal(
        c.initial.map((id) => ({ id, label: id })),
      );
      const onReorder = vi.fn((ids: string[]) =>
        setItems(ids.map((id) => ({ id, label: id }))),
      );
      const { container } = render(() => (
        <DnDHierarchySortBar items={items()} onReorder={onReorder} />
      ));
      const root = container as HTMLElement;
      const dt = makeDataTransfer();

      // dragstart on the dragged pill
      const src = findPill(root, c.drag);
      fireDrag(src, "dragstart", { clientX: 0, clientY: 12, dataTransfer: dt });
      await flush(); // let the deferred setDragId run → placeholder takes over

      // dragover the target pill at the requested half
      const over = findPill(root, c.over);
      const rect = over.getBoundingClientRect();
      const x = c.half === "after" ? rect.left + rect.width * 0.75 : rect.left + rect.width * 0.25;
      fireDrag(over, "dragover", { clientX: x, clientY: 12, dataTransfer: dt });

      // drop on whatever element is now under the cursor (re-query target)
      const dropTarget = findPill(root, c.over);
      fireDrag(dropTarget, "drop", { clientX: x, clientY: 12, dataTransfer: dt });

      expect(onReorder).toHaveBeenCalled();
      const last = onReorder.mock.calls.at(-1)![0];
      expect(last).toEqual(c.expected);
    });
  }
});
