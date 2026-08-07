import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { MutableList } from "./MutableList";
import {
  makeDataTransfer,
  fireDrag,
  flush,
  installRects,
  verticalRows,
} from "../../test-utils";

// Geometry is installed per-test and torn down here. `verticalRows` keys each
// rect to the row's `data-dnd-id` rather than its DOM position, so the geometry
// follows a node through the preview reflow — the hit test MutableList inherits
// from SortableList assumes that.
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
    // TOP half of C → drop BEFORE C. The top half is what makes the installed
    // geometry load-bearing: with jsdom's all-zero rects every midpoint is 0, so
    // any positive clientY reads as "past everything" and a bottom-half drop
    // would commit ["b","c","a"] whether the rects were installed or not.
    const y = 200 + 100 * 0.25;
    fireDrag(rowC, "dragover", { clientX: 0, clientY: y, dataTransfer: dt });
    fireDrag(rowC, "drop", { clientX: 0, clientY: y, dataTransfer: dt });

    expect(onReorder).toHaveBeenCalled();
    expect(onReorder.mock.calls.at(-1)![0]).toEqual(["b", "a", "c"]);
  });
});
