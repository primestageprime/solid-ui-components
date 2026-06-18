// lastReviewedAt: 2026-06-17
// lastReviewedBy: peter.stradinger
// ============================================
// ExtractionBoard — Composite swimlane board for an ETL extraction view.
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
import "./ExtractionBoard.css";

import { Surface } from "../Surface/Surface";
import { Text } from "../Text/Text";
import { StatusBadge } from "../Badge/StatusBadge";
import { CountChip } from "../Badge/CountChip";
import { Icon } from "../Icon/Icon";
import { Tooltip } from "../Tooltip/Tooltip";
import { ProportionalItem } from "../Layout/ProportionalStack";
import { SlotFillBar } from "../SlotFillBar/SlotFillBar";
import { BatchBar } from "../BatchBar/BatchBar";

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

// ---------------------------------------------------------------------------
// Defaults + small helpers.
// ---------------------------------------------------------------------------

const DEFAULT_MULTI_BATCH_ABOVE = 10_000;
const DEFAULT_COLUMNS = { summary: "Summary", done: "Done", doing: "Doing", todo: "Todo" };

const STATUS_RANK: Record<CategoryStatus, number> = {
  active: 0,
  pending: 1,
  complete: 2,
};

const FILL = "var(--sui-success, #22c55e)";
const TRACK = "var(--sui-bg-elevated, rgba(255,255,255,0.08))";
const BATCH_FILL = "var(--sui-info, #3b82f6)";
const PCT_SLOTS = 20;

const compact = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Two items are the "same card" iff the same table — keeps card refs STABLE
 *  between renders so a card recreates ONLY on a real transition (firing the
 *  slide/slurp), not on a plain rows-fill update (which would flicker). */
const sameName = (
  a: { name: string } | null,
  b: { name: string } | null,
): boolean => (a?.name ?? null) === (b?.name ?? null);

// ---------------------------------------------------------------------------
// Public props.
// ---------------------------------------------------------------------------

export interface ExtractionBoardProps extends JSX.HTMLAttributes<HTMLDivElement> {
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
    return local.tables.filter((t) => known.has(t.category));
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
    knownTables()
      .filter((t) => t.status === "doing")
      .map((t) => ({
        name: t.name,
        category: t.category,
        colsByType: t.colsByType,
        totalRows: t.totalRows,
        transferredRows: t.transferredRows,
        batches:
          t.totalRows > multiBatchAbove() ? t.batches : undefined,
      })),
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
    for (const item of doing) (out[item.category] ??= []).push(item);
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
    const sig = catOrder()
      .map((c) => sum[c].status)
      .join(",");
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
      doingNow
        .map((d) => `${d.category}:${d.name}`)
        .sort()
        .join(",");
    flip.sync(sig);
  });

  const rootClass = () =>
    local.class ? `sui-xb ${local.class}` : "sui-xb";

  return (
    <div class={rootClass()} ref={flip.setRoot} {...others}>
      {/* Column headers — equal-width columns that fill the row. */}
      <div class="sui-xb__row">
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
        <div class="sui-xb__lozenge" />
      </div>

      <For each={rowOrder()}>
        {(cat) => {
          // Stable refs unless the table itself changes → the Done/Todo cards
          // recreate ONLY on a transition (firing the slide/slurp).
          const done = createMemo<DoneItem | null>(
            () => doneByCategory()[cat],
            null,
            { equals: sameName },
          );
          const todoNext = createMemo<TodoItem | null>(
            () => todoByCategory()[cat].next,
            null,
            { equals: sameName },
          );
          const remaining = () => todoByCategory()[cat].remaining;
          const doingCards = () => doingByCategory()[cat] ?? [];
          return (
            <div class="sui-xb__row">
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
                  <div class="sui-xb__doing-stack">
                    <For each={doingCards()}>
                      {(d) => (
                        <DoingCard
                          item={d}
                          dataTypes={dataTypeOrder()}
                          iconById={iconById()}
                          multiBatchAbove={multiBatchAbove()}
                        />
                      )}
                    </For>
                  </div>
                </Show>
              </CellBox>
              <CellBox>
                <TodoCard
                  item={todoNext()}
                  dataTypes={dataTypeOrder()}
                  iconById={iconById()}
                />
              </CellBox>
              <div class="sui-xb__lozenge" data-flip-lozenge={cat}>
                <LozengeCell remaining={remaining()} />
              </div>
            </div>
          );
        }}
      </For>
    </div>
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

// ===========================================================================
// Internal card vocabulary (composed from SUI primitives).
// ===========================================================================

type DataTypeList = ExtractionBoardConfig["dataTypes"];
type IconMap = Map<string, DataTypeList[number]>;

interface StatProps {
  dataTypes: DataTypeList;
  iconById: IconMap;
}

const CARD_MIN_W = "200px";

/** Equal-WIDTH column cell (ProportionalItem weight 1 → flex 1 1 0 +
 *  min-width 0). scrollWhenSmall={false} → overflow visible so a sliding card
 *  isn't clipped at the next column's edge. */
function CellBox(props: { children: JSX.Element }) {
  return (
    <ProportionalItem weight={1} scrollWhenSmall={false}>
      {props.children}
    </ProportionalItem>
  );
}

function ColHeading(props: { children: JSX.Element }) {
  return (
    <Text variant="label" as="div">
      {props.children}
    </Text>
  );
}

function Muted(props: { children: JSX.Element }) {
  return (
    <Text variant="sublabel" as="div" color="var(--sui-text-muted)">
      {props.children}
    </Text>
  );
}

/** A card shell — a Surface that fills its column and never drops below the
 *  minimum width. Forwards data-flip-* attributes for the motion engine. */
function Card(props: { children: JSX.Element } & JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, others] = splitProps(props, ["children"]);
  return (
    <Surface
      padding="sm"
      radius="md"
      gap="sm"
      direction="column"
      minWidth={CARD_MIN_W}
      {...others}
    >
      {local.children}
    </Surface>
  );
}

