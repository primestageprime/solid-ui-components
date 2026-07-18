// lastReviewedAt: 2026-06-17
// lastReviewedBy: peter.stradinger
// ============================================
// ExtractionBoard — Composite (Depth 4) swimlane board for an ETL extraction view.
// (Composes the ./cards vocabulary (Depth 3, via CountChip Depth 2) + Layout variants.)
// Owns CSS (ExtractionBoard.css). Composes Surface / Text / StatusBadge /
// Icon / Tooltip / SlotFillBar / BatchBar / CountChip / ProportionalStack.
//
// One swimlane per config category; columns left → right are
//   SUMMARY │ DONE │ DOING │ TODO │ +N lozenge.
// The client supplies CONFIG (categories, data types + icons, labels, timing)
// and a REACTIVE `tables` array; the board DERIVES the whole view as pure
// functions over `tables` (no simulation inside) and animates structural
// transitions with the FLIP engine in motion.ts.
//
// Per category the board derives: the Summary aggregate (counts + colsByType
// sum + monotonic status), the latest Done/Skipped card, the Doing card(s)
// (single fill bar ≤ threshold; multi-batch BatchBar above), the next Todo,
// and the +N lozenge. Lanes sort by Summary status (active → top, pending →
// middle, complete → bottom) with a debounced re-sort so a lane is seen
// completing before it sinks. Empty/skipped tables live in the Done column
// with a SKIPPED badge.
//
// Motion correctness (see motion.ts + the designer doc): cards must NOT
// remount each render or a running animation is destroyed mid-flight, so the
// Done/Doing/Todo cards flow through equals-by-name memos / a reconcile store;
// columns are equal-width via ProportionalItem (flex 1 1 0) and each CellBox
// uses scrollWhenSmall={false} so a sliding card isn't clipped.
// ============================================
import {
  For,
  Show,
  createMemo,
  createEffect,
  createSignal,
  onCleanup,
  mergeProps,
  splitProps,
  type Component,
  type JSX,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { CenteredStack, NarrowStack, StretchRow } from "../Layout/variants";
import "./ExtractionBoard.css";

import { useProgressEngine } from "../../internal/progress/useProgressEngine";

import {
  CellBox,
  ColHeading,
  PlaceholderCard,
  SummaryCard,
  DoneCard,
  DoingCard,
  TodoCard,
  LozengeCell,
} from "./cards";
import { createCardFlip } from "./motion";
import type {
  ExtractionBoardConfig,
  BoardTable,
  CategorySummary,
  CategoryStatus,
  DoneItem,
  DoingItem,
  TodoItem,
} from "./types";
import { pipe, filter, map, join, sortBy } from "../../fn";

// ---------------------------------------------------------------------------
// Defaults + small helpers.
// ---------------------------------------------------------------------------

const DEFAULT_MULTI_BATCH_ABOVE = 10_000;
const DEFAULT_COLUMNS = {
  summary: "Summary",
  done: "Done",
  doing: "Doing",
  todo: "Todo",
};

const STATUS_RANK: Record<CategoryStatus, number> = {
  active: 0,
  pending: 1,
  complete: 2,
};

/** Two items are the "same card" iff the same table AND the same displayed
 *  numbers — card refs stay stable across renders so a card recreates only on
 *  a real transition (firing the slide/slurp) or when its counts actually
 *  change. Name-only equality froze a card's numbers forever: a totals
 *  correction arriving AFTER the lane transition (e.g. reconciliation counted
 *  late) never re-rendered, showing "0 Rows" on a 166K-row Done card. */
const sameCard = (
  a: { name: string; totalRows?: number; rows?: number } | null,
  b: { name: string; totalRows?: number; rows?: number } | null,
): boolean =>
  (a?.name ?? null) === (b?.name ?? null) &&
  a?.totalRows === b?.totalRows &&
  a?.rows === b?.rows;

// ---------------------------------------------------------------------------
// Public props.
// ---------------------------------------------------------------------------

export interface ExtractionBoardProps
  extends JSX.HTMLAttributes<HTMLDivElement> {
  config: ExtractionBoardConfig;
  /** The reactive table store. Pass `tables()` from a signal/store. */
  tables: BoardTable[];
}

// ===========================================================================
// Component.
// ===========================================================================

export const ExtractionBoard: Component<ExtractionBoardProps> = (rawProps) => {
  const [local, others] = splitProps(rawProps, ["config", "tables", "class"]);
  const cfg = () => local.config;

  const catOrder = createMemo(() => cfg().categories.map((c) => c.id));
  const orderIndex = createMemo(
    () => new Map(catOrder().map((id, i) => [id, i])),
  );
  const dataTypeOrder = createMemo(() => cfg().dataTypes);
  const iconById = createMemo(
    () => new Map(cfg().dataTypes.map((d) => [d.id, d])),
  );
  const labels = createMemo(() => ({ ...DEFAULT_COLUMNS, ...cfg().columns }));
  const multiBatchAbove = () =>
    cfg().multiBatchAbove ?? DEFAULT_MULTI_BATCH_ABOVE;
  const timing = () => cfg().timing ?? {};

  // Only tables whose category is known to the config participate.
  const knownTables = createMemo(() => {
    const known = new Set(catOrder());
    return filter((t) => known.has(t.category), local.tables);
  });

  // ---- derived views (pure over `tables`) --------------------------------

  /** Summary aggregate per category — counts + colsByType sum + monotonic
   *  status (none done → pending, some → active, all → complete). */
  const summaryByCategory = createMemo(() => {
    const out: Record<string, CategorySummary> = {};
    for (const c of cfg().categories) {
      out[c.id] = {
        category: c.id,
        label: c.label,
        description: c.description,
        colsByType: {},
        completedTables: 0,
        totalTables: 0,
        completedRows: 0,
        totalRows: 0,
        status: "pending",
      };
    }
    for (const t of knownTables()) {
      const s = out[t.category];
      s.totalTables += 1;
      s.totalRows += t.totalRows;
      const resolved = t.status === "done" || t.status === "skipped";
      s.completedRows += resolved ? t.totalRows : t.transferredRows;
      if (resolved) s.completedTables += 1;
      for (const dt of dataTypeOrder()) {
        const n = t.colsByType[dt.id] ?? 0;
        if (n) s.colsByType[dt.id] = (s.colsByType[dt.id] ?? 0) + n;
      }
    }
    for (const c of cfg().categories) {
      const s = out[c.id];
      s.status =
        s.totalTables > 0 && s.completedTables >= s.totalTables
          ? "complete"
          : s.completedTables > 0
            ? "active"
            : "pending";
    }
    return out;
  });

  /** The latest resolved (done/skipped) table per category. Tables carry no
   *  completion timestamp, so "latest" is the last one in array order — the
   *  caller controls ordering by how it mutates the store. */
  const doneByCategory = createMemo(() => {
    const out: Record<string, DoneItem | null> = {};
    for (const c of catOrder()) out[c] = null;
    for (const t of knownTables()) {
      if (t.status !== "done" && t.status !== "skipped") continue;
      out[t.category] = {
        name: t.name,
        category: t.category,
        colsByType: t.colsByType,
        totalRows: t.totalRows,
        skipped: t.status === "skipped",
      };
    }
    return out;
  });

  /** All currently-extracting tables (flat). */
  const doingFlat = createMemo<DoingItem[]>(() =>
    pipe(
      knownTables(),
      filter((t: BoardTable) => t.status === "doing"),
      map((t: BoardTable) => ({
        name: t.name,
        category: t.category,
        colsByType: t.colsByType,
        totalRows: t.totalRows,
        transferredRows: t.transferredRows,
        batches: t.totalRows > multiBatchAbove() ? t.batches : undefined,
      })),
    ),
  );

  /** The next queued (todo) table + remaining count per category. */
  const todoByCategory = createMemo(() => {
    const out: Record<string, { next: TodoItem | null; remaining: number }> =
      {};
    for (const c of catOrder()) out[c] = { next: null, remaining: 0 };
    for (const t of knownTables()) {
      if (t.status !== "todo") continue;
      const bucket = out[t.category];
      bucket.remaining += 1;
      if (!bucket.next) {
        bucket.next = {
          name: t.name,
          category: t.category,
          colsByType: t.colsByType,
          totalRows: t.totalRows,
        };
      }
    }
    return out;
  });

  // Doing cards must update their bar every render but NOT remount while the
  // same table is extracting. reconcile() merges each snapshot into a store
  // keyed by name → persisting tables keep their element (fields update
  // fine-grained); only add/remove on a real status change.
  const [doing, setDoing] = createStore<DoingItem[]>([]);
  createEffect(() =>
    setDoing(reconcile(doingFlat(), { key: "name", merge: true })),
  );
  const doingByCategory = createMemo(() => {
    const out: Record<string, DoingItem[]> = {};
    for (const c of catOrder()) out[c] = [];
    for (const item of doing) {
      out[item.category] ??= [];
      out[item.category].push(item);
    }
    return out;
  });

  // ---- swimlane sort (debounced) -----------------------------------------
  // Order by Summary STATUS: active on top, pending in the middle, complete at
  // the bottom; config order breaks ties. Re-sorts only `resortMs` after the
  // last status transition (debounced), so a lane is seen completing before it
  // sinks. Keys off summary status ONLY.
  const sortedByStatus = (): string[] =>
    [...catOrder()].sort((a, b) => {
      const sum = summaryByCategory();
      const r = STATUS_RANK[sum[a].status] - STATUS_RANK[sum[b].status];
      return r !== 0 ? r : orderIndex().get(a)! - orderIndex().get(b)!;
    });

  const [rowOrder, setRowOrder] = createSignal<string[]>(sortedByStatus());
  let resortTimer: ReturnType<typeof setTimeout> | undefined;
  let lastStatusSig = "";
  createEffect(() => {
    const sum = summaryByCategory();
    const sig = pipe(
      catOrder(),
      map((c: string) => sum[c].status),
      join(","),
    );
    if (sig === lastStatusSig) return; // only react to summary status changes
    lastStatusSig = sig;
    clearTimeout(resortTimer);
    resortTimer = setTimeout(
      () => setRowOrder(sortedByStatus()),
      timing().resortMs ?? 5000,
    );
  });
  onCleanup(() => clearTimeout(resortTimer));

  // ---- FLIP wiring -------------------------------------------------------
  // Runs every render but only animates when the structural signature changes
  // — i.e. on a real status transition. Strictly sequenced: the Done card
  // slurps into the Summary, THEN the just-finished Doing card slides into the
  // empty Done slot.
  const flip = createCardFlip({
    moveMs: timing().moveMs ?? 400,
    slurpMs: timing().slurpMs ?? 600,
    enterMs: timing().enterMs ?? timing().slurpMs ?? 600,
  });
  createEffect(() => {
    const done = doneByCategory();
    const todo = todoByCategory();
    const doingNow = doingFlat();
    let sig = "";
    for (const c of catOrder()) {
      sig += `${c}>D:${done[c]?.name ?? ""}|T:${todo[c].next?.name ?? ""};`;
    }
    sig +=
      "doing>" +
      pipe(
        doingNow,
        map((d: DoingItem) => `${d.category}:${d.name}`),
        sortBy((s: string) => s),
        join(","),
      );
    flip.sync(sig);
  });

  // ---- shared progress engine --------------------------------------------
  // ONE learned model per board instance: every Doing bar (multi-batch and
  // single-fill alike) registers its batches with this controller, so the
  // duration estimate sharpens across the whole extraction, not per-bar.
  const progress = useProgressEngine();

  const rootClass = () => (local.class ? `sui-xb ${local.class}` : "sui-xb");

  return (
    <NarrowStack class={rootClass()} ref={flip.setRoot} {...others}>
      {/* Column headers — equal-width columns that fill the row. */}
      <StretchRow class="sui-xb__row">
        <CellBox>
          <ColHeading>{labels().summary}</ColHeading>
        </CellBox>
        <CellBox>
          <ColHeading>{labels().done}</ColHeading>
        </CellBox>
        <CellBox>
          <ColHeading>{labels().doing}</ColHeading>
        </CellBox>
        <CellBox>
          <ColHeading>{labels().todo}</ColHeading>
        </CellBox>
        <CenteredStack class="sui-xb__lozenge" />
      </StretchRow>

      <For each={rowOrder()}>
        {(cat) => {
          // Stable refs unless the table itself changes → the Done/Todo cards
          // recreate ONLY on a transition (firing the slide/slurp).
          const done = createMemo<DoneItem | null>(
            () => doneByCategory()[cat],
            null,
            { equals: sameCard },
          );
          const todoNext = createMemo<TodoItem | null>(
            () => todoByCategory()[cat].next,
            null,
            { equals: sameCard },
          );
          const remaining = () => todoByCategory()[cat].remaining;
          const doingCards = () => doingByCategory()[cat] ?? [];
          return (
            <StretchRow class="sui-xb__row">
              <CellBox>
                <SummaryCard
                  summary={summaryByCategory()[cat]}
                  dataTypes={dataTypeOrder()}
                  iconById={iconById()}
                />
              </CellBox>
              <CellBox>
                <DoneCard
                  item={done()}
                  dataTypes={dataTypeOrder()}
                  iconById={iconById()}
                />
              </CellBox>
              <CellBox>
                <Show
                  when={doingCards().length > 0}
                  fallback={<PlaceholderCard />}
                >
                  <NarrowStack class="sui-xb__doing-stack">
                    <For each={doingCards()}>
                      {(d) => (
                        <DoingCard
                          item={d}
                          dataTypes={dataTypeOrder()}
                          iconById={iconById()}
                          multiBatchAbove={multiBatchAbove()}
                          progress={progress}
                        />
                      )}
                    </For>
                  </NarrowStack>
                </Show>
              </CellBox>
              <CellBox>
                <TodoCard
                  item={todoNext()}
                  dataTypes={dataTypeOrder()}
                  iconById={iconById()}
                />
              </CellBox>
              <CenteredStack class="sui-xb__lozenge" data-flip-lozenge={cat}>
                <LozengeCell remaining={remaining()} />
              </CenteredStack>
            </StretchRow>
          );
        }}
      </For>
    </NarrowStack>
  );
};

// ---------------------------------------------------------------------------
// Curried factory (ADR-0001). Bake the config in once; the returned component
// takes the reactive `tables` (+ any div attrs) only.
// ---------------------------------------------------------------------------

export type ExtractionBoardDataProps = Omit<ExtractionBoardProps, "config">;

export function createExtractionBoard(
  config: ExtractionBoardConfig,
): Component<ExtractionBoardDataProps> {
  return (props) => <ExtractionBoard {...mergeProps({ config }, props)} />;
}
