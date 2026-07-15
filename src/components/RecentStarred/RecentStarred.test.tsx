import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createRecentStarredStore } from "./store";
import { StarToggle } from "./StarToggle";
import { RecentStarredSidebar } from "./RecentStarredSidebar";

beforeEach(() => {
  localStorage.clear();
});

describe("createRecentStarredStore", () => {
  it("prepends recents newest-first and de-dupes by id", () => {
    const store = createRecentStarredStore({ storageKey: "t" });
    store.pushRecent({ id: "a", label: "A" });
    store.pushRecent({ id: "b", label: "B" });
    store.pushRecent({ id: "a", label: "A" });
    expect(store.recent().map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("caps the recent list at recentLimit", () => {
    const store = createRecentStarredStore({ storageKey: "t", recentLimit: 2 });
    store.pushRecent({ id: "a", label: "A" });
    store.pushRecent({ id: "b", label: "B" });
    store.pushRecent({ id: "c", label: "C" });
    expect(store.recent().map((r) => r.id)).toEqual(["c", "b"]);
  });

  it("toggles star state and reports isStarred", () => {
    const store = createRecentStarredStore({ storageKey: "t" });
    expect(store.isStarred("a")).toBe(false);
    store.toggleStar({ id: "a", label: "A" });
    expect(store.isStarred("a")).toBe(true);
    store.toggleStar({ id: "a", label: "A" });
    expect(store.isStarred("a")).toBe(false);
  });

  it("persists lists to localStorage and rehydrates a fresh store", () => {
    const store = createRecentStarredStore({ storageKey: "cases" });
    store.pushRecent({ id: "a", label: "A" });
    store.toggleStar({ id: "a", label: "A" });
    expect(localStorage.getItem("cases.recent")).toContain("\"a\"");
    const reloaded = createRecentStarredStore({ storageKey: "cases" });
    expect(reloaded.recent().map((r) => r.id)).toEqual(["a"]);
    expect(reloaded.isStarred("a")).toBe(true);
  });

  it("clearAll wipes both lists", () => {
    const store = createRecentStarredStore({ storageKey: "t" });
    store.pushRecent({ id: "a", label: "A" });
    store.toggleStar({ id: "a", label: "A" });
    store.clearAll();
    expect(store.recent()).toEqual([]);
    expect(store.starred()).toEqual([]);
  });
});

describe("StarToggle", () => {
  it("reflects the store's starred state and flips it on click", () => {
    const store = createRecentStarredStore({ storageKey: "t" });
    const { container } = render(() => (
      <StarToggle store={store} item={{ id: "a", label: "A" }} />
    ));
    const btn = container.querySelector(".sui-star-toggle")!;
    expect(btn.getAttribute("data-starred")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("data-starred")).toBe("true");
    expect(store.isStarred("a")).toBe(true);
  });
});

describe("RecentStarredSidebar", () => {
  it("renders starred and recent items and fires onPick", () => {
    const store = createRecentStarredStore({ storageKey: "t" });
    store.pushRecent({ id: "a", label: "Recent A" });
    store.toggleStar({ id: "b", label: "Starred B" });
    const onPick = vi.fn();
    const { getByText } = render(() => (
      <RecentStarredSidebar store={store} onPick={onPick} />
    ));
    fireEvent.click(getByText("Recent A"));
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a" }),
    );
    expect(getByText("Starred B")).toBeTruthy();
  });

  it("shows empty-state copy when a list is empty", () => {
    const store = createRecentStarredStore({ storageKey: "t" });
    const { container } = render(() => (
      <RecentStarredSidebar store={store} onPick={() => {}} />
    ));
    expect(
      container.querySelectorAll(".sui-recent-starred__empty").length,
    ).toBe(2);
  });
});
