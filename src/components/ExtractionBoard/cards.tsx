// ============================================
// ExtractionBoard — internal card vocabulary.
// The presentational layer composed from SUI primitives (columns, cards, bars,
// badges). Extracted from ExtractionBoard.tsx; the board orchestrator imports
// the exported pieces (CellBox, ColHeading, the four cards, LozengeCell,
// PlaceholderCard). Owns none of the board's data/derivation/motion.
// ============================================
import { type JSX, Show, For, splitProps } from "solid-js";
import { Surface } from "../Surface/Surface";
import { Text } from "../Text/Text";
import { StatusBadge } from "../Badge/StatusBadge";
import { CountChip } from "../Badge/CountChip";
import { Icon } from "../Icon/Icon";
import { Tooltip } from "../Tooltip/Tooltip";
import { ProportionalItem } from "../Layout/ProportionalStack";
import { SlotFillBar } from "../SlotFillBar/SlotFillBar";
import { BatchBar, type BatchSpec } from "../BatchBar/BatchBar";
import type { ProgressController } from "../../internal/progress/useProgressEngine";
import type {
  CategoryStatus,
  CategorySummary,
  DoneItem,
  DoingItem,
  TodoItem,
  ExtractionBoardConfig,
} from "./types";

// Card palette + compact number formatting, shared across the vocabulary below.
const FILL = "var(--sui-success, #22c55e)";
const TRACK = "var(--sui-bg-elevated, rgba(255,255,255,0.08))";
const BATCH_FILL = "var(--sui-info, #3b82f6)";
const PCT_SLOTS = 20;

const compact = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

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
export function CellBox(props: { children: JSX.Element }) {
  return (
    <ProportionalItem weight={1} scrollWhenSmall={false}>
      {props.children}
    </ProportionalItem>
  );
}

export function ColHeading(props: { children: JSX.Element }) {
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
function Card(
  props: { children: JSX.Element } & JSX.HTMLAttributes<HTMLDivElement>,
) {
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
export function PlaceholderCard() {
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

export function SummaryCard(props: { summary: CategorySummary } & StatProps) {
  const s = () => props.summary;
  const tablesPct = () =>
    s().totalTables > 0 ? (s().completedTables / s().totalTables) * 100 : 0;
  const rowsPct = () =>
    s().totalRows > 0 ? (s().completedRows / s().totalRows) * 100 : 0;
  return (
    <Card data-flip-anchor={s().category}>
      <div class="sui-xb__card-head">
        <Show
          when={s().description}
          fallback={
            <Text variant="label" as="div">
              {s().label}
            </Text>
          }
        >
          <Tooltip content={s().description!}>
            <Text variant="label" as="div">
              {s().label}
            </Text>
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

export function DoneCard(props: { item: DoneItem | null } & StatProps) {
  return (
    <Show when={props.item} fallback={<PlaceholderCard />} keyed>
      {(item) => (
        <Card data-flip-key={item.name} data-flip-cat={item.category}>
          <div class="sui-xb__card-head">
            <Text variant="label" as="div">
              {item.name}
            </Text>
            <Show
              when={item.skipped}
              fallback={
                <StatusBadge variant="compliant" size="sm" label="Done" />
              }
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
              {item.skipped
                ? "Empty"
                : `${compact.format(item.totalRows)} Rows`}
            </Muted>
          </div>
        </Card>
      )}
    </Show>
  );
}

// ---- Doing card -----------------------------------------------------------

export function DoingCard(
  props: {
    item: DoingItem;
    multiBatchAbove: number;
    progress: ProgressController;
  } & StatProps,
) {
  const d = () => props.item;
  const multi = () => d().totalRows > props.multiBatchAbove && !!d().batches;

  // Declarative batches handed straight to BatchBar. A small (single-fill)
  // table carries no `batches`, so we synthesize ONE batch of the whole table,
  // running while the card is in the Doing column. Either way the BatchBar
  // observes/measures/eases internally off the SHARED board controller, so the
  // estimate sharpens across every bar.
  const batches = (): BatchSpec[] =>
    multi()
      ? d().batches!
      : [
          {
            rows: Math.max(0, d().totalRows - d().transferredRows),
            state: "running",
          },
        ];

  return (
    <Card data-flip-key={d().name} data-flip-cat={d().category}>
      <div class="sui-xb__card-head">
        <Text variant="label" as="div">
          {d().name}
        </Text>
        <StatusBadge variant="info" size="sm" label="Doing" />
      </div>
      <ColTypes
        colsByType={d().colsByType}
        dataTypes={props.dataTypes}
        iconById={props.iconById}
      />
      <div class="sui-xb__bar">
        <div class="sui-xb__bar-num">
          <Muted>{compact.format(d().transferredRows)}</Muted>
        </div>
        <div class="sui-xb__bar-fill">
          <BatchBar
            id={`${d().category}:${d().name}`}
            controller={props.progress}
            height={20}
            maxWidth={null}
            doneColor={FILL}
            batchColor={BATCH_FILL}
            todoColor={TRACK}
            totalRows={d().totalRows}
            committedRows={d().transferredRows}
            batches={batches()}
          />
        </div>
        <div class="sui-xb__bar-num">
          <Muted>{compact.format(d().totalRows)}</Muted>
        </div>
      </div>
    </Card>
  );
}

// ---- Todo card ------------------------------------------------------------

export function TodoCard(props: { item: TodoItem | null } & StatProps) {
  return (
    <Show when={props.item} fallback={<PlaceholderCard />} keyed>
      {(item) => (
        <Card data-flip-key={item.name} data-flip-cat={item.category}>
          <div class="sui-xb__card-head">
            <Text variant="label" as="div">
              {item.name}
            </Text>
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

export function LozengeCell(props: { remaining: number }) {
  // The next todo is already shown as a card, so the lozenge counts the REST.
  const extra = () => Math.max(0, props.remaining - 1);
  return (
    <Show when={extra() > 0}>
      <CountChip count={extra()} label="more" />
    </Show>
  );
}