/** Transparent, same-width placeholder for an empty swimlane cell. */
function PlaceholderCard() {
  return (
    <Surface
      padding="sm"
      radius="md"
      bg="transparent"
      borderColor="transparent"
      minWidth={CARD_MIN_W}
    />
  );
}

/** Column-type breakdown as centered "icon over count" cells (skips zeros). */
function ColTypes(props: { colsByType: Record<string, number> } & StatProps) {
  const nonZero = () =>
    props.dataTypes.filter((dt) => (props.colsByType[dt.id] ?? 0) > 0);
  return (
    <div class="sui-xb__coltypes">
      <For each={nonZero()}>
        {(dt) => (
          <Tooltip content={dt.label}>
            <div class="sui-xb__coltype">
              <Icon name={dt.icon} size="sm" />
              <Text variant="sublabel" as="div">
                {props.colsByType[dt.id]}
              </Text>
            </div>
          </Tooltip>
        )}
      </For>
    </div>
  );
}

/** Category status → Todo / Doing / Done badge. */
function SummaryBadge(props: { status: CategoryStatus }) {
  return (
    <Show
      when={props.status === "complete"}
      fallback={
        <Show
          when={props.status === "active"}
          fallback={<StatusBadge variant="pending" size="sm" label="Todo" />}
        >
          <StatusBadge variant="info" size="sm" label="Doing" />
        </Show>
      }
    >
      <StatusBadge variant="compliant" size="sm" label="Done" />
    </Show>
  );
}

/** A left-filling percentage bar (SlotFillBar with a fixed slot count). */
function PctBar(props: { pct: number }) {
  const done = () =>
    Math.round((Math.max(0, Math.min(100, props.pct)) / 100) * PCT_SLOTS);
  return (
    <SlotFillBar
      slots={PCT_SLOTS}
      done={done()}
      height={10}
      maxWidth={null}
      doneColor={FILL}
      todoColor={TRACK}
    />
  );
}

/** One status bar: [left #] · [══ fill ══] · [right #]. */
function BarRow(props: { left: string; right: string; pct: number }) {
  return (
    <div class="sui-xb__bar">
      <div class="sui-xb__bar-num">
        <Muted>{props.left}</Muted>
      </div>
      <div class="sui-xb__bar-fill">
        <PctBar pct={props.pct} />
      </div>
      <div class="sui-xb__bar-num">
        <Muted>{props.right}</Muted>
      </div>
    </div>
  );
}

// ---- Summary card ---------------------------------------------------------

function SummaryCard(props: { summary: CategorySummary } & StatProps) {
  const s = () => props.summary;
  const tablesPct = () =>
    s().totalTables > 0 ? (s().completedTables / s().totalTables) * 100 : 0;
  const rowsPct = () =>
    s().totalRows > 0 ? (s().completedRows / s().totalRows) * 100 : 0;
  return (
    <Card data-flip-anchor={s().category}>
      <div class="sui-xb__card-head">
        <Show when={s().description} fallback={<Text variant="label" as="div">{s().label}</Text>}>
          <Tooltip content={s().description!}>
            <Text variant="label" as="div">{s().label}</Text>
          </Tooltip>
        </Show>
        <SummaryBadge status={s().status} />
      </div>
      <ColTypes
        colsByType={s().colsByType}
        dataTypes={props.dataTypes}
        iconById={props.iconById}
      />
      <Show
        when={s().status === "active"}
        fallback={
          <div class="sui-xb__totals">
            <Muted>{s().totalTables} Tables</Muted>
            <Muted>{compact.format(s().totalRows)} Rows</Muted>
          </div>
        }
      >
        <div class="sui-xb__bars">
          <BarRow
            left={`${s().completedTables}`}
            right={`${s().totalTables}`}
            pct={tablesPct()}
          />
          <BarRow
            left={compact.format(s().completedRows)}
            right={compact.format(s().totalRows)}
            pct={rowsPct()}
          />
        </div>
      </Show>
    </Card>
  );
}

