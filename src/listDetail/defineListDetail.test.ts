import { beforeEach, describe, expect, it } from "vitest";
import { defineListDetail, newId, LIST_DETAIL_ACTION_OF, LIST_DETAIL_VERBS } from "./index";

// Two unrelated entities run through the same kit: the kit names neither.
type Task = { id: string; title: string; status: "todo" | "done"; deleted?: boolean };
type Contact = { id: string; name: string; org: "work" | "home" | "club"; age: number; deleted?: boolean };

type Hook = (t: Task, kit: { actions: { update: (id: string, p: Partial<Task>) => void } }) => void;
const tasks = (extra: { modalOpen?: () => boolean; closeModal?: () => void; open?: Hook; primary?: Hook } = {}) =>
  defineListDetail({
    storageKey: "kit-tasks",
    collection: "tasks",
    entity: { blank: (): Task => ({ id: newId(), title: "", status: "todo" }), textOf: (t) => t.title },
    groups: { order: ["todo", "done"] as const, of: (t) => t.status },
    sorts: { order: ["added", "title"] as const, default: "added", by: { added: () => 0, title: (a, b) => a.title.localeCompare(b.title) } },
    seed: [
      { id: "a", title: "write", status: "todo" },
      { id: "b", title: "ship", status: "todo" },
      { id: "c", title: "rest", status: "done" },
    ] satisfies Task[],
    undoers: { complete: (e, k) => k.actions.update(e.id, { status: e.prev as Task["status"] }) },
    ...extra,
  });

const contacts = () =>
  defineListDetail({
    storageKey: "kit-contacts",
    collection: "people",
    entity: { blank: (): Contact => ({ id: newId(), name: "", org: "work", age: 0 }), textOf: (c) => `${c.name} ${c.org}` },
    groups: { order: ["work", "home", "club"] as const, of: (c) => c.org },
    sorts: { order: ["age", "name", "added"] as const, default: "age", by: { age: (a, b) => a.age - b.age, name: (a, b) => a.name.localeCompare(b.name), added: () => 0 } },
    seed: [
      { id: "p", name: "Ada", org: "work", age: 36 },
      { id: "q", name: "Bo", org: "home", age: 20 },
      { id: "r", name: "Cy", org: "work", age: 28 },
      { id: "s", name: "Di", org: "club", age: 41 },
    ] satisfies Contact[],
    extra: { data: { note: "hi" } },
    searchId: "contact-search",
  });

beforeEach(() => localStorage.clear());

describe("defineListDetail with a task entity", () => {
  it("selects the first visible seed on a fresh load and walks j and k to the ends", () => {
    const k = tasks();
    expect(k.state.view.selectedId).toBe("a");
    k.actions.next();
    k.actions.next();
    k.actions.next();
    expect(k.state.view.selectedId).toBe("c");
    k.actions.prev();
    expect(k.state.view.selectedId).toBe("b");
  });

  it("create adds, selects, opens edit and clears the search; undo reverses it", () => {
    const k = tasks();
    k.actions.setSearch("zzz");
    k.actions.create();
    expect(k.state.view.search).toBe("");
    expect(k.live()).toHaveLength(4);
    expect(k.state.view.selectedId).toBe(k.state.data.tasks[3].id);
    expect(JSON.parse(k.dump()).chrome.editing).toBe(true);
    k.actions.undo();
    expect(k.live()).toHaveLength(3);
    expect(k.state.view.selectedId).toBeNull();
  });

  it("create unfolds its group so the new entity is never hidden", () => {
    const k = tasks();
    k.actions.toggleGroup("todo");
    expect(k.visibleIds()).toEqual(["c"]);
    k.actions.create();
    expect(k.visibleIds()).toContain(k.state.view.selectedId);
  });

  it("remove soft-deletes, selects the next neighbour, and undo restores it", () => {
    const k = tasks();
    k.actions.select("b");
    k.actions.remove();
    expect(k.visibleIds()).toEqual(["a", "c"]);
    expect(k.state.view.selectedId).toBe("c");
    k.actions.undo();
    expect(k.visibleIds()).toEqual(["a", "b", "c"]);
    expect(k.state.view.selectedId).toBe("b");
  });

  it("a domain op recorded with its own undoer is reversed by undo", () => {
    const k = tasks();
    k.actions.record({ op: "complete", id: "a", prev: "todo" });
    k.actions.update("a", { status: "done" });
    expect(k.state.data.tasks[0].status).toBe("done");
    k.actions.undo();
    expect(k.state.data.tasks[0].status).toBe("todo");
  });

  it("unwind leaves edit first, then clears the selection; an open dialog goes first of all", () => {
    let modal = true;
    const k = tasks({ modalOpen: () => modal });
    k.actions.create();
    const id = k.state.view.selectedId;
    k.actions.unwind();
    expect(k.ui.editing()).toBe(true);
    modal = false;
    k.actions.unwind();
    expect(k.ui.editing()).toBe(false);
    expect(k.state.view.selectedId).toBe(id);
    k.actions.unwind();
    expect(k.state.view.selectedId).toBeNull();
  });

  it("search narrows by textOf, cycleSort wraps, collapseSelected folds the group of the selection", () => {
    const k = tasks();
    k.actions.setSearch("SHIP");
    expect(k.visibleIds()).toEqual(["b"]);
    k.actions.setSearch("");
    k.actions.cycleSort();
    expect(k.state.view.sort).toBe("title");
    k.actions.cycleSort();
    expect(k.state.view.sort).toBe("added");
    k.actions.select("a");
    k.actions.collapseSelected();
    expect(k.visibleIds()).toEqual(["c"]);
    k.actions.collapseSelected();
    expect(k.visibleIds()).toEqual(["a", "b", "c"]);
  });

  it("persists and a second kit on the same key restores entities, view and history", () => {
    const k = tasks();
    k.actions.create();
    k.actions.select("b");
    const again = tasks();
    expect(again.state.data.tasks).toHaveLength(4);
    expect(again.state.view.selectedId).toBe("b");
    expect(again.state.data.history).toHaveLength(1);
  });

  it("a corrupt stored value falls back to the seed", () => {
    localStorage.setItem("kit-tasks", "{not json");
    expect(tasks().visibleIds()).toEqual(["a", "b", "c"]);
  });
});

