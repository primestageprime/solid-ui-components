// SearchInput — a 32px search box: search glyph, text, and a clear cross while there is text.
import { type Component, createSignal } from "solid-js";
import { SearchField, SearchInput } from "../../src/components/SearchInput";
import { Icon } from "../../src/components/Icon";
import { SectionTitle, MutedBody, TextSublabel } from "../../src/components/Text";

export const SearchInputShowcase: Component = () => {
  const [q, setQ] = createSignal("tasks");
  return (
    <div class="component-section component-section--full">
      <div class="example-group">
        <SectionTitle>SearchInput</SectionTitle>
        <MutedBody>
          The clear cross shows while there is text; pressing it empties the box and keeps focus there.
        </MutedBody>
        <div class="search-input-demo">
          <SearchInput
            value={q()}
            placeholder="Search tasks"
            onInput={(e) => setQ(e.currentTarget.value)}
            onClear={() => setQ("")}
          />
          <TextSublabel>{`Searching for: ${q() || "(nothing)"}`}</TextSublabel>
          <SearchInput value="" placeholder="Empty, no clear cross" />
          <TextSublabel>SearchField: the same chrome with your own glyphs in the slots</TextSublabel>
          <SearchField
            value={q()}
            placeholder="Filter"
            leading={<Icon name="filter" size="md" />}
            clearIcon={<Icon name="close" size="sm" />}
            onInput={(e) => setQ(e.currentTarget.value)}
            onClear={() => setQ("")}
          />
        </div>
      </div>
    </div>
  );
};
