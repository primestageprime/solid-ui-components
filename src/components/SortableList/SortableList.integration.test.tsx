import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SortableList } from "./SortableList";
import {
  makeDataTransfer,
  fireDrag,
  flush,
  installRects,
  verticalRows,
} from "../../test-utils";

// Rect geometry is installed per-test and torn down here. `verticalRows` keys
// each rect to the row's `data-dnd-id` rather than its DOM position, so the
// geometry follows a node through the preview reflow — SortableList's hit test
// assumes that.
let restoreRects: (() => void) | undefined;
const installVerticalLayout = (ids: string[]) => {
  restoreRects = installRects(verticalRows(ids));
};

afterEach(() => {
  cleanup();
  restoreRects?.();
  restoreRects = undefined;
  vi.restoreAllMocks();
});

interface Task {
  id: string;
  title: string;
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
