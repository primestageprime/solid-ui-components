import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ListItem, ScrollList, createList } from "./List";

describe("List", () => {
  it("createList renders a <ul> with baked modifier classes", () => {
    const List = createList({ variant: "menu", dividers: true, compact: true });
    const { container } = render(() => (
      <List>
        <li>a</li>
      </List>
    ));
    const root = container.querySelector("ul.sui-list")!;
    expect(root).toBeTruthy();
    expect(root.classList.contains("sui-list--menu")).toBe(true);
    expect(root.classList.contains("sui-list--dividers")).toBe(true);
    expect(root.classList.contains("sui-list--compact")).toBe(true);
  });

  it("ScrollList bakes the scroll override", () => {
    const { container } = render(() => (
      <ScrollList>
        <li>a</li>
      </ScrollList>
    ));
    const root = container.querySelector("ul.sui-list")!;
    expect(root.classList.contains("sui-list--scroll")).toBe(true);
  });
});

describe("ListItem", () => {
  it("renders content and secondary text", () => {
    const { container } = render(() => (
      <ListItem secondary="sub">Primary</ListItem>
    ));
    const item = container.querySelector("li.sui-list-item")!;
    expect(item.querySelector(".sui-list-item__text")!.textContent).toBe(
      "Primary",
    );
    expect(item.querySelector(".sui-list-item__secondary")!.textContent).toBe(
      "sub",
    );
  });

  it("renders status dot and status modifier when status is set", () => {
    const { container } = render(() => (
      <ListItem status="error">bad</ListItem>
    ));
    const item = container.querySelector("li.sui-list-item")!;
    expect(item.classList.contains("sui-list-item--status-error")).toBe(true);
    expect(item.querySelector(".sui-list-item__status")).toBeTruthy();
  });

  it("flips interactive and selected modifiers", () => {
    const { container } = render(() => (
      <ListItem interactive selected>
        x
      </ListItem>
    ));
    const item = container.querySelector("li.sui-list-item")!;
    expect(item.classList.contains("sui-list-item--interactive")).toBe(true);
    expect(item.classList.contains("sui-list-item--selected")).toBe(true);
  });

  it("omits the status dot when no status is given", () => {
    const { container } = render(() => <ListItem>plain</ListItem>);
    expect(container.querySelector(".sui-list-item__status")).toBeNull();
  });
});
