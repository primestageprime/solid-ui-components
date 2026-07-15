import { type Component, createMemo, createSignal } from "solid-js";
import { Combobox, type ComboboxOption } from "../../src/components/Combobox";
import { Stack } from "../../src/components/Layout/Stack";
import { NarrowStack } from "../../src/components/Layout";
import { Text } from "../../src/components/Text/Text";

const INITIAL_COUNTRIES: ComboboxOption[] = [
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "de", label: "Germany" },
  { value: "jp", label: "Japan" },
  { value: "br", label: "Brazil" },
];

const INITIAL_TAGS: ComboboxOption[] = [
  { value: "performance", label: "Performance" },
  { value: "reliability", label: "Reliability" },
  { value: "security", label: "Security" },
];

// Large catalog for the onInputChange filter demo.
const CATALOG: ComboboxOption[] = [
  "Aluminum",
  "Brass",
  "Bronze",
  "Carbon Steel",
  "Cast Iron",
  "Chromium",
  "Cobalt",
  "Copper",
  "Gold",
  "Inconel",
  "Lead",
  "Magnesium",
  "Molybdenum",
  "Nickel",
  "Platinum",
  "Silver",
  "Stainless Steel",
  "Tin",
  "Titanium",
  "Tungsten",
  "Zinc",
].map((label) => ({ value: label.toLowerCase().replace(/\s+/g, "-"), label }));

export const ComboboxShowcase: Component = () => {
  // Single-mode
  const [countries, setCountries] =
    createSignal<ComboboxOption[]>(INITIAL_COUNTRIES);
  const [country, setCountry] = createSignal<ComboboxOption | null>(null);

  const addCountry = (label: string) => {
    const created: ComboboxOption = {
      value: label.toLowerCase().replace(/\s+/g, "-"),
      label,
    };
    setCountries([...countries(), created]);
    setCountry(created);
  };

  // Multi-mode
  const [tags, setTags] = createSignal<ComboboxOption[]>(INITIAL_TAGS);
  const [selectedTags, setSelectedTags] = createSignal<ComboboxOption[]>([
    INITIAL_TAGS[0],
  ]);

  const addTag = (label: string) => {
    const created: ComboboxOption = {
      value: label.toLowerCase().replace(/\s+/g, "-"),
      label,
    };
    setTags([...tags(), created]);
    setSelectedTags([...selectedTags(), created]);
  };

  // Disabled demo — a pre-selected, read-only combobox.
  const [lockedCountry] = createSignal<ComboboxOption | null>(
    INITIAL_COUNTRIES[0],
  );

  // onInputChange demo — parent-side filter against a catalog.
  const [query, setQuery] = createSignal("");
  const [material, setMaterial] = createSignal<ComboboxOption | null>(null);
  const filteredCatalog = createMemo(() => {
    const q = query().trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.filter((opt) => opt.label.toLowerCase().includes(q));
  });

  return (
    <div class="component-section">
      <h2>Combobox — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (Combobox.css). Unified single + multi built on
        `@kobalte/core/combobox`. Supports freeform creation via `onCreate`
        (Enter key on a non-matching input). Multi-mode renders a chip list with
        per-chip removal and a Clear-all control.
      </p>

      <div class="example-group">
        <h3>Single-mode with create-on-Enter</h3>
        <NarrowStack>
          <div class="text-meta">
            Type a country and press Enter — the parent appends to `options` and
            selects it.
          </div>
          <div style={{ "max-width": "320px" }}>
            <Combobox
              placeholder="Search or create country…"
              options={countries}
              value={country}
              onChange={setCountry}
              onCreate={addCountry}
            />
          </div>
        </NarrowStack>
        <Text variant="sublabel">Selected: {country()?.label ?? "(none)"}</Text>
      </div>

      <div class="example-group">
        <h3>Multi-mode with chips + create</h3>
        <NarrowStack>
          <div class="text-meta">
            `multiple` flips to chip list. `showChips` defaults to `true`; set to
            `false` to hide the chip header and rely on the inline listbox
            indicators.
          </div>
          <div style={{ "max-width": "420px" }}>
            <Combobox
              multiple
              placeholder="Tag or create…"
              options={tags}
              value={selectedTags}
              onChange={setSelectedTags}
              onCreate={addTag}
              onRemove={(opt) => console.log("removed", opt.label)}
            />
          </div>
        </NarrowStack>
        <Stack gap="xs">
          <Text variant="sublabel">
            Selected count: {selectedTags().length}
          </Text>
          <Text variant="sublabel">
            Labels:{" "}
            {selectedTags()
              .map((o) => o.label)
              .join(", ") || "(none)"}
          </Text>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Multi-mode, showChips=false</h3>
        <NarrowStack>
          <div class="text-meta">
            No chip list — selected state is indicated via the listbox check
            marks only.
          </div>
          <div style={{ "max-width": "420px" }}>
            <Combobox
              multiple
              showChips={false}
              placeholder="Pick tags…"
              options={tags}
              value={selectedTags}
              onChange={setSelectedTags}
            />
          </div>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Disabled</h3>
        <NarrowStack>
          <div class="text-meta">
            `disabled` is forwarded to both the input and the trigger. Opacity
            drops and pointer events are suppressed.
          </div>
          <div style={{ "max-width": "320px" }}>
            <Combobox
              placeholder="Locked"
              options={() => INITIAL_COUNTRIES}
              value={lockedCountry}
              disabled
            />
          </div>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>onInputChange — parent-side filtering</h3>
        <NarrowStack>
          <div class="text-meta">
            `onInputChange` fires on every keystroke. Here the parent derives a
            filtered option list via `createMemo` — type "st" to see only
            Stainless Steel.
          </div>
          <div style={{ "max-width": "320px" }}>
            <Combobox
              placeholder="Search materials…"
              options={filteredCatalog}
              value={material}
              onChange={setMaterial}
              onInputChange={setQuery}
            />
          </div>
        </NarrowStack>
        <Stack gap="xs">
          <Text variant="sublabel">Query: {query() || "(empty)"}</Text>
          <Text variant="sublabel">
            Visible options: {filteredCatalog().length} / {CATALOG.length}
          </Text>
          <Text variant="sublabel">
            Selected: {material()?.label ?? "(none)"}
          </Text>
        </Stack>
      </div>
    </div>
  );
};
