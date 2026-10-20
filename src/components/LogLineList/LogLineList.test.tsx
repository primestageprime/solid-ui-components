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

  it("formats an instant as the time of day by default, narrow-safe", () => {
    const at = new Date(2026, 9, 20, 14, 5, 9);
    const { getByText } = render(() => (
      <LogLineList rows={[{ id: "1", at: at.toISOString(), msg: "x" }]} instantOf={(r) => r.at} textOf={(r) => r.msg} locale="en-GB" />
    ));
    expect(getByText("14:05:09")).toBeTruthy();
  });

  it("date-time shows the date and widens the column; timeOf still wins", () => {
    const at = new Date(2026, 9, 20, 14, 5, 9);
    const { container, getByText } = render(() => (
      <LogLineList rows={[{ id: "1", at: at.toISOString(), msg: "x" }]} instantOf={(r) => r.at} timeFormat="date-time" textOf={(r) => r.msg} locale="en-GB" />
    ));
    expect(getByText(/20 Oct/)).toBeTruthy();
    expect(container.innerHTML).toContain("9rem");
    const pre = render(() => (
      <LogLineList rows={rows} timeOf={(r) => r.at} instantOf={() => 0} textOf={(r) => r.msg} />
    ));
    expect(pre.getByText("12:00:01")).toBeTruthy();
  });
});

describe("LogLineList plain", () => {
  it("draws a heading, no column headers, and wrapped time + text rows", () => {
    const { container, getByText, queryByText } = render(() => (
      <LogLineList variant="plain" rows={rows} timeOf={(r) => r.at} textOf={(r) => r.msg} title="Logs" />
    ));
    expect(getByText("Logs")).toBeTruthy();
    expect(queryByText("Time")).toBeNull();
    expect(queryByText(/2 lines/)).toBeNull();
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelectorAll(".sui-log-lines__row").length).toBe(2);
    expect(getByText("12:00:09")).toBeTruthy();
  });
  it("formats an instant without seconds in the minutes format", () => {
    const { getByText } = render(() => (
      <LogLineList variant="plain" rows={[{ id: "1", at: "2026-10-20T07:15:42", msg: "x" }]} instantOf={(r) => r.at} timeFormat="minutes" textOf={(r) => r.msg} />
    ));
    expect(getByText("07:15")).toBeTruthy();
  });
});
