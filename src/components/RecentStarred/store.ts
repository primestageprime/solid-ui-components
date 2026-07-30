import { createSignal, type Accessor } from "solid-js";
import { filter, some } from "../../fn";

/**
 * Reusable "recently-visited" + "starred" state for arbitrary navigable
 * items (cases, customers, dashboards, anything with a stable id). The
 * store is framework-agnostic: pass it to `<StarToggle>` and
 * `<RecentStarredSidebar>` for ready-made UI, or read/write the
 * accessors yourself.
 *
 * Both lists persist to localStorage under `storageKey`.recent and
 * `storageKey`.starred. The `recent` list is FIFO with newest-first
 * insertion + de-dup + a configurable cap. `starred` is unordered (we
 * sort newest-starred to the top when surfacing).
 *
 * Each item carries:
 *  - id: required, must be unique within the store
 *  - label: required, the display string
 *  - meta: arbitrary serializable payload (e.g. parent ids so a click
 *    can navigate directly without re-fetching)
 *
 * @example
 *   const cases = createRecentStarredStore({ storageKey: "rth.cases" });
 *   cases.pushRecent({ id: rid, label: "R12345", meta: { tenant_id } });
 *   cases.toggleStar({ id: rid, label: "R12345" });
 *   cases.isStarred(rid); // → true
 */

export type RecentStarredItem = {
  /** Stable unique id across the store. */
  id: string;
  /** Display string used by the bundled UI. */
  label: string;
  /** App-specific payload — round-trips through localStorage, so keep
   * it small and JSON-safe (strings, numbers, booleans, plain objects). */
  meta?: Record<string, unknown>;
};

export interface RecentStarredStore {
  recent: Accessor<RecentStarredItem[]>;
  starred: Accessor<RecentStarredItem[]>;
  /** Prepend item to `recent`, de-duped by id, capped at `recentLimit`. */
  pushRecent(item: RecentStarredItem): void;
  /** Flip starred state for the given item (id-keyed). */
  toggleStar(item: RecentStarredItem): void;
  isStarred(id: string): boolean;
  /** Wipe both lists (recent + starred). */
  clearAll(): void;
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode, quota, etc. — silent. */
  }
}

export interface CreateRecentStarredOpts {
  /** Prefix for localStorage keys. Two keys are written under this:
   * `<storageKey>.recent` and `<storageKey>.starred`. */
  storageKey: string;
  /** Max entries kept in the recent list. Default 20. */
  recentLimit?: number;
}

export function createRecentStarredStore(
  opts: CreateRecentStarredOpts,
): RecentStarredStore {
  const recentKey = `${opts.storageKey}.recent`;
  const starredKey = `${opts.storageKey}.starred`;
  const limit = Math.max(1, opts.recentLimit ?? 20);

  const [recent, setRecent] = createSignal<RecentStarredItem[]>(
    safeRead<RecentStarredItem[]>(recentKey, []),
  );
  const [starred, setStarred] = createSignal<RecentStarredItem[]>(
    safeRead<RecentStarredItem[]>(starredKey, []),
  );

  function persist(kind: "recent" | "starred", list: RecentStarredItem[]) {
    safeWrite(kind === "recent" ? recentKey : starredKey, list);
  }

  function pushRecent(item: RecentStarredItem) {
    setRecent((cur) => {
      const next = [item, ...filter((x) => x.id !== item.id, cur)].slice(
        0,
        limit,
      );
      persist("recent", next);
      return next;
    });
  }

  function toggleStar(item: RecentStarredItem) {
    setStarred((cur) => {
      const exists = some((x) => x.id === item.id, cur);
      const next = exists
        ? filter((x) => x.id !== item.id, cur)
        : [item, ...cur];
      persist("starred", next);
      return next;
    });
  }

  function isStarred(id: string) {
    return some((x) => x.id === id, starred());
  }

  function clearAll() {
    setRecent([]);
    setStarred([]);
    persist("recent", []);
    persist("starred", []);
  }

  return { recent, starred, pushRecent, toggleStar, isStarred, clearAll };
}
