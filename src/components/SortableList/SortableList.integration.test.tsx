import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SortableList } from "./SortableList";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── Fake DnD plumbing ───────────────────────────────────────────────────────
// jsdom has no DataTransfer/DragEvent; build a minimal stand-in (mirrors the
// DnDHierarchySortBar integration test).
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
  opts: {
    clientX?: number;
    clientY?: number;
    dataTransfer: ReturnType<typeof makeDataTransfer>;
  },
) {
  const ev: any = new Event(type, { bubbles: true, cancelable: true });
  ev.clientX = opts.clientX ?? 0;
  ev.clientY = opts.clientY ?? 0;
  ev.dataTransfer = opts.dataTransfer;
  el.dispatchEvent(ev);
  return ev;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

interface Task {
  id: string;
  title: string;
}

// Vertical layout: each row 100px tall, no gap → row i occupies [i*100, i*100+100).
// Geometry is keyed by the row's data-dnd-id so it follows the node through reflow.
function installVerticalLayout(ids: string[]) {
  const H = 100;
  const orig = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const id = (this as HTMLElement).getAttribute?.("data-dnd-id");
      if (id && ids.includes(id)) {
        const top = ids.indexOf(id) * H;
        return {
          left: 0,
          top,
          width: 300,
          height: H,
          right: 300,
          bottom: top + H,
          x: 0,
          y: top,
          toJSON() {},
        } as DOMRect;
      }
      return orig.call(this);
    },
  );
}

function findRow(container: HTMLElement, id: string): HTMLElement {
  const row = container.querySelector(
    `[data-dnd-id="${id}"]`,
  ) as HTMLElement | null;
  if (!row) throw new Error(`row ${id} not found`);
  return row;
}

const TASKS: Task[] = [
  { id: "a", title: "Alpha" },
  { id: "b", title: "Bravo" },
  { id: "c", title: "Charlie" },
  { id: "d", title: "Delta" },
];

describe("SortableList — row rendering", () => {
  it("renders a row per item via renderItem, in order", () => {
    const [tasks] = createSignal(TASKS);
    const { container } = render(() => (
      <SortableList
        items={tasks()}
        getId={(t) => t.id}
        onReorder={() => {}}
        renderItem={(t) => <span class="task-title">{t.title}</span>}
      />
    ));
    const titles = Array.from(container.querySelectorAll(".task-title")).map(
      (el) => el.textContent,
    );
    expect(titles).toEqual(["Alpha", "Bravo", "Charlie", "Delta"]);
  });
});

describe("SortableList — drag lifecycle", () => {
  it("shows a placeholder for the dragged row, sized to its captured height", async () => {
    installVerticalLayout(["a", "b", "c", "d"]);
    const [tasks] = createSignal(TASKS);
    const { container } = render(() => (
      <SortableList
        items={tasks()}
        getId={(t) => t.id}
        onReorder={() => {}}
        renderItem={(t) => <span>{t.title}</span>}
      />
    ));
    const root = container as HTMLElement;
    const dt = makeDataTransfer();

    fireDrag(findRow(root, "b"), "dragstart", {
      clientX: 0,
      clientY: 150,
      dataTransfer: dt,
    });
    await flush(); // let the deferred setDragId run → placeholder takes over

    const ph = root.querySelector(
      ".sui-sortable-list__placeholder",
    ) as HTMLElement;
    expect(ph).toBeTruthy();
    // The dragged row's slot is now the placeholder, carrying its id.
    expect(ph.getAttribute("data-dnd-id")).toBe("b");
    // Captured source-row height (100px) is applied border-box.
    expect(ph.style.height).toBe("100px");
    expect(ph.style.boxSizing).toBe("border-box");
  });
});

interface Case {
  name: string;
  drag: string;
  over: string;
  // cursor relative to the OVER row: "before" = top half, "after" = bottom half
  half: "before" | "after";
  expected: string[];
}

const cases: Case[] = [
  {
    name: "drag A down, after C → A lands after C",
    drag: "a",
    over: "c",
    half: "after",
    expected: ["b", "c", "a", "d"],
  },
  {
    name: "drag D up, before B → D lands before B",
    drag: "d",
    over: "b",
    half: "before",
    expected: ["a", "d", "b", "c"],
  },
  {
    name: "drag B up, before A → B to front",
    drag: "b",
    over: "a",
    half: "before",
    expected: ["b", "a", "c", "d"],
  },
];

describe("SortableList integration — full drag commits the reordered ids", () => {
  for (const c of cases) {
    it(c.name, async () => {
      installVerticalLayout(["a", "b", "c", "d"]);
      const [tasks, setTasks] = createSignal(TASKS);
      const onReorder = vi.fn((ids: string[]) =>
        setTasks(ids.map((id) => ({ id, title: id.toUpperCase() }))),
      );
      const { container } = render(() => (
        <SortableList
          items={tasks()}
          getId={(t) => t.id}
          onReorder={onReorder}
          renderItem={(t) => <span>{t.title}</span>}
        />
      ));
      const root = container as HTMLElement;
      const dt = makeDataTransfer();

      // dragstart on the dragged row
      fireDrag(findRow(root, c.drag), "dragstart", {
        clientX: 0,
        clientY: 0,
        dataTransfer: dt,
      });
      await flush(); // deferred setDragId → placeholder takes over

      // dragover the target row at the requested half (top vs bottom of its 100px box)
      const over = findRow(root, c.over);
      const rect = over.getBoundingClientRect();
      const y =
        c.half === "after"
          ? rect.top + rect.height * 0.75
          : rect.top + rect.height * 0.25;
      // Hit-testing lives on the container; dispatch dragover so it bubbles to it.
      fireDrag(over, "dragover", { clientX: 0, clientY: y, dataTransfer: dt });

      // drop commits the previewed order
      fireDrag(findRow(root, c.over), "drop", {
        clientX: 0,
        clientY: y,
        dataTransfer: dt,
      });

      expect(onReorder).toHaveBeenCalled();
      const last = onReorder.mock.calls.at(-1)![0];
      expect(last).toEqual(c.expected);
    });
  }
});
