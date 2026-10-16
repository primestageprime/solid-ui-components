import { describe, it, expect } from "vitest";
import {
  IDLE_CHORD,
  activeEntries,
  dispatchHotkey,
  traceHotkeys,
  type HotkeyEntry,
} from "./hotkeyDispatch";

// The Taskmaster touchstone's table, the canon shape: reserved verbs on single
// keys, everything else a "g" chord, Escape bound in both "list" and "modal".
const TABLE: ReadonlyArray<HotkeyEntry> = [
  { action: "new", verb: "new", keys: "n", scope: "global" },
  { action: "help", verb: "help", keys: "?", scope: "global" },
  { action: "tasks", keys: "g t", scope: "global" },
  { action: "about", keys: "g a", scope: "global" },
  { action: "next", verb: "next", keys: "j", scope: "list" },
  { action: "close", verb: "close", keys: "Escape", scope: "list" },
  { action: "cycleStatus", keys: "g s", scope: "list" },
  { action: "editNotes", keys: "g n", scope: "detail" },
  { action: "closeModal", verb: "close", keys: "Escape", scope: "modal" },
];
const ALL = ["global", "list", "detail"] as const;

describe("activeEntries", () => {
  it("keeps the entries in the active scopes", () => {
    expect(activeEntries(TABLE, ["list"]).map((e) => e.action)).toEqual(["next", "close", "cycleStatus"]);
  });

  it("lets a modal scope block every lower scope", () => {
    expect(activeEntries(TABLE, ["modal", "global", "list"]).map((e) => e.action)).toEqual(["closeModal"]);
  });
});

