import { describe, it, expect, vi, afterEach } from "vitest";
import { createSignal } from "solid-js";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { ActionList } from "./index";
import type { ActionListAction, ActionListItemData } from "./index";

afterEach(cleanup);

const items: ActionListItemData[] = [
  { id: "a", name: "first task", status: "DONE" },
  { id: "b", name: "second task", status: "DOING" },
  { id: "c", name: "third task", status: "TODO" },
];

const STATUS_OPTIONS = ["TODO", "DOING", "DONE"];
/** A row's outer element (the non-interactive click surface). */
const row = (container: HTMLElement, i: number) =>
  container.querySelectorAll<HTMLElement>(".sui-action-list-item")[i];

describe("ActionList", () => {
  it("renders every item as a row", () => {
    const { getByText } = render(() => <ActionList items={items} />);
    expect(getByText("first task")).toBeTruthy();
    expect(getByText("second task")).toBeTruthy();
    expect(getByText("third task")).toBeTruthy();
  });

  it("maps the default tones (DONE→dim, DOING→highlight, else neutral)", () => {
    const { container } = render(() => <ActionList items={items} />);
    const rows = container.querySelectorAll(".sui-action-list-item");
    expect(rows[0].className).toMatch(/--dim/); // DONE
    expect(rows[1].className).toMatch(/--highlight/); // DOING
    expect(rows[2].className).not.toMatch(/--(dim|highlight)/); // TODO → neutral
  });

  it("fires onDelete with the row id when the × cap is clicked", () => {
    const onDelete = vi.fn();
    const { getByLabelText } = render(() => (
      <ActionList items={items} onDelete={onDelete} />
    ));
    fireEvent.click(getByLabelText("Dismiss second task"));
    expect(onDelete).toHaveBeenCalledWith("b");
  });

  it("omits the × cap when onDelete is not provided", () => {
    const { queryByLabelText } = render(() => <ActionList items={items} />);
    expect(queryByLabelText("Dismiss first task")).toBeNull();
  });

  it("with confirmDelete, arms on the first click and only deletes on the second", () => {
    const onDelete = vi.fn();
    const { getByLabelText, queryByLabelText } = render(() => (
      <ActionList items={items} onDelete={onDelete} confirmDelete />
    ));
    // First click arms rather than deletes — the cap re-labels to "Confirm".
    fireEvent.click(getByLabelText("Dismiss second task"));
    expect(onDelete).not.toHaveBeenCalled();
    expect(queryByLabelText("Dismiss second task")).toBeNull();
    // Second click on the now-armed cap confirms.
    fireEvent.click(getByLabelText("Confirm delete second task"));
    expect(onDelete).toHaveBeenCalledWith("b");
  });

  it("with confirmDelete, cancels the arm when the pointer leaves the row", () => {
    const onDelete = vi.fn();
    const { getByLabelText, queryByLabelText, container } = render(() => (
      <ActionList items={items} onDelete={onDelete} confirmDelete />
    ));
    fireEvent.click(getByLabelText("Dismiss second task"));
    expect(getByLabelText("Confirm delete second task")).toBeTruthy();
    fireEvent.mouseLeave(row(container, 1));
    // Back to the disarmed cap; nothing deleted.
    expect(getByLabelText("Dismiss second task")).toBeTruthy();
    expect(queryByLabelText("Confirm delete second task")).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe("ActionList — multi-select", () => {
  const claim: ActionListAction = { hotkey: "c", label: "claim", onApply: vi.fn() };
  const actions = () => [{ ...claim, onApply: vi.fn() }];

  it("is inert (no selection) until `actions` is provided", () => {
    const { container } = render(() => <ActionList items={items} />);
    fireEvent.click(row(container, 0));
    expect(row(container, 0).className).not.toMatch(/--selected/);
    expect(row(container, 0).getAttribute("aria-selected")).toBeNull();
  });

  it("toggles a row's selection when its non-interactive area is clicked", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(() => (
      <ActionList items={items} actions={actions()} onSelectionChange={onSelectionChange} />
    ));
    fireEvent.click(row(container, 1));
    expect(row(container, 1).className).toMatch(/--selected/);
    expect(row(container, 1).getAttribute("aria-selected")).toBe("true");
    expect(onSelectionChange).toHaveBeenLastCalledWith(["b"], {
      kind: "toggle",
      clickedId: "b",
      shiftKey: false,
    });

    fireEvent.click(row(container, 1));
    expect(row(container, 1).className).not.toMatch(/--selected/);
    expect(onSelectionChange).toHaveBeenLastCalledWith([], {
      kind: "toggle",
      clickedId: "b",
      shiftKey: false,
    });
  });

  it("does NOT toggle when an inner control is clicked", () => {
    const onSelectionChange = vi.fn();
    const { container, getByLabelText } = render(() => (
      <ActionList
        items={items}
        statusOptions={STATUS_OPTIONS}
        actions={actions()}
        onRename={() => {}}
        onDelete={() => {}}
        onStatusChange={() => {}}
        onSelectionChange={onSelectionChange}
      />
    ));
    // Title edit button, status chip text/caret, and the dismiss × are all
    // <button>s — clicking any of them must not select the row.
    fireEvent.click(getByLabelText("Rename first task"));
    fireEvent.click(getByLabelText("Edit status of first task"));
    fireEvent.click(getByLabelText("Select status of first task"));
    fireEvent.click(getByLabelText("Dismiss first task"));
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(container.querySelector(".sui-action-list-item--selected")).toBeNull();
  });

  it("shows the actions bar only while the selection is non-empty", () => {
    const { container, queryByRole } = render(() => (
      <ActionList items={items} actions={actions()} />
    ));
    expect(queryByRole("toolbar")).toBeNull();
    fireEvent.click(row(container, 0));
    expect(queryByRole("toolbar")).toBeTruthy();
  });

  it("Escape clears the selection", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(() => (
      <ActionList items={items} actions={actions()} onSelectionChange={onSelectionChange} />
    ));
    fireEvent.click(row(container, 0));
    fireEvent.click(row(container, 2));
    expect(container.querySelectorAll(".sui-action-list-item--selected").length).toBe(2);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector(".sui-action-list-item--selected")).toBeNull();
    expect(onSelectionChange).toHaveBeenLastCalledWith([], { kind: "clear" });
  });

  it("applies an action to the selected ids when its button is clicked, then clears", () => {
    const onApply = vi.fn();
    const { container, getByText } = render(() => (
      <ActionList items={items} actions={[{ hotkey: "c", label: "claim", onApply }]} />
    ));
    fireEvent.click(row(container, 0));
    fireEvent.click(row(container, 2));
    fireEvent.click(getByText("laim")); // the "c" is a separate emphasized span
    expect(onApply).toHaveBeenCalledWith(["a", "c"]);
    // Selection cleared after applying — bar gone.
    expect(container.querySelector(".sui-action-list-item--selected")).toBeNull();
  });

  it("applies an action via its bracketed hotkey", () => {
    const onApply = vi.fn();
    const { container } = render(() => (
      <ActionList items={items} actions={[{ hotkey: "c", label: "claim", onApply }]} />
    ));
    fireEvent.click(row(container, 1));
    fireEvent.keyDown(document, { key: "c" });
    expect(onApply).toHaveBeenCalledWith(["b"]);
  });

  it("prunes a selected id when its row leaves the list", () => {
    const onSelectionChange = vi.fn();
    const [its, setIts] = createSignal(items);
    const { container } = render(() => (
      <ActionList items={its()} actions={actions()} onSelectionChange={onSelectionChange} />
    ));
    fireEvent.click(row(container, 0)); // select "a"
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a"], {
      kind: "toggle",
      clickedId: "a",
      shiftKey: false,
    });
    setIts(items.filter((i) => i.id !== "a")); // remove the selected row
    // A prune is not a user gesture — it emits no meta.
    expect(onSelectionChange).toHaveBeenLastCalledWith([], undefined);
  });
});

