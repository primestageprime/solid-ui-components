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
    expect(onSelectionChange).toHaveBeenLastCalledWith(["b"]);

    fireEvent.click(row(container, 1));
    expect(row(container, 1).className).not.toMatch(/--selected/);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
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
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
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
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a"]);
    setIts(items.filter((i) => i.id !== "a")); // remove the selected row
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });
});
