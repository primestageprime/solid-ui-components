import { fireEvent, render } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it } from "vitest";
import { GroupedSelector } from "./GroupedSelector";
import { defineListDetail, newId } from "../../listDetail";

// An invented entity: the selector names none of its fields.
type Bird = { id: string; name: string; zone: "pond" | "wood"; deleted?: boolean };
const birds = () =>
  defineListDetail({
    storageKey: "grouped-selector",
    collection: "birds",
    entity: { blank: (): Bird => ({ id: newId(), name: "", zone: "pond" }), textOf: (b) => b.name },
    groups: { order: ["pond", "wood"] as const, of: (b) => b.zone, title: { pond: "By the pond", wood: "In the wood" } },
    sorts: { order: ["added"] as const, default: "added", by: { added: () => 0 } },
    seed: [
      { id: "a", name: "heron", zone: "pond" },
      { id: "b", name: "duck", zone: "pond" },
      { id: "c", name: "owl", zone: "wood" },
    ] satisfies Bird[],
  });

beforeEach(() => localStorage.clear());

const mount = (kit = birds()) =>
  render(() => (
    <GroupedSelector kit={kit} renderItem={(b: Bird) => <span>{b.name}</span>} groupEmptyLabel="none" emptyLabel="no match" />
  ));

describe("GroupedSelector", () => {
  it("draws a titled group with its count and the items from kit.grouped()", () => {
    const { getByText } = mount();
    expect(getByText("By the pond")).toBeTruthy();
    expect(getByText("In the wood")).toBeTruthy();
    expect(getByText("heron")).toBeTruthy();
    expect(getByText("owl")).toBeTruthy();
  });

  it("marks the kit's selection and follows j and k (next, prev)", () => {
    const kit = birds();
    const { container } = mount(kit);
    const selected = () => container.querySelector('[aria-selected="true"]')?.getAttribute("data-item-id");
    expect(selected()).toBe("a");
    kit.actions.next();
    expect(selected()).toBe("b");
    kit.actions.prev();
    expect(selected()).toBe("a");
  });

  it("clicking an item selects it in the kit", () => {
    const kit = birds();
    const { getByText } = mount(kit);
    fireEvent.click(getByText("owl"));
    expect(kit.state.view.selectedId).toBe("c");
  });

  it("collapses through the kit and keeps the header and count", () => {
    const kit = birds();
    const { getByText, container } = mount(kit);
    kit.actions.toggleGroup("pond");
    expect(kit.state.view.collapsed).toEqual(["pond"]);
    expect(container.querySelectorAll(".sui-section--collapsed").length).toBe(1);
    expect(getByText("By the pond")).toBeTruthy();
    expect(container.querySelector('[aria-label="2 in By the pond"]')).not.toBeNull();
  });

  it("shows the empty label when a search matches nothing", () => {
    const kit = birds();
    const { getByText } = mount(kit);
    kit.actions.setSearch("zzz");
    expect(getByText("no match")).toBeTruthy();
  });
});