describe("ActionList — shift-click range", () => {
  const actions = () => [{ hotkey: "c", label: "claim", onApply: vi.fn() }];

  it("range-selects the contiguous span from the anchor (last plain click)", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(() => (
      <ActionList items={items} actions={actions()} onSelectionChange={onSelectionChange} />
    ));
    fireEvent.click(row(container, 0)); // anchor "a", selected
    fireEvent.click(row(container, 2), { shiftKey: true }); // shift → span a..c
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a", "b", "c"], {
      kind: "range",
      clickedId: "c",
      shiftKey: true,
    });
    expect(container.querySelectorAll(".sui-action-list-item--selected").length).toBe(3);
  });

  it("range-DEselects the span when the anchor is currently deselected", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(() => (
      <ActionList items={items} actions={actions()} onSelectionChange={onSelectionChange} />
    ));
    fireEvent.click(row(container, 0)); // anchor "a" selected → ["a"]
    fireEvent.click(row(container, 2), { shiftKey: true }); // span → ["a","b","c"]
    fireEvent.click(row(container, 0)); // plain toggle "a" off → ["b","c"], anchor "a" now off
    fireEvent.click(row(container, 2), { shiftKey: true }); // span a..c, anchor off → drop all
    expect(onSelectionChange).toHaveBeenLastCalledWith([], {
      kind: "range",
      clickedId: "c",
      shiftKey: true,
    });
    expect(container.querySelector(".sui-action-list-item--selected")).toBeNull();
  });

  it("falls back to a plain toggle with no usable anchor", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(() => (
      <ActionList items={items} actions={actions()} onSelectionChange={onSelectionChange} />
    ));
    // First interaction is a shift-click — no anchor yet, so it toggles just "b".
    // The meta stays honest: kind "toggle" (it degraded) but shiftKey true.
    fireEvent.click(row(container, 1), { shiftKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith(["b"], {
      kind: "toggle",
      clickedId: "b",
      shiftKey: true,
    });
    expect(container.querySelectorAll(".sui-action-list-item--selected").length).toBe(1);
  });
});

