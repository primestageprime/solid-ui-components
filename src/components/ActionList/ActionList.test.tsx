import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { ActionList } from "./index";
import type { ActionListItemData } from "./index";

afterEach(cleanup);

const items: ActionListItemData[] = [
  { id: "a", name: "first task", status: "DONE" },
  { id: "b", name: "second task", status: "DOING" },
  { id: "c", name: "third task", status: "TODO" },
];

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
