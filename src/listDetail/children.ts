// listDetail — defineChildren (Depth 0, pure). The progression of an item's ordered children
// (each with a status, start and completion stamps and a time + text log): which child is in focus,
// how far along the item is, which group it falls in, and the one move that completes the focused
// child, activates the next and logs both (reopening the last when everything is done). Pure
// functions over plain data; no store, no signals. No app nouns: the app names the key that holds
// the children, the status values and the log texts.
import { every, filter, find, findIndex, flatMap, map } from "../fn";
import { weekStart } from "../fn/weekStart";
import { newId } from "./listkit";

/** One line of a child's log. */
export type ChildLogLine = { id: string; at: string; text: string };

/** What a child carries for progression; extra fields (a name, an owner) are the app's. */
export type ChildShape = {
  id: string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  log: ChildLogLine[];
};

/** Where an item stands, from its children: none started, some started, all complete. */
export type ChildKind = "pending" | "current" | "complete";
/** The four groups an item can fall in; `complete` splits on whether the last completion is this week. */
export type ChildGroup = "pending" | "current" | "recent" | "history";

export type ChildrenConfig<
  K extends string,
  F extends string,
  G extends string,
> = {
  /** The field of the item that holds its children, e.g. "steps". */
  key: K;
  /** The field of the item that remembers the chosen child (optional, absent = none chosen). Default "focus". */
  focus?: F;
  /** The child `status` values for not started, started and finished. */
  status: { pending: string; current: string; complete: string };
  /** The text of the log line each transition writes. */
  lines: { started: string; completed: string; reopened: string };
  /** The group id each ChildGroup maps to, so `groupOf` returns the app's own ids. */
  groups: Record<ChildGroup, G>;
};

/** An item that holds children under `K` and a chosen child under `F`; `createdAt` is where its activity time starts. */
export type ChildParent<K extends string, F extends string> = {
  createdAt: string;
} & { [k in K]: ChildShape[] } & { [f in F]?: string };

/** The element type of the item's children. */
type ChildOf<P, K extends string> = P extends { [k in K]: readonly (infer C)[] }
  ? C
  : never;

const maxIso = (values: (string | null | undefined)[]): string =>
  values.reduce<string>((a, v) => (v && v > a ? v : a), "");

export function defineChildren<
  K extends string,
  G extends string,
  F extends string = "focus",