describe("ActionList — controlled selection", () => {
  const actions = () => [{ hotkey: "c", label: "claim", onApply: vi.fn() }];

  it("renders exactly the passed ids and ignores internal toggles", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(() => (
      <ActionList
        items={items}
        selectedIds={["b"]}
        actions={actions()}
        onSelectionChange={onSelectionChange}
      />
    ));
    // DOM reflects only the prop.
    expect(row(container, 1).className).toMatch(/--selected/);
    expect(row(container, 0).className).not.toMatch(/--selected/);

    // Clicking emits an intent but does NOT mutate the rendered selection.
    fireEvent.click(row(container, 0));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["b", "a"], {
      kind: "toggle",
      clickedId: "a",
      shiftKey: false,
    });
    expect(row(container, 0).className).not.toMatch(/--selected/); // still ignored
    expect(row(container, 1).className).toMatch(/--selected/); // still from prop
  });

  it("emits [] on Escape without mutating internal state", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(() => (
      <ActionList items={items} selectedIds={["a", "c"]} onSelectionChange={onSelectionChange} />
    ));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onSelectionChange).toHaveBeenLastCalledWith([], { kind: "clear" });
    // Still rendering the prop (parent hasn't honoured the intent).
    expect(container.querySelectorAll(".sui-action-list-item--selected").length).toBe(2);
  });

  it("round-trips when the parent honours the emitted intent (incl. shift-range)", () => {
    const [sel, setSel] = createSignal<string[]>([]);
    const { container } = render(() => (
      <ActionList items={items} actions={actions()} selectedIds={sel()} onSelectionChange={setSel} />
    ));
    fireEvent.click(row(container, 0)); // parent stores ["a"]
    expect(row(container, 0).className).toMatch(/--selected/);
    fireEvent.click(row(container, 2), { shiftKey: true }); // range a..c
    expect(sel()).toEqual(["a", "b", "c"]);
    expect(container.querySelectorAll(".sui-action-list-item--selected").length).toBe(3);
  });

  it("does not auto-prune a controlled selection when items change", () => {
    const onSelectionChange = vi.fn();
    const [its, setIts] = createSignal(items);
    render(() => (
      <ActionList items={its()} selectedIds={["a"]} onSelectionChange={onSelectionChange} />
    ));
    setIts(items.filter((i) => i.id !== "a")); // remove the selected row
    // Controlled mode never mutates on its own — no prune intent is emitted.
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

describe("ActionList — clearSelectionOnApply", () => {
  it("keeps the selection after an action when clearSelectionOnApply is false", () => {
    const onApply = vi.fn();
    const { container, queryByRole } = render(() => (
      <ActionList
        items={items}
        clearSelectionOnApply={false}
        actions={[{ hotkey: "c", label: "claim", onApply }]}
      />
    ));
    fireEvent.click(row(container, 0));
    fireEvent.click(row(container, 2));
    fireEvent.keyDown(document, { key: "c" }); // apply via hotkey
    expect(onApply).toHaveBeenCalledWith(["a", "c"]);
    // Selection kept — rows still selected, bar still present.
    expect(container.querySelectorAll(".sui-action-list-item--selected").length).toBe(2);
    expect(queryByRole("toolbar")).toBeTruthy();
  });
});

describe("ActionList — selection meta (apply) & single-arg back-compat", () => {
  it("emits an { kind: 'apply' } meta after an action clears the selection", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(() => (
      <ActionList
        items={items}
        actions={[{ hotkey: "c", label: "claim", onApply: vi.fn() }]}
        onSelectionChange={onSelectionChange}
      />
    ));
    fireEvent.click(row(container, 0)); // select "a"
    fireEvent.keyDown(document, { key: "c" }); // apply → clears
    expect(onSelectionChange).toHaveBeenLastCalledWith([], { kind: "apply" });
  });

  it("still works for a single-arg onSelectionChange consumer (ignores the meta)", () => {
    // A consumer whose callback only accepts the id set — the second arg is
    // simply dropped, proving the added meta is backward compatible.
    let seen: string[] | undefined;
    const singleArg = (ids: string[]) => {
      seen = ids;
    };
    const { container } = render(() => (
      <ActionList
        items={items}
        actions={[{ hotkey: "c", label: "claim", onApply: vi.fn() }]}
        onSelectionChange={singleArg}
      />
    ));
    fireEvent.click(row(container, 1));
    expect(seen).toEqual(["b"]);
  });
});

describe("ActionList — rangeSelectMode='replace'", () => {
  const actions = () => [{ hotkey: "c", label: "claim", onApply: vi.fn() }];

  it("shift-click yields exactly the [anchor..click] span, discarding outside ids", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(() => (
      <ActionList
        items={items}
        actions={actions()}
        rangeSelectMode="replace"
        onSelectionChange={onSelectionChange}
      />
    ));
    fireEvent.click(row(container, 2)); // select "c" (outside the coming span)
    fireEvent.click(row(container, 0)); // anchor "a"
    fireEvent.click(row(container, 1), { shiftKey: true }); // span a..b → replace
    // "c" is discarded — the selection is exactly the span.
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a", "b"], {
      kind: "range",
      clickedId: "b",
      shiftKey: true,
    });
    expect(container.querySelectorAll(".sui-action-list-item--selected").length).toBe(2);
    expect(row(container, 2).className).not.toMatch(/--selected/); // "c" dropped
  });

  it("works in controlled mode too (parent honours the replace intent)", () => {
    const [sel, setSel] = createSignal<string[]>(["c"]);
    const { container } = render(() => (
      <ActionList
        items={items}
        actions={actions()}
        rangeSelectMode="replace"
        selectedIds={sel()}
        onSelectionChange={setSel}
      />
    ));
    fireEvent.click(row(container, 0)); // anchor "a" → parent stores ["c","a"]
    fireEvent.click(row(container, 1), { shiftKey: true }); // span a..b replaces all
    expect(sel()).toEqual(["a", "b"]);
    expect(container.querySelectorAll(".sui-action-list-item--selected").length).toBe(2);
  });
});

