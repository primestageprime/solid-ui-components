// FilterBar showcase — eight dimensions, which is the case that forces tier
// three. The bench this was promoted from (workshop → Matchmaking Filter Bar)
// exercises it against generated data and a real filter engine; this gallery
// entry is about the COMPONENT: what it looks like, and what it does when the
// line runs out.
import { type Component, createSignal } from "solid-js";
import { FilterBar, type FilterGroup } from "../../src/components/FilterBar";
import { PaddedStack, TightStack } from "../../src/components/Layout";
import { TextBody } from "../../src/components/Text";
import { filter, find, map } from "../../src/fn";

const DIMENSIONS = [
  { id: "rep", label: "Rep" },
  { id: "region", label: "Region" },
  { id: "order_type", label: "Order type" },
  { id: "customer", label: "Customer" },
  { id: "status", label: "Status" },
  { id: "brand", label: "Brand" },
  { id: "item_type", label: "Item type" },
  { id: "product_line", label: "Product line" },
];

/** Fixture helper — keeps the data table readable and free of method chains. */
const named = (labels: string[]) =>
  map((n: string) => ({ value: n.toLowerCase(), label: n }), labels);

const MEMBERS: Record<string, { value: string; label: string }[]> = {
  rep: named(["Avery", "Blake", "Casey", "Devon"]),
  region: named(["EMEA", "AMER", "APAC"]),
  order_type: named(["Standard", "Rush", "Backorder"]),
  customer: named(["Northwind", "Contoso", "Fabrikam", "Tailspin"]),
  status: named(["Open", "Shipped", "Invoiced"]),
  brand: named(["Cleco", "Desoutter", "Robotize"]),
  item_type: named(["Tool", "Part", "Service"]),
  product_line: named(["Assembly", "Fastening", "Material removal"]),
};

/** Selection state, keyed by dimension. An empty array means "all". */
type Selection = Record<string, string[]>;

export const FilterBarShowcase: Component = () => {
  const [selection, setSelection] = createSignal<Selection>({
    region: ["emea"],
    status: ["open", "shipped"],
  });

  // The caller derives `filters` straight from its selection — the bar holds no
  // filter state of its own, so this is the whole integration.
  const chosen = (id: string): string[] => selection()[id] ?? [];

  const filters = (): FilterGroup[] =>
    map(
      (d: { id: string; label: string }) => ({
        id: d.id,
        label: d.label,
        terms: map(
          (v: string) => ({
            value: v,
            label:
              find((m: { value: string }) => m.value === v, MEMBERS[d.id])
                ?.label ?? v,
          }),
          chosen(d.id),
        ),
        members: MEMBERS[d.id],
      }),
      filter((d: { id: string }) => chosen(d.id).length > 0, DIMENSIONS),
    );

  const available = () =>
    filter((d: { id: string }) => chosen(d.id).length === 0, DIMENSIONS);

  const edit = (id: string, next: string[]) =>
    setSelection((prev) => {
      const out = { ...prev };
      // Pruning an emptied group is the CALLER's choice — see the note below.
      if (next.length === 0) delete out[id];
      else out[id] = next;
      return out;
    });

  return (
    <PaddedStack>
      <h2>FilterBar — Composed (Depth 1)</h2>
      <TightStack>
        <TextBody>
          Height-locked to one line; every expansion is an overlay, so filtering
          never pushes the content below it down. Add filters until the row
          fills — trailing groups collapse into a <code>+N</code> chip rather
          than being clipped, and stay reachable and removable through it.
        </TextBody>
        <TextBody>
          Selection is the caller's; the bar holds only which menu is open and
          the typeahead query. An empty selection means <em>all</em>. A
          dimension added from <code>(+)</code> but not yet given a term is the
          bar's own state and is never reported to the caller — so a caller
          serialising filters to a URL never encodes a half-made filter.
        </TextBody>
      </TightStack>

      <FilterBar
        filters={filters()}
        availableDimensions={available()}
        scopeLabel="all orders"
        onRemoveFilter={(id) => edit(id, [])}
        onAddTerm={(id, value) => edit(id, [...chosen(id), value])}
        onRemoveTerm={(id, value) =>
          edit(
            id,
            filter((v: string) => v !== value, chosen(id)),
          )
        }
        onClearAll={() => setSelection({})}
      />

      <TextBody>
        Selection: <code>{JSON.stringify(selection())}</code>
      </TextBody>
    </PaddedStack>
  );
};