describe("traceHotkeys — the table prints what each press does", () => {
  it("single keys fire in their scope and nowhere else", () => {
    expect(traceHotkeys(TABLE, ["global", "list"], ["n", "j", "x"])).toEqual([
      { key: "n", at: 0, outcome: "fire", action: "new", waiting: "" },
      { key: "j", at: 100, outcome: "fire", action: "next", waiting: "" },
      { key: "x", at: 200, outcome: "ignored", action: "", waiting: "" },
    ]);
    // "j" is a list key: with only the global scope active it does nothing.
    expect(traceHotkeys(TABLE, ["global"], ["j"])[0].outcome).toBe("ignored");
  });

  it("a chord swallows its first key, then fires on its second", () => {
    expect(traceHotkeys(TABLE, ALL, ["g", "t"])).toEqual([
      { key: "g", at: 0, outcome: "chord", action: "", waiting: "g" },
      { key: "t", at: 100, outcome: "fire", action: "tasks", waiting: "" },
    ]);
  });

  it("a chord that does not complete lets its second key act on its own", () => {
    expect(traceHotkeys(TABLE, ALL, ["g", "j"])).toEqual([
      { key: "g", at: 0, outcome: "chord", action: "", waiting: "g" },
      { key: "j", at: 100, outcome: "fire", action: "next", waiting: "" },
    ]);
    expect(traceHotkeys(TABLE, ALL, ["g", "z"]).map((r) => r.outcome)).toEqual(["chord", "ignored"]);
  });

  it("a chord expires after the window", () => {
    const rows = traceHotkeys(TABLE, ALL, ["g", { key: "t", at: 1501 }]);
    expect(rows.map((r) => [r.key, r.outcome, r.action])).toEqual([
      ["g", "chord", ""],
      ["t", "ignored", ""],
    ]);
    const inTime = traceHotkeys(TABLE, ALL, ["g", { key: "t", at: 1500 }]);
    expect(inTime[1].action).toBe("tasks");
    const wider = traceHotkeys(TABLE, ALL, ["g", { key: "t", at: 4000 }], { chordWindowMs: 5000 });
    expect(wider[1].action).toBe("tasks");
  });

  it("chords are per scope: g s needs the list scope", () => {
    expect(traceHotkeys(TABLE, ["global"], ["g", "s"]).map((r) => r.outcome)).toEqual(["chord", "ignored"]);
    expect(traceHotkeys(TABLE, ["global", "list"], ["g", "s"])[1].action).toBe("cycleStatus");
  });

  it("modal blocks the lower scopes: Escape closes the modal, j and n do nothing", () => {
    const rows = traceHotkeys(TABLE, ["global", "list", "modal"], ["Escape", "j", "n", "g"]);
    expect(rows.map((r) => [r.key, r.outcome, r.action])).toEqual([
      ["Escape", "fire", "closeModal"],
      ["j", "ignored", ""],
      ["n", "ignored", ""],
      ["g", "ignored", ""],
    ]);
  });

  it("the same Escape closes the list selection when no modal is open", () => {
    expect(traceHotkeys(TABLE, ALL, ["Escape"])[0].action).toBe("close");
  });

  it("a dialog opening mid-sequence changes what the next press does", () => {
    const rows = traceHotkeys(TABLE, (i) => (i < 1 ? ALL : ["modal"]), ["j", "j", "Escape"]);
    expect(rows.map((r) => [r.outcome, r.action])).toEqual([
      ["fire", "next"],
      ["ignored", ""],
      ["fire", "closeModal"],
    ]);
  });

  it("ignores editable targets and ⌘ / Ctrl / Alt presses", () => {
    const rows = traceHotkeys(TABLE, ALL, [
      { key: "n", editable: true },
      { key: "n", meta: true },
      { key: "n", ctrl: true },
      { key: "n", alt: true },
      { key: "n" },
    ]);
    expect(rows.map((r) => r.outcome)).toEqual(["ignored", "ignored", "ignored", "ignored", "fire"]);
  });

  it("an ignored press does not break a chord in progress", () => {
    const rows = traceHotkeys(TABLE, ALL, ["g", { key: "t", editable: true }, "t"]);
    expect(rows.map((r) => [r.outcome, r.action])).toEqual([
      ["chord", ""],
      ["ignored", ""],
      ["fire", "tasks"],
    ]);
  });

  it("an action with no handler is skipped, so the press falls through", () => {
    const only = (a: string) => a !== "new";
    expect(traceHotkeys(TABLE, ALL, ["n"], { isHandled: only })[0].outcome).toBe("ignored");
    // "g t" has no handler: "g" is not worth swallowing for it.
    const noTasks = (a: string) => a !== "tasks" && a !== "about" && a !== "cycleStatus" && a !== "editNotes";
    expect(traceHotkeys(TABLE, ALL, ["g"], { isHandled: noTasks })[0].outcome).toBe("ignored");
  });

  it("matches keys exactly: a capital is not the lower-case key", () => {
    expect(traceHotkeys(TABLE, ALL, ["N"])[0].outcome).toBe("ignored");
  });
});

describe("dispatchHotkey", () => {
  const press = (key: string) => ({ key, metaKey: false, ctrlKey: false, altKey: false, target: null });

  it("marks only modal entries to stop propagation", () => {
    const modal = dispatchHotkey({ table: TABLE, scopes: ["modal"], press: press("Escape"), state: IDLE_CHORD, now: 0 });
    const list = dispatchHotkey({ table: TABLE, scopes: ["list"], press: press("Escape"), state: IDLE_CHORD, now: 0 });
    expect([modal.kind === "fire" && modal.stopPropagation, list.kind === "fire" && list.stopPropagation]).toEqual([true, false]);
  });

  it("is pure: the same input gives the same outcome and never mutates state", () => {
    const state = { prefix: "g", expiresAt: 900 };
    const frozen = Object.freeze({ ...state });
    const a = dispatchHotkey({ table: TABLE, scopes: ALL, press: press("t"), state: frozen, now: 500 });
    const b = dispatchHotkey({ table: TABLE, scopes: ALL, press: press("t"), state: frozen, now: 500 });
    expect(a).toEqual(b);
    expect(frozen).toEqual(state);
  });

  it("accepts a table with its own scope names", () => {
    type S = "app" | "modal";
    const t: HotkeyEntry<S>[] = [{ action: "go", keys: "x", scope: "app" }];
    const out = dispatchHotkey<S>({ table: t, scopes: ["app"], press: press("x"), state: IDLE_CHORD, now: 0 });
    expect(out.kind).toBe("fire");
  });
});