describe("ActionList — multi-assignee", () => {
  it("renders a roster of assignee glyphs from `assignees`", () => {
    const roster: ActionListItemData[] = [
      {
        id: "a",
        name: "team task",
        assignees: [
          { initials: "P", kind: "person" },
          { initials: "AI", kind: "ai" },
        ],
      },
    ];
    const { container } = render(() => <ActionList items={roster} />);
    expect(container.querySelectorAll(".sui-assignee-icon").length).toBe(2);
  });

  it("lets plural `assignees` win over singular `assignee`", () => {
    const both: ActionListItemData[] = [
      {
        id: "a",
        name: "task",
        assignee: { initials: "Z", kind: "person" },
        assignees: [
          { initials: "P", kind: "person" },
          { initials: "AI", kind: "ai" },
        ],
      },
    ];
    const { container, queryByTitle } = render(() => <ActionList items={both} />);
    expect(container.querySelectorAll(".sui-assignee-icon").length).toBe(2);
    expect(queryByTitle("Z")).toBeNull(); // the singular assignee is not rendered
  });
});

describe("ActionList — editTrigger", () => {
  const actions = () => [{ hotkey: "c", label: "claim", onApply: vi.fn() }];

  it("singleClick (default): a click on the title edits and does NOT select", () => {
    const onSelectionChange = vi.fn();
    const { getByText, container } = render(() => (
      <ActionList
        items={items}
        actions={actions()}
        onRename={() => {}}
        onSelectionChange={onSelectionChange}
      />
    ));
    fireEvent.click(getByText("first task"));
    expect(container.querySelector("input")).toBeTruthy(); // inline editor open
    expect(onSelectionChange).not.toHaveBeenCalled(); // title click excluded from selection
  });

  it("doubleClick: a single click on the title selects the row and does NOT edit", () => {
    const onSelectionChange = vi.fn();
    const { getByText, container } = render(() => (
      <ActionList
        items={items}
        actions={actions()}
        onRename={() => {}}
        editTrigger="doubleClick"
        onSelectionChange={onSelectionChange}
      />
    ));
    fireEvent.click(getByText("first task"));
    expect(container.querySelector("input")).toBeNull(); // no editor
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a"], {
      kind: "toggle",
      clickedId: "a",
      shiftKey: false,
    });
    expect(row(container, 0).className).toMatch(/--selected/);
  });

  it("doubleClick: a double click on the title opens the inline editor", () => {
    const { getByText, container } = render(() => (
      <ActionList
        items={items}
        actions={actions()}
        onRename={() => {}}
        editTrigger="doubleClick"
      />
    ));
    fireEvent.dblClick(getByText("first task"));
    expect(container.querySelector("input")).toBeTruthy();
  });
});