describe("defineListDetail with a second, unrelated entity (contacts)", () => {
  it("groups, orders and walks by the configuration, not by any task notion", () => {
    const k = contacts();
    expect(k.grouped().map((g) => [g.id, g.items.map((c) => c.name)])).toEqual([
      ["work", ["Cy", "Ada"]],
      ["home", ["Bo"]],
      ["club", ["Di"]],
    ]);
    expect(k.state.view.selectedId).toBe("r");
    k.actions.cycleSort();
    expect(k.visibleIds()).toEqual(["p", "r", "q", "s"]);
  });

  it("keeps the app's extra data and dumps data, view and chrome", () => {
    const k = contacts();
    const d = JSON.parse(k.dump());
    expect(d.data.note).toBe("hi");
    expect(d.data.people).toHaveLength(4);
    expect(Object.keys(d).sort()).toEqual(["chrome", "data", "view"]);
    expect(d.chrome).toEqual({ editing: false, searchFocused: false, helpOpen: false, settingsOpen: false });
  });

  it("collapse, search and delete with the three-group order", () => {
    const k = contacts();
    k.actions.select("q");
    k.actions.collapseSelected();
    expect(k.visibleIds()).toEqual(["r", "p", "s"]);
    k.actions.setSearch("club");
    expect(k.visibleIds()).toEqual(["s"]);
    k.actions.setSearch("");
    k.actions.select("s");
    k.actions.remove();
    expect(k.state.view.selectedId).toBe("p");
  });

  it("two kits do not share signals or storage", () => {
    const t = tasks();
    const c = contacts();
    t.actions.create();
    expect(t.ui.editing()).toBe(true);
    expect(c.ui.editing()).toBe(false);
    expect(localStorage.getItem("kit-contacts")).toBeNull();
  });
});

describe("verbs", () => {
  it("every standard row reaches a real store action and has a handler", () => {
    const k = tasks();
    for (const row of LIST_DETAIL_VERBS) {
      const name = LIST_DETAIL_ACTION_OF[row.action];
      expect(typeof (k.actions as Record<string, unknown>)[name]).toBe("function");
      expect(typeof k.handlers[row.action]).toBe("function");
    }
    expect(k.verbs.map((v) => v.keys)).toEqual(["j", "k", "n", "e", "x", "u", "/", "s", "-", "Escape", "?", ","]);
  });

  it("each handler changes something observable in the dump", () => {
    const k = tasks();
    const snap = () => k.dump();
    for (const [action, prep] of [
      ["next", () => {}],
      ["new", () => {}],
      ["edit", () => k.actions.select("a")],
      ["delete", () => k.actions.select("a")],
      ["sort", () => {}],
      ["collapse", () => k.actions.select("a")],
      ["unwind", () => k.actions.select("a")],
    ] as const) {
      prep();
      const before = snap();
      k.handlers[action]();
      expect(snap(), action).not.toBe(before);
    }
    const before = snap();
    k.handlers.undo();
    expect(snap()).not.toBe(before);
  });

  it("the search verb focuses the configured search field and shows it in the dump", () => {
    const k = contacts();
    const stop = k.install();
    const input = document.body.appendChild(document.createElement("input"));
    input.id = "contact-search";
    k.handlers.search();
    expect(document.activeElement).toBe(input);
    expect(JSON.parse(k.dump()).chrome.searchFocused).toBe(true);
    input.remove();
    stop();
  });

  it("help and settings open dialogs shown in the dump; Escape closes them before anything else", () => {
    const k = tasks();
    k.actions.select("a");
    k.handlers.help();
    expect(JSON.parse(k.dump()).chrome.helpOpen).toBe(true);
    k.handlers.settings();
    expect(JSON.parse(k.dump()).chrome.settingsOpen).toBe(true);
    k.handlers.unwind();
    const c = JSON.parse(k.dump());
    expect([c.chrome.helpOpen, c.chrome.settingsOpen, c.view.selectedId]).toEqual([false, false, "a"]);
    k.handlers.unwind();
    expect(JSON.parse(k.dump()).view.selectedId).toBe(null);
  });

  it("closeModal is called for an app dialog; open and complete rows exist only when configured", () => {
    let app = true;
    const opened: string[] = [];
    const k = tasks({
      modalOpen: () => app,
      closeModal: () => { app = false; },
      open: (t) => { opened.push(t.id); },
      primary: (t, kit) => kit.actions.update(t.id, { status: "done" }),
    });
    k.actions.select("a");
    k.handlers.unwind();
    expect(app).toBe(false);
    expect(k.verbs.map((v) => v.keys).slice(-4)).toEqual(["?", ",", "Enter", "c"]);
    k.handlers.open();
    expect(opened).toEqual(["a"]);
    const before = k.dump();
    k.handlers.complete();
    expect(k.dump()).not.toBe(before);
    expect(k.state.data.tasks.find((t) => t.id === "a")?.status).toBe("done");
  });
});