// ---- Done card ------------------------------------------------------------

function DoneCard(props: { item: DoneItem | null } & StatProps) {
  return (
    <Show when={props.item} fallback={<PlaceholderCard />} keyed>
      {(item) => (
        <Card data-flip-key={item.name} data-flip-cat={item.category}>
          <div class="sui-xb__card-head">
            <Text variant="label" as="div">{item.name}</Text>
            <Show
              when={item.skipped}
              fallback={<StatusBadge variant="compliant" size="sm" label="Done" />}
            >
              <StatusBadge variant="warning" size="sm" label="Skipped" />
            </Show>
          </div>
          <ColTypes
            colsByType={item.colsByType}
            dataTypes={props.dataTypes}
            iconById={props.iconById}
          />
          <div class="sui-xb__totals">
            <Muted>
              {item.skipped ? "Empty" : `${compact.format(item.totalRows)} Rows`}
            </Muted>
          </div>
        </Card>
      )}
    </Show>
  );
}

// ---- Doing card -----------------------------------------------------------

function DoingCard(
  props: { item: DoingItem; multiBatchAbove: number } & StatProps,
) {
  const d = () => props.item;
  const pct = () =>
    d().totalRows > 0 ? (d().transferredRows / d().totalRows) * 100 : 0;
  const multi = () => d().totalRows > props.multiBatchAbove && !!d().batches;
  const b = () => d().batches!;
  const donePct = () => (b().total > 0 ? (b().done / b().total) * 100 : 0);
  const inFlightPct = () => {
    const tot = b().total || 1;
    const n = Math.min(b().inFlight.length, tot - b().done);
    return (n / tot) * 100;
  };
  return (
    <Card data-flip-key={d().name} data-flip-cat={d().category}>
      <div class="sui-xb__card-head">
        <Text variant="label" as="div">{d().name}</Text>
        <StatusBadge variant="info" size="sm" label="Doing" />
      </div>
      <ColTypes
        colsByType={d().colsByType}
        dataTypes={props.dataTypes}
        iconById={props.iconById}
      />
      <Show
        when={multi()}
        fallback={
          <div class="sui-xb__bars">
            <BarRow
              left={compact.format(d().transferredRows)}
              right={compact.format(d().totalRows)}
              pct={pct()}
            />
          </div>
        }
      >
        <div class="sui-xb__bar">
          <div class="sui-xb__bar-num">
            <Muted>{compact.format(d().transferredRows)}</Muted>
          </div>
          <div class="sui-xb__bar-fill">
            <BatchBar
              height={20}
              maxWidth={null}
              doneColor={FILL}
              batchColor={BATCH_FILL}
              todoColor={TRACK}
              donePct={donePct()}
              inFlightPct={inFlightPct()}
              batches={b().inFlight}
            />
          </div>
          <div class="sui-xb__bar-num">
            <Muted>{compact.format(d().totalRows)}</Muted>
          </div>
        </div>
      </Show>
    </Card>
  );
}

// ---- Todo card ------------------------------------------------------------

function TodoCard(props: { item: TodoItem | null } & StatProps) {
  return (
    <Show when={props.item} fallback={<PlaceholderCard />} keyed>
      {(item) => (
        <Card data-flip-key={item.name} data-flip-cat={item.category}>
          <div class="sui-xb__card-head">
            <Text variant="label" as="div">{item.name}</Text>
            <StatusBadge variant="pending" size="sm" label="Todo" />
          </div>
          <ColTypes
            colsByType={item.colsByType}
            dataTypes={props.dataTypes}
            iconById={props.iconById}
          />
          <div class="sui-xb__totals">
            <Muted>{compact.format(item.totalRows)} Rows</Muted>
          </div>
        </Card>
      )}
    </Show>
  );
}

// ---- +N lozenge -----------------------------------------------------------

function LozengeCell(props: { remaining: number }) {
  // The next todo is already shown as a card, so the lozenge counts the REST.
  const extra = () => Math.max(0, props.remaining - 1);
  return (
    <Show when={extra() > 0}>
      <CountChip count={extra()} label="more" />
    </Show>
  );
}
