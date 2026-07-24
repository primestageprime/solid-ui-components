// ProgressionQueue — "what moved", as a pure map diff. An item MOVED iff it was
// present before and its section changed; adds, removes and intra-section
// reorders are not moves. Because a move is one atomic mutation of `items`,
// there is no intermediate state where an item belongs to no section — the
// whole class of two-array-diff bugs SplitQueueList defended against cannot
// arise here.

export interface Transfer {
  key: string;
  /** Section key it left. */
  from: string;
  /** Section key it landed in. */
  to: string;
  /** +1 = moved DOWN the section order, -1 = moved UP. */
  direction: 1 | -1;
}

export const diffTransfers = (
  prev: ReadonlyMap<string, string>,
  next: ReadonlyMap<string, string>,
  sectionOrder: readonly string[],
): Transfer[] =>
  [...next].flatMap(([key, to]) => {
    const from = prev.get(key);
    if (from === undefined || from === to) return [];
    const delta = sectionOrder.indexOf(to) - sectionOrder.indexOf(from);
    if (delta === 0) return [];
    return [{ key, from, to, direction: delta > 0 ? 1 : -1 } as Transfer];
  });
