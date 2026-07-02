import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { ActionListItem } from "./index";

afterEach(cleanup);

describe("ActionListItem", () => {
  it("renders the title, status chip, assignee and tags", () => {
    const { getByText, container } = render(() => (
      <ActionListItem
        title="deploy hover"
        status="DOING"
        assignee={{ initials: "P", kind: "person" }}
        tags={[{ label: "stax:jtf" }]}
      />
    ));
    expect(getByText("deploy hover")).toBeTruthy();
    expect(getByText("DOING")).toBeTruthy();
    expect(container.querySelector(".sui-assignee-icon")).toBeTruthy();
    expect(container.querySelector(".sui-tag-pill--split")).toBeTruthy();
  });

  it("maps tone to the row opacity class", () => {
    const { container } = render(() => <ActionListItem title="x" tone="highlight" />);
    expect(container.firstElementChild!.className).toMatch(/--highlight/);
  });

  it("shows the dismiss cap only when onDismiss is provided and fires it", () => {
    const onDismiss = vi.fn();
    const { getByLabelText } = render(() => (
      <ActionListItem title="task" onDismiss={onDismiss} />
    ));
    fireEvent.click(getByLabelText("Dismiss task"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("hides the dismiss cap without onDismiss", () => {
    const { queryByLabelText } = render(() => <ActionListItem title="task" />);
    expect(queryByLabelText("Dismiss task")).toBeNull();
  });
});
