import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { SearchInput } from "./SearchInput";
import { SearchField, showsClear } from "./SearchField";

afterEach(cleanup);

describe("showsClear", () => {
  it("prints when the clear button shows", () => {
    const cases: [boolean, unknown][] = [
      [true, "abc"],
      [true, ""],
      [true, undefined],
      [true, 0],
      [false, "abc"],
    ];
    expect(cases.map(([has, v]) => showsClear(has, v))).toEqual([true, false, false, true, false]);
  });
});

describe("SearchInput", () => {
  it("mounts a search glyph and an input with the placeholder", () => {
    const { container } = render(() => <SearchInput value="" placeholder="Search tasks" />);
    expect(container.querySelector("svg")).not.toBeNull();
    const input = container.querySelector("input")!;
    expect(input.getAttribute("placeholder")).toBe("Search tasks");
    expect(input.getAttribute("aria-label")).toBe("Search");
  });

  it("has no clear button when empty, and one while there is text", () => {
    const empty = render(() => <SearchInput value="" onClear={() => {}} />);
    expect(empty.container.querySelector('button[aria-label="Clear search"]')).toBeNull();
    cleanup();
    const full = render(() => <SearchInput value="abc" onClear={() => {}} />);
    expect(full.container.querySelector('button[aria-label="Clear search"]')).not.toBeNull();
  });

  it("calls onClear when the cross is pressed and gives focus back to the input", () => {
    const onClear = vi.fn();
    const { container } = render(() => <SearchInput value="abc" onClear={onClear} />);
    document.body.appendChild(container);
    fireEvent.click(container.querySelector('button[aria-label="Clear search"]')!);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(container.querySelector("input"));
  });

  it("passes input events through", () => {
    const onInput = vi.fn();
    const { container } = render(() => <SearchInput value="" onInput={onInput} />);
    fireEvent.input(container.querySelector("input")!, { target: { value: "x" } });
    expect(onInput).toHaveBeenCalledTimes(1);
  });
});

describe("SearchField", () => {
  it("renders its leading slot and no clear button without onClear", () => {
    const { container } = render(() => <SearchField value="abc" leading={<b>L</b>} />);
    expect(container.textContent).toBe("L");
    expect(container.querySelector("button")).toBeNull();
  });
});
