import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { GhostRow, IndentedGhostRow, createGhostRow } from "./GhostRow";

describe("GhostRow", () => {
  it("renders dimmed base row; selected flips the modifier", () => {
    const { container } = render(() => (
      <>
        <GhostRow>plain</GhostRow>
        <GhostRow selected>chosen</GhostRow>
      </>
    ));
    const rows = container.querySelectorAll(".sui-ghost-row");
    expect(rows.length).toBe(2);
    expect(rows[0].classList.contains("sui-ghost-row--selected")).toBe(false);
    expect(rows[1].classList.contains("sui-ghost-row--selected")).toBe(true);
  });

  it("clickable only when onClick is wired; click fires", () => {
    const onClick = vi.fn();
    const { container } = render(() => (
      <>
        <GhostRow onClick={onClick}>go</GhostRow>
        <GhostRow>inert</GhostRow>
      </>
    ));
    const rows = container.querySelectorAll(".sui-ghost-row");
    expect(rows[0].classList.contains("sui-ghost-row--clickable")).toBe(true);
    expect(rows[1].classList.contains("sui-ghost-row--clickable")).toBe(false);
    fireEvent.click(rows[0]);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("IndentedGhostRow bakes the indent Override; data props pass through", () => {
    const { container } = render(() => (
      <IndentedGhostRow selected>child</IndentedGhostRow>
    ));
    const row = container.querySelector(".sui-ghost-row")!;
    expect(row.classList.contains("sui-ghost-row--indent")).toBe(true);
    expect(row.classList.contains("sui-ghost-row--selected")).toBe(true);
  });

  it("createGhostRow merges defaults without clobbering call-site data", () => {
    const Curried = createGhostRow({ indent: true, class: "my-rail-row" });
    const { container } = render(() => <Curried>x</Curried>);
    const row = container.querySelector(".sui-ghost-row")!;
    expect(row.classList.contains("sui-ghost-row--indent")).toBe(true);
    expect(row.classList.contains("my-rail-row")).toBe(true);
  });
});
