import { Component, createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import {
  ProductGrid,
  isSolutionSatisfied,
  type ProductGridItem,
  type ProductGridSelection,
  type ProductGridWorkCounts,
} from "../../src/components/ProductGrid";
import { NarrowStack, ContentStack, ClusterRow, FlexRow } from "../../src/components/Layout";
import { TextLabel, MutedBody, PageTitle } from "../../src/components/Text";
import { BaseTable, type TableColumn } from "../../src/components/Table";

interface Dataset {
  id: string;
  label: string;
  hint: string;
  areaOrder: string[];
  items: ProductGridItem[];
}

const ELEMENTS_DATASET: Dataset = {
  id: "elements",
  label: "elements",
  hint: "earth · air · fire · water",
  areaOrder: ["earth", "air", "fire", "water"],
  items: [
    { id: "e-dog-b1", area: "earth", focus: "dog",     position: "below", shortName: "Accumulate Wealth", description: "Build up enough resources to weather hard winters.", solvedBy: ["e-dog-a1"] },
    { id: "e-dog-b2", area: "earth", focus: "dog",     position: "below", shortName: "Guard Territory",   description: "Keep the homestead safe from predators and trespassers.", solvedBy: ["e-dog-a1"] },
    { id: "e-dog-a1", area: "earth", focus: "dog",     position: "above", shortName: "Found Industry",    description: "Stand up workshops and trade routes that produce reliable income.", work: { todo: 4, doing: 2, done: 7 } },
    { id: "e-pig-b1", area: "earth", focus: "pig",     position: "below", shortName: "Wallow in Mud",     description: "Cool the body and shed parasites in soft mud.", solvedBy: ["e-pig-a1"] },
    { id: "e-pig-a1", area: "earth", focus: "pig",     position: "above", shortName: "Build Sty",         description: "Construct a shelter that keeps mud handy and weather out.", work: { todo: 0, doing: 0, done: 4 } },
    { id: "e-pig-a2", area: "earth", focus: "pig",     position: "above", shortName: "Forage Truffles",   description: "Sniff out high-value tubers in the surrounding woods.", work: { todo: 5, doing: 3, done: 1 } },
    { id: "a-brd-b1", area: "air",   focus: "bird",    position: "below", shortName: "Find Updraft",      description: "Locate rising air to gain altitude without flapping.", solvedBy: ["a-brd-a1"] },
    { id: "a-brd-b2", area: "air",   focus: "bird",    position: "below", shortName: "Gather Twigs",      description: "Collect nest material from the local area.", solvedBy: ["a-brd-a2"] },
    { id: "a-brd-a1", area: "air",   focus: "bird",    position: "above", shortName: "Soar on Thermals",  description: "Ride columns of warm air across long distances.", work: { todo: 2, doing: 1, done: 4 } },
    { id: "a-brd-a2", area: "air",   focus: "bird",    position: "above", shortName: "Sing at Dawn",      description: "Establish vocal territory with the morning chorus.", work: { todo: 0, doing: 0, done: 8 } },
    { id: "f-drg-b1", area: "fire",  focus: "dragon",  position: "below", shortName: "Hoard Gold",        description: "Amass a defensible pile of treasure.", solvedBy: ["f-drg-a1"] },
    { id: "f-drg-b2", area: "fire",  focus: "dragon",  position: "below", shortName: "Brood on Eggs",     description: "Incubate the next generation deep in the lair.", solvedBy: ["f-drg-a1"] },
    { id: "f-drg-b3", area: "fire",  focus: "dragon",  position: "below", shortName: "Sleep Deeply",      description: "Recover energy through long, undisturbed rest.", solvedBy: ["f-drg-a1"] },
    { id: "f-drg-a1", area: "fire",  focus: "dragon",  position: "above", shortName: "Breathe Flame",     description: "Exhale a controlled jet of fire on demand.", work: { todo: 8, doing: 0, done: 0 } },
    { id: "f-phx-b1", area: "fire",  focus: "phoenix", position: "below", shortName: "Burn to Ash",       description: "Combust completely so the cycle can begin again.", solvedBy: ["f-phx-a1"] },
    { id: "f-phx-a1", area: "fire",  focus: "phoenix", position: "above", shortName: "Rise Reborn",       description: "Re-form intact from the ashes after combustion.", work: { todo: 1, doing: 1, done: 9 } },
    { id: "f-phx-a2", area: "fire",  focus: "phoenix", position: "above", shortName: "Ignite the Sky",    description: "Set the dawn on fire with a high display flight.", work: { todo: 3, doing: 4, done: 2 } },
    { id: "f-phx-a3", area: "fire",  focus: "phoenix", position: "above", shortName: "Carry Embers",      description: "Transport burning coals across long distances.", work: { todo: 6, doing: 0, done: 1 } },
    { id: "w-snk-b1", area: "water", focus: "snake",   position: "below", shortName: "Bask in Sun",       description: "Raise body temperature on warm rocks at midday.", solvedBy: ["w-fsh-a1"] },
    { id: "w-fsh-a1", area: "water", focus: "fish",    position: "above", shortName: "Bask in Water",     description: "Float in still water to absorb diffuse light.", work: { todo: 0, doing: 0, done: 5 } },
  ],
};

const STATEMENTS_DATASET: Dataset = {
  id: "statements",
  label: "statements",
  hint: "products × features",
  areaOrder: ["AMYGDALA", "JTF", "RHINO"],
  items: [
    { id: "s-amy-dag-a1", area: "AMYGDALA", focus: "DAG-CHART", position: "above", shortName: "Hover Tooltip",      description: "Add tooltip on dag chart node hover.",                                  work: { todo: 0, doing: 0, done: 5 } },
    { id: "s-amy-dag-a2", area: "AMYGDALA", focus: "DAG-CHART", position: "above", shortName: "Fix Save Race",      description: "Fix race condition in the dag chart save handler.",                     work: { todo: 3, doing: 1, done: 2 } },
    { id: "s-amy-dag-a3", area: "AMYGDALA", focus: "DAG-CHART", position: "above", shortName: "Refactor Resolver",  description: "Refactor dag chart column resolution to share with backend.",           work: { todo: 4, doing: 0, done: 0 } },
    { id: "s-amy-dag-b1", area: "AMYGDALA", focus: "DAG-CHART", position: "below", shortName: "Stable Editing",     description: "DAG chart editing must not lose user state under churn.",               solvedBy: ["s-amy-dag-a2", "s-amy-dag-a3"] },
    { id: "s-amy-dag-b2", area: "AMYGDALA", focus: "DAG-CHART", position: "below", shortName: "Friendly Hover",     description: "Hovering a node should reveal its full identity in under 100ms.",       solvedBy: ["s-amy-dag-a1"] },
    { id: "s-amy-imp-a1", area: "AMYGDALA", focus: "IMPORT",    position: "above", shortName: "Stream Errors",      description: "Tighten error message when import upload fails mid-stream.",            work: { todo: 2, doing: 1, done: 1 } },
    { id: "s-amy-imp-a2", area: "AMYGDALA", focus: "IMPORT",    position: "above", shortName: "CSV Export",         description: "Add CSV export to import history.",                                     work: { todo: 0, doing: 0, done: 3 } },
    { id: "s-amy-imp-b1", area: "AMYGDALA", focus: "IMPORT",    position: "below", shortName: "Trustworthy Import", description: "Bulk imports should never silently drop rows.",                         solvedBy: ["s-amy-imp-a2"] },
    { id: "s-jtf-dsh-a1", area: "JTF",      focus: "DASHBOARD", position: "above", shortName: "Empty State",        description: "Improve empty-state copy on the dashboard.",                            work: { todo: 0, doing: 0, done: 4 } },
    { id: "s-jtf-dsh-a2", area: "JTF",      focus: "DASHBOARD", position: "above", shortName: "Skeleton Rows",      description: "Add per-row loading skeleton to the dashboard list.",                   work: { todo: 2, doing: 1, done: 2 } },
    { id: "s-jtf-dsh-b1", area: "JTF",      focus: "DASHBOARD", position: "below", shortName: "First Paint Fast",   description: "Dashboard must paint within 200ms on a cold cache.",                    solvedBy: ["s-jtf-dsh-a1", "s-jtf-dsh-a2"] },
    { id: "s-jtf-mtr-a1", area: "JTF",      focus: "METRICS",   position: "above", shortName: "Audit Log Wiring",   description: "Wire metrics up to the new audit-log table.",                           work: { todo: 5, doing: 2, done: 1 } },
    { id: "s-jtf-mtr-b1", area: "JTF",      focus: "METRICS",   position: "below", shortName: "Reliable Metrics",   description: "Metrics surface should never lag the source of truth.",                 solvedBy: ["s-jtf-mtr-a1"] },
    { id: "s-rhi-aut-a1", area: "RHINO",    focus: "AUTH",      position: "above", shortName: "v2 Migration",       description: "Migrate auth to the v2 endpoint.",                                      work: { todo: 4, doing: 1, done: 1 } },
    { id: "s-rhi-aut-a2", area: "RHINO",    focus: "AUTH",      position: "above", shortName: "Lazy Bundle",        description: "Reduce auth bundle size by lazy-loading.",                              work: { todo: 0, doing: 0, done: 6 } },
    { id: "s-rhi-aut-b1", area: "RHINO",    focus: "AUTH",      position: "below", shortName: "Quick Login",        description: "Login flow should complete under 500ms after credentials are entered.", solvedBy: ["s-rhi-aut-a2"] },
    { id: "s-rhi-aut-b2", area: "RHINO",    focus: "AUTH",      position: "below", shortName: "Stable Sessions",    description: "Sessions persist seamlessly across deploys.",                           solvedBy: ["s-rhi-aut-a1"] },
    { id: "s-rhi-whk-a1", area: "RHINO",    focus: "WEBHOOKS",  position: "above", shortName: "Inline Validation",  description: "Surface validation errors inline on the webhooks form.",                work: { todo: 0, doing: 0, done: 4 } },
    { id: "s-rhi-whk-b1", area: "RHINO",    focus: "WEBHOOKS",  position: "below", shortName: "Reliable Delivery",  description: "Webhook deliveries must retry until acknowledged.",                     solvedBy: ["s-rhi-whk-a1"] },
  ],
};

const DATASETS: Dataset[] = [ELEMENTS_DATASET, STATEMENTS_DATASET];

const seedWorkFor = (ds: Dataset): Record<string, ProductGridWorkCounts> => {
  const r: Record<string, ProductGridWorkCounts> = {};
  for (const it of ds.items) {
    if (it.position === "above" && it.work) r[it.id] = { ...it.work };
  }
  return r;
};

export const ProductGridShowcase: Component = () => {
  const [activeDatasetId, setActiveDatasetId] = createSignal<string>(DATASETS[0].id);
  const dataset = createMemo(
    () => DATASETS.find((d) => d.id === activeDatasetId()) ?? DATASETS[0],
  );

  // Animated work store: one unit moves per tick (doing→done first, then
  // todo→doing); reseeds when the dataset switches or all work completes.
  const [work, setWork] = createStore<Record<string, ProductGridWorkCounts>>(
    seedWorkFor(DATASETS[0]),
  );
  const [selection, setSelection] = createSignal<ProductGridSelection>(null);

  createEffect(() => {
    const ds = dataset();
    setSelection(null);
    setWork(seedWorkFor(ds));
  });

  const aboveIds = createMemo(() =>
    dataset().items.filter((it) => it.position === "above" && it.work).map((it) => it.id),
  );

  const TICK_MS = 700;
  const advance = () => {
    const ids = aboveIds();
    const inFlight = ids.find((id) => (work[id]?.doing ?? 0) > 0);
    if (inFlight) {
      setWork(inFlight, "doing", (n) => n - 1);
      setWork(inFlight, "done", (n) => n + 1);
      return;
    }
    const pending = ids.find((id) => (work[id]?.todo ?? 0) > 0);
    if (pending) {
      setWork(pending, "todo", (n) => n - 1);
      setWork(pending, "doing", (n) => n + 1);
      return;
    }
    setWork(seedWorkFor(dataset()));
  };
  let timer: number | undefined;
  onMount(() => {
    timer = window.setInterval(advance, TICK_MS);
  });
  onCleanup(() => {
    if (timer !== undefined) window.clearInterval(timer);
  });

  // Compute the table's filter from the current selection.
  const isSatisfied = (id: string) => isSolutionSatisfied(work[id]);
  const isMet = (need: ProductGridItem) => {
    if (!need.solvedBy?.length) return false;
    return need.solvedBy.every(isSatisfied);
  };
  const filteredIds = createMemo<Set<string>>(() => {
    const sel = selection();
    if (!sel) return new Set();
    const items = dataset().items;
    if (sel.kind === "focus") {
      return new Set(items.filter((it) => it.area === sel.area && it.focus === sel.focus).map((it) => it.id));
    }
    const it = items.find((x) => x.id === sel.id);
    if (!it) return new Set();
    const ids = new Set<string>([sel.id]);
    if (it.position === "below") for (const s of it.solvedBy ?? []) ids.add(s);
    else for (const x of items) if (x.position === "below" && x.solvedBy?.includes(sel.id)) ids.add(x.id);
    return ids;
  });
  const tableRows = () => {
    const ids = filteredIds();
    const all = dataset().items;
    return ids.size === 0 ? all : all.filter((it) => ids.has(it.id));
  };
  const fmtWork = (it: ProductGridItem) => {
    const w = work[it.id];
    return w ? `${w.done} / ${w.doing} / ${w.todo}` : "—";
  };
  const status = (it: ProductGridItem) =>
    it.position === "above"
      ? isSatisfied(it.id) ? "satisfied" : "in flight"
      : isMet(it) ? "met" : "unmet";
  const columns: TableColumn<ProductGridItem>[] = [
    { id: "area",        header: "area",            accessor: "area" as const,        width: "110px" },
    { id: "focus",       header: "focus",           accessor: "focus" as const,       width: "120px" },
    { id: "position",    header: "line",            accessor: (r) => r.position,      width: "70px" },
    { id: "shortName",   header: "short name",      accessor: "shortName" as const,   width: "180px" },
    { id: "description", header: "description",     accessor: "description" as const },
    { id: "work",        header: "done/doing/todo", accessor: (r) => fmtWork(r),      width: "140px", align: "right" as const },
    { id: "solvedBy",    header: "solved by",       accessor: (r) => (r.solvedBy ?? []).join(", ") || "—", width: "180px" },
    { id: "status",      header: "status",          accessor: status,                 width: "100px" },
  ];

  return (
    <NarrowStack style={{ padding: "20px 24px" }}>
      <PageTitle style={{ margin: 0, "font-size": "1.25rem" }}>ProductGrid</PageTitle>
      <MutedBody>
        Each sub-column is a focus within its area. Above-the-line solutions
        sit on top, below-the-line needs at the bottom, with the focus label
        between them. Click a card to filter the table to its related items;
        click a focus to highlight its whole sub-column. Work flows
        todo → doing → done one unit per tick.
      </MutedBody>
      <ClusterRow gap="xs">
        <For each={DATASETS}>
          {(ds) => {
            const active = () => activeDatasetId() === ds.id;
            return (
              <button
                onClick={() => setActiveDatasetId(ds.id)}
                title={ds.hint}
                style={{
                  padding: "4px 12px",
                  "border-radius": "999px",
                  border: active()
                    ? "1px solid var(--sui-accent, #4ea1ff)"
                    : "1px solid var(--sui-border)",
                  background: active()
                    ? "color-mix(in srgb, var(--sui-accent, #4ea1ff) 18%, transparent)"
                    : "transparent",
                  color: active()
                    ? "var(--sui-accent, #4ea1ff)"
                    : "var(--sui-text-muted, #888)",
                  cursor: "pointer",
                  "font-size": "12px",
                }}
              >
                {ds.label}
              </button>
            );
          }}
        </For>
      </ClusterRow>
      <ProductGrid
        items={dataset().items}
        areaOrder={dataset().areaOrder}
        work={work}
        selection={selection()}
        onSelectionChange={setSelection}
      />
      <ContentStack>
        <FlexRow gap="sm" align="center">
          <TextLabel>
            items{" "}
            <span style={{ color: "var(--sui-text-muted)" }}>
              {tableRows().length} of {dataset().items.length}
            </span>
          </TextLabel>
          <Show when={selection()}>
            <button
              onClick={() => setSelection(null)}
              style={{
                "font-size": "12px",
                padding: "3px 10px",
                border: "1px solid var(--sui-border)",
                background: "transparent",
                color: "var(--sui-text-muted, #888)",
                "border-radius": "10px",
                cursor: "pointer",
              }}
            >
              clear filter
            </button>
          </Show>
        </FlexRow>
        <BaseTable
          data={tableRows()}
          columns={columns}
          hoverable
          striped
          compact
          onRowClick={(row) =>
            setSelection((cur) =>
              cur && cur.kind === "item" && cur.id === row.id ? null : { kind: "item", id: row.id },
            )
          }
        />
      </ContentStack>
    </NarrowStack>
  );
};