describe("ActionList — onOpen", () => {
  it("renders no open button when onOpen is absent", () => {
    const { queryByLabelText } = render(() => <ActionList items={items} />);
    expect(queryByLabelText("Open")).toBeNull();
  });

  it("fires onOpen with the row id and does not toggle selection", () => {
    const onOpen = vi.fn();
    const onSelectionChange = vi.fn();
    const { container, getAllByLabelText } = render(() => (
      <ActionList
        items={items}
        actions={[{ hotkey: "c", label: "claim", onApply: vi.fn() }]}
        onOpen={onOpen}
        onSelectionChange={onSelectionChange}
      />
    ));
    const openButtons = getAllByLabelText("Open");
    expect(openButtons.length).toBe(items.length);
    fireEvent.click(openButtons[1]); // the "b" row
    expect(onOpen).toHaveBeenCalledWith("b");
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(container.querySelector(".sui-action-list-item--selected")).toBeNull();
  });
});

describe("ActionList — onTagClick", () => {
  const tagged: ActionListItemData[] = [
    { id: "a", name: "first", tags: [{ label: "acme:apollo", active: true }] },
    { id: "b", name: "second", tags: [{ label: "primestage" }] },
  ];
  const actions = () => [{ hotkey: "c", label: "claim", onApply: vi.fn() }];

  it("makes tags inert (plain pills) when onTagClick is absent", () => {
    const { container } = render(() => <ActionList items={tagged} />);
    expect(container.querySelector(".sui-action-list-item__tag")).toBeNull();
    expect(container.querySelector(".sui-tag-pill")).toBeTruthy();
  });

  it("fires onTagClick with the item + tag and does NOT toggle the row", () => {
    const onTagClick = vi.fn();
    const onSelectionChange = vi.fn();
    const { container } = render(() => (
      <ActionList
        items={tagged}
        actions={actions()}
        onTagClick={onTagClick}
        onSelectionChange={onSelectionChange}
      />
    ));
    const tagBtn = row(container, 0).querySelector<HTMLElement>(".sui-action-list-item__tag");
    fireEvent.click(tagBtn!);
    expect(onTagClick).toHaveBeenCalledWith(tagged[0], tagged[0].tags![0]);
    expect(onSelectionChange).not.toHaveBeenCalled(); // selection never toggled
    expect(container.querySelector(".sui-action-list-item--selected")).toBeNull();
  });
});
