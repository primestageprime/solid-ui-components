import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { createHotkeyScope, useHotkeys } from "./createHotkeyScope";
import type { HotkeyEntry } from "./hotkeyDispatch";

afterEach(cleanup);

const TABLE: ReadonlyArray<HotkeyEntry> = [
  { action: "new", keys: "n", scope: "global" },
  { action: "tasks", keys: "g t", scope: "global" },
  { action: "next", keys: "j", scope: "list" },
  { action: "close", keys: "Escape", scope: "list" },
  { action: "closeModal", keys: "Escape", scope: "modal" },
];

/** Dispatch a keydown on `el` and report whether it was cancelled. */
const key = (el: EventTarget, k: string, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(e);
  return e;
};

describe("createHotkeyScope", () => {
  it("by default a held key repeats: every auto-repeat runs the handler", () => {
    const handlers = { new: vi.fn() };
    const stop = createHotkeyScope({ table: TABLE, handlers, scopes: () => ["global"] });
    key(document.body, "n");
    key(document.body, "n", { repeat: true });
    key(document.body, "n", { repeat: true });
    expect(handlers.new).toHaveBeenCalledTimes(3);
    stop();
  });

  it("once: a held key's auto-repeats run nothing but stay cancelled", () => {
    const handlers = { new: vi.fn() };
    const stop = createHotkeyScope({ table: TABLE, handlers, scopes: () => ["global"], once: true });
    key(document.body, "n");
    const repeats = Array.from({ length: 8 }, () => key(document.body, "n", { repeat: true }));
    expect(handlers.new).toHaveBeenCalledTimes(1);
    expect(repeats.every((e) => e.defaultPrevented)).toBe(true);
    stop();
  });

  it("once: a repeat of a key no entry binds stays the browser's", () => {
    const stop = createHotkeyScope({ table: TABLE, handlers: { new: vi.fn() }, scopes: () => ["global"], once: true });
    expect(key(document.body, "z", { repeat: true }).defaultPrevented).toBe(false);
    stop();
  });

  it("fires the handler and cancels the key", () => {
    const handlers = { new: vi.fn() };
    const stop = createHotkeyScope({ table: TABLE, handlers, scopes: () => ["global"] });
    const e = key(document.body, "n");
    expect(handlers.new).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
    stop();
  });

  it("stops listening when disposed", () => {
    const handlers = { new: vi.fn() };
    const stop = createHotkeyScope({ table: TABLE, handlers, scopes: () => ["global"] });
    stop();
    key(document.body, "n");
    expect(handlers.new).not.toHaveBeenCalled();
  });

  it("leaves unbound keys, editable targets and ⌘ presses to the browser", () => {
    const handlers = { new: vi.fn() };
    const stop = createHotkeyScope({ table: TABLE, handlers, scopes: () => ["global"] });
    const input = document.createElement("input");
    document.body.appendChild(input);
    const results = [key(document.body, "z"), key(input, "n"), key(document.body, "n", { metaKey: true })];
    expect(results.map((e) => e.defaultPrevented)).toEqual([false, false, false]);
    expect(handlers.new).not.toHaveBeenCalled();
    input.remove();
    stop();
  });

  it("reads a chord across two presses, and cancels the first", () => {
    const handlers = { tasks: vi.fn() };
    const stop = createHotkeyScope({ table: TABLE, handlers, scopes: () => ["global"] });
    expect(key(document.body, "g").defaultPrevented).toBe(true);
    expect(handlers.tasks).not.toHaveBeenCalled();
    key(document.body, "t");
    expect(handlers.tasks).toHaveBeenCalledTimes(1);
    stop();
  });

  it("expires a chord after the window", () => {
    vi.useFakeTimers();
    const handlers = { tasks: vi.fn() };
    const stop = createHotkeyScope({ table: TABLE, handlers, scopes: () => ["global"], chordWindowMs: 500 });
    key(document.body, "g");
    vi.advanceTimersByTime(501);
    key(document.body, "t");
    expect(handlers.tasks).not.toHaveBeenCalled();
    stop();
    vi.useRealTimers();
  });

  it("reads scopes at key time, and a modal Escape does not reach other listeners", () => {
    const [modalOpen, setModalOpen] = createSignal(false);
    const handlers = { close: vi.fn(), closeModal: vi.fn(), next: vi.fn() };
    const stop = createHotkeyScope({
      table: TABLE,
      handlers,
      scopes: () => (modalOpen() ? ["modal"] : ["global", "list"]),
    });
    const bubbling = vi.fn();
    window.addEventListener("keydown", bubbling);
    key(document.body, "Escape");
    expect(handlers.close).toHaveBeenCalledTimes(1);
    expect(bubbling).toHaveBeenCalledTimes(1); // a list Escape still reaches other listeners
    setModalOpen(true);
    key(document.body, "Escape");
    expect(handlers.closeModal).toHaveBeenCalledTimes(1);
    expect(bubbling).toHaveBeenCalledTimes(1); // the modal Escape was stopped in capture
    key(document.body, "j"); // a list key under a modal: ignored, so it still reaches others
    expect(handlers.next).not.toHaveBeenCalled();
    expect(bubbling).toHaveBeenCalledTimes(2);
    window.removeEventListener("keydown", bubbling);
    stop();
  });

  it("skips an action with no handler so the key stays the browser's", () => {
    const stop = createHotkeyScope({ table: TABLE, handlers: {}, scopes: () => ["global"] });
    expect(key(document.body, "n").defaultPrevented).toBe(false);
    stop();
  });

  it("listens on a target you give it", () => {
    const target = document.createElement("div");
    const handlers = { new: vi.fn() };
    const stop = createHotkeyScope({ table: TABLE, handlers, scopes: () => ["global"], target });
    key(document.body, "n");
    expect(handlers.new).not.toHaveBeenCalled();
    key(target, "n");
    expect(handlers.new).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe("useHotkeys", () => {
  it("listens while the component lives and stops when it is disposed", () => {
    const handlers = { new: vi.fn() };
    const Keys = () => {
      useHotkeys({ table: TABLE, handlers, scopes: () => ["global"] });
      return <span>keys</span>;
    };
    render(() => <Keys />);
    key(document.body, "n");
    expect(handlers.new).toHaveBeenCalledTimes(1);
    cleanup();
    key(document.body, "n");
    expect(handlers.new).toHaveBeenCalledTimes(1);
  });

  it("is a no-op owner-wise outside a component (createRoot dispose stops it)", () => {
    const handlers = { new: vi.fn() };
    const dispose = createRoot((d) => {
      useHotkeys({ table: TABLE, handlers, scopes: () => ["global"] });
      return d;
    });
    key(document.body, "n");
    dispose();
    key(document.body, "n");
    expect(handlers.new).toHaveBeenCalledTimes(1);
  });
});
