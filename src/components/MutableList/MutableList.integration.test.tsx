import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { MutableList } from "./MutableList";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── Fake DnD plumbing (mirrors SortableList.integration.test.tsx) ────────────
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
  opts: {
    clientX?: number;
    clientY?: number;
    dataTransfer: ReturnType<typeof makeDataTransfer>;
  },
) {
  const ev = Object.assign(
    new Event(type, { bubbles: true, cancelable: true }),
    {
      clientX: opts.clientX ?? 0,
      clientY: opts.clientY ?? 0,
      dataTransfer: opts.dataTransfer,
    },
  );
  el.dispatchEvent(ev);
  return ev;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

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

interface Tag {
  id: string;
  name: string;
}

const TAGS: Tag[] = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Bravo" },
  { id: "c", name: "Charlie" },
];

function renderList(overrides?: {
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
  onReorder?: (ids: string[]) => void;
}) {
  const [tags, setTags] = createSignal(TAGS);
  const onRename = overrides?.onRename ?? vi.fn();
  const onDelete = overrides?.onDelete ?? vi.fn();
  const onReorder = overrides?.onReorder ?? vi.fn();
  const utils = render(() => (
    <MutableList
      items={tags()}
      getId={(t) => t.id}
      getName={(t) => t.name}
      onReorder={onReorder}
      onRename={onRename}
      onDelete={onDelete}
    />
  ));
  return { ...utils, setTags, onRename, onDelete, onReorder };
}

describe("MutableList — names", () => {
  it("renders each item's name", () => {
    const { getByText } = renderList();
    expect(getByText("Alpha")).toBeTruthy();
    expect(getByText("Bravo")).toBeTruthy();
    expect(getByText("Charlie")).toBeTruthy();
  });
});

describe("MutableList — inline rename", () => {
  it("click name → edit → Enter calls onRename with the new value", async () => {
    const onRename = vi.fn();
    const { getByText, container } = renderList({ onRename });

    fireEvent.click(getByText("Bravo"));
    const input = container.querySelector(
      ".sui-mutable-list__input",
    ) as HTMLInputElement;
    expect(input).toBeTruthy();

    fireEvent.input(input, { target: { value: "Bravissimo" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onRename).toHaveBeenCalledWith("b", "Bravissimo");
  });

  it("Escape reverts and does NOT call onRename", () => {
    const onRename = vi.fn();
    const { getByText, container } = renderList({ onRename });

    fireEvent.click(getByText("Alpha"));
    const input = container.querySelector(
      ".sui-mutable-list__input",
    ) as HTMLInputElement;
    fireEvent.input(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onRename).not.toHaveBeenCalled();
    // Editor closed, original name restored.
    expect(container.querySelector(".sui-mutable-list__input")).toBeNull();
    expect(getByText("Alpha")).toBeTruthy();
  });

  it("does not fire onRename when the value is unchanged", () => {
    const onRename = vi.fn();
    const { getByText, container } = renderList({ onRename });

    fireEvent.click(getByText("Charlie"));
    const input = container.querySelector(
      ".sui-mutable-list__input",
    ) as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRename).not.toHaveBeenCalled();
  });
});

describe("MutableList — delete", () => {
  it("delete button calls onDelete with the item id", () => {
    const onDelete = vi.fn();
    const { getByLabelText } = renderList({ onDelete });

    fireEvent.click(getByLabelText("Delete Bravo"));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("b");
  });
});

describe("MutableList — reorder smoke (drag inherited from SortableList)", () => {
  it("a full drag commits a reordered id array via onReorder", async () => {
    installVerticalLayout(["a", "b", "c"]);
    const onReorder = vi.fn();
    const { container } = renderList({ onReorder });
    const root = container as HTMLElement;
    const dt = makeDataTransfer();

    const rowA = root.querySelector('[data-dnd-id="a"]') as HTMLElement;
    fireDrag(rowA, "dragstart", { clientX: 0, clientY: 0, dataTransfer: dt });
    await flush();

    const rowC = root.querySelector('[data-dnd-id="c"]') as HTMLElement;
    const y = 200 + 100 * 0.75; // bottom half of C → drop after C
    fireDrag(rowC, "dragover", { clientX: 0, clientY: y, dataTransfer: dt });
    fireDrag(rowC, "drop", { clientX: 0, clientY: y, dataTransfer: dt });

    expect(onReorder).toHaveBeenCalled();
    expect(onReorder.mock.calls.at(-1)![0]).toEqual(["b", "c", "a"]);
  });
});
