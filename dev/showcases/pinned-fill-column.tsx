// PinnedFillColumn — a fill column with a pinned header and footer around a scrolling middle.
import { type Component, For } from "solid-js";
import { PinnedFillColumn } from "../../src/components/PinnedFillColumn";
import { SectionTitle, MutedBody, TextBody, TextSublabel } from "../../src/components/Text";
import { ViewportColumn } from "../../src/components/Layout";

const ROWS = Array.from({ length: 30 }, (_, i) => `Row ${i + 1}`);

export const PinnedFillColumnShowcase: Component = () => (
  <div class="component-section component-section--full">
    <div class="example-group">
      <SectionTitle>PinnedFillColumn</SectionTitle>
      <MutedBody>
        A header that stays put, a middle that scrolls, an optional footer. Both
        bars rest on the 1px divider. With neither slot it is just a scrolling fill column.
      </MutedBody>
      <div class="pinned-fill-column-demo">
        <ViewportColumn>
          <PinnedFillColumn
            header={<TextBody>Pinned header</TextBody>}
            footer={<TextSublabel>30 rows</TextSublabel>}
          >
            <For each={ROWS}>{(r) => <TextBody>{r}</TextBody>}</For>
          </PinnedFillColumn>
        </ViewportColumn>
      </div>
    </div>
  </div>
);
