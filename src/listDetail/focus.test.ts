import { afterEach, describe, expect, it } from "vitest";
import { editKey, focusById, watchFocus } from "./focus";

let stop = () => {};
afterEach(() => {
  stop();
  document.body.innerHTML = "";
});

describe("focus and the edit flag", () => {
  it("Escape in a typed-in field ends the edit and returns the keyboard, once the component's own handler has run", async () => {
    let left = 0;
    stop = watchFocus({ searchId: "s", onLeave: () => left++ });
    const input = document.body.appendChild(document.createElement("input"));
    input.focus();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(left).toBe(0);
    await Promise.resolve();
    expect(left).toBe(1);
    expect(document.activeElement).not.toBe(input);
  });

  it("Escape outside a field does nothing", async () => {
    let left = 0;
    stop = watchFocus({ searchId: "s", onLeave: () => left++ });
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await Promise.resolve();
    expect(left).toBe(0);
  });

  it("reports focus entering and leaving the search field only", () => {
    const seen: boolean[] = [];
    stop = watchFocus({ searchId: "s", onLeave: () => {}, onSearchFocus: (f) => seen.push(f) });
    const search = document.body.appendChild(document.createElement("input"));
    search.id = "s";
    const other = document.body.appendChild(document.createElement("input"));
    focusById("s");
    expect(document.activeElement).toBe(search);
    other.focus();
    expect(seen).toEqual([true, false]);
  });

  it("editKey changes with the selection and the edit flag so an editor remounts", () => {
    expect(editKey(null, true)).toBeNull();
    expect(editKey("a", false)).not.toBe(editKey("a", true));
  });
});
