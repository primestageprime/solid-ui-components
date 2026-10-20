import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { LogLineList } from "./LogLineList";

type Line = { id: string; at: string; msg: string };
const rows: Line[] = [
  { id: "1", at: "12:00:01", msg: "started" },
  { id: "2", at: "12:00:09", msg: "a very long line of text that must not push the panel wider than it is" },
];

describe("LogLineList", () => {
  it("renders a fixed time column and an ellipsis text column", () => {
    const { container, getByText } = render(() => (
      <LogLineList rows={rows} timeOf={(r) => r.at} textOf={(r) => r.msg} />
    ));
    expect(getByText("12:00:01")).toBeTruthy();
    expect(container.querySelector(".hud-table--fixed")).not.toBeNull();
    expect(container.querySelectorAll("tbody tr").length).toBe(2);
  });

  it("shows the empty state", () => {
    const { getByText } = render(() => (
      <LogLineList rows={[] as Line[]} timeOf={(r) => r.at} textOf={(r) => r.msg} emptyLabel="Nothing logged" />
    ));
    expect(getByText("Nothing logged")).toBeTruthy();
  });

  it("with a title it carries the section count", () => {
    const { getByText } = render(() => (
      <LogLineList rows={rows} timeOf={(r) => r.at} textOf={(r) => r.msg} title="Output" />
    ));
    expect(getByText("Output")).toBeTruthy();
    expect(getByText(/2 lines/)).toBeTruthy();
  });

  it("selects a row by id", () => {
    const onSelect = vi.fn();
    const { getByText, container } = render(() => (
      <LogLineList rows={rows} timeOf={(r) => r.at} textOf={(r) => r.msg} selectedId="2" onSelect={onSelect} />
    ));
    expect(container.querySelector("tr[aria-selected='true']")).not.toBeNull();
    fireEvent.click(getByText("started"));
    expect(onSelect).toHaveBeenCalledWith("1");
  });
});