>(config: ChildrenConfig<K, F, G>) {
  const { status, lines } = config;
  const focusKey = (config.focus ?? "focus") as F;
  const list = <P extends ChildParent<K, F>>(p: P): ChildShape[] =>
    p[config.key] as unknown as ChildShape[];

  type Patch<P extends ChildParent<K, F>> = { [k in K]: P[K] } & {
    [f in F]: string | undefined;
  };
  const patch = <P extends ChildParent<K, F>>(
    children: ChildShape[],
    focus: string | undefined,
  ): Patch<P> =>
    ({ [config.key]: children, [focusKey]: focus }) as unknown as Patch<P>;

  const line = (at: string, text: string): ChildLogLine => ({
    id: newId(),
    at,
    text,
  });

  /** A child ready to add to an item: not started, empty log, plus the app's own fields. */
  const child = <X extends object>(id: string, extra: X): X & ChildShape => ({
    ...extra,
    id,
    status: status.pending,
    log: [],
  });

  const kindOf = <P extends ChildParent<K, F>>(p: P): ChildKind => {
    const cs = list(p);
    if (every((c) => c.status === status.pending, cs)) return "pending";
    return every((c) => c.status === status.complete, cs)
      ? "complete"
      : "current";
  };

  const progress = <P extends ChildParent<K, F>>(
    p: P,
  ): { done: number; total: number } => {
    const cs = list(p);
    return {
      done: filter((c) => c.status === status.complete, cs).length,
      total: cs.length,
    };
  };

  /** The latest start or completion of any child, else the item's creation time (ISO). */
  const activityAt = <P extends ChildParent<K, F>>(p: P): string =>
    maxIso([
      p.createdAt,
      ...flatMap((c) => [c.startedAt, c.completedAt], list(p)),
    ]);

  /** The item's group: pending, current, or complete split into recent (last completion this local week) and history. */
  const groupOf = <P extends ChildParent<K, F>>(
    p: P,
    now: Date = new Date(),
  ): G => {
    const kind = kindOf(p);
    if (kind !== "complete") return config.groups[kind];
    const last = maxIso(map((c) => c.completedAt, list(p)));
    const recent = new Date(last).getTime() >= weekStart(now).getTime();
    return config.groups[recent ? "recent" : "history"];
  };

  const focused = <P extends ChildParent<K, F>>(
    p: P | undefined,
  ): ChildShape | undefined => {
    if (!p) return undefined;
    const cs = list(p);
    const chosen = (p as { [f in F]?: string })[focusKey];
    return (
      find((c) => c.id === chosen, cs) ??
      find((c) => c.status === status.current, cs) ??
      find((c) => c.status === status.pending, cs) ??
      cs[cs.length - 1]
    );
  };

  /** The child in focus: the chosen one, else the first current, else the first pending, else the last. */
  const pick = <P extends ChildParent<K, F>>(
    p: P | undefined,
  ): ChildOf<P, K> | undefined =>
    focused(p) as unknown as ChildOf<P, K> | undefined;

  /** The patch that chooses the child in focus. */
  const select = (id: string): { [f in F]: string } =>
    ({ [focusKey]: id }) as { [f in F]: string };

  /** The patch that moves the focus `dir` children along, wrapping; undefined with fewer than two children. */
  const cycle = <P extends ChildParent<K, F>>(
    p: P,
    dir: 1 | -1,
  ): { [f in F]: string } | undefined => {
    const cs = list(p);
    const at = findIndex((c) => c.id === focused(p)?.id, cs);
    return cs.length < 2 || at < 0
      ? undefined
      : select(cs[(at + dir + cs.length) % cs.length].id);
  };

  /** Complete the focused child (else the current one, else the first pending), stamp and log it, activate the next pending child; with every child complete, reopen the last. Returns the patch to apply to the item. */
  const advance = <P extends ChildParent<K, F>>(
    p: P,
    at: string = new Date().toISOString(),
  ): Patch<P> => {
    const cs = list(p);
    const chosen = focused(p);
    const target =
      chosen && chosen.status !== status.complete
        ? chosen
        : (find((c) => c.status === status.current, cs) ??
          find((c) => c.status === status.pending, cs));
    if (!target) {
      const last = cs[cs.length - 1];
      if (!last) return patch<P>(cs, undefined);
      return patch<P>(
        map(
          (c) =>
            c.id === last.id
              ? {
                  ...c,
                  status: status.current,
                  completedAt: undefined,
                  log: [...c.log, line(at, lines.reopened)],
                }
              : c,
          cs,
        ),
        last.id,
      );
    }
    const after = cs.slice(cs.indexOf(target) + 1);
    const next = find((c) => c.status === status.pending, after);
    const out = map((c) => {
      if (c.id === target.id) {
        const opened = c.startedAt
          ? c.log
          : [...c.log, line(at, lines.started)];
        return {
          ...c,
          status: status.complete,
          startedAt: c.startedAt ?? at,
          completedAt: at,
          log: [...opened, line(at, lines.completed)],
        };
      }
      if (c.id === next?.id)
        return {
          ...c,
          status: status.current,
          startedAt: at,
          log: [...c.log, line(at, lines.started)],
        };
      return c;
    }, cs);
    return patch<P>(out, next?.id ?? target.id);
  };

  return {
    child,
    kindOf,
    progress,
    activityAt,
    groupOf,
    pick,
    select,
    cycle,
    advance,
  };
}
