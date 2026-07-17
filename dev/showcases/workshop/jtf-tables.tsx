// Workshop bench — JTF Table Catalog (2026-07-17).
// Every table in jtf-ui, replicated with realistic stub data and tagged
// SUI-compliant (FieldTable/fields/ValueMatrix) or raw (still on BaseTable
// with call-site geometry/color). Sidebar lists route + table name; clicking
// renders the replica. The catalog is the migration worklist made visible.
import type { Component } from "solid-js";
import { createSignal, For, Show } from "solid-js";
import { SectionTitle, TextBody, TextSublabel } from "../../../src/components/Text";
import {
  ContentStack,
  TightStack,
  PaneRow,
  GrowColumn,
  ClusterRow,
  DelineatedSidebar,
  SpreadRow,
  ScrollXBox,
} from "../../../src/components/Layout";
import { CompliantBadge, WarningBadge } from "../../../src/components/Badge";
import { InteractiveCard } from "../../../src/components/Surface";
import type { TableEntry } from "./jtf-tables/shared";
import { ENTRIES as fortnightEntries } from "./jtf-tables/fortnight";
import { ENTRIES as widgetEntries } from "./jtf-tables/widgets";
import { ENTRIES as powerEntries } from "./jtf-tables/power";
import { ENTRIES as routeEntries } from "./jtf-tables/routes";
import { ENTRIES as triageEntries } from "./jtf-tables/triage";

const ALL: TableEntry[] = [
  ...fortnightEntries,
  ...widgetEntries,
  ...powerEntries,
  ...routeEntries,
  ...triageEntries,
];

const JtfTablesBench: Component = () => {
  const [active, setActive] = createSignal(0);
  const entry = () => ALL[active()];
  const suiCount = ALL.filter((e) => e.status === "sui").length;

  return (
    <div class="component-section component-section--full">
      <SectionTitle>JTF Table Catalog</SectionTitle>
      <TextBody>
        {`Every table in jtf-ui with realistic stub data — ${suiCount} of ${ALL.length} SUI-compliant. The warning-tagged replicas are the migration worklist.`}
      </TextBody>
      <PaneRow>
        <DelineatedSidebar>
          <For each={ALL}>
            {(e, i) => (
              <InteractiveCard onClick={() => setActive(i())}>
                <SpreadRow>
                  <TightStack>
                    <TextSublabel>{e.route}</TextSublabel>
                    <TextBody>{e.name}</TextBody>
                  </TightStack>
                  {e.status === "sui" ? (
                    <CompliantBadge label="SUI" />
                  ) : (
                    <WarningBadge label="raw" />
                  )}
                </SpreadRow>
              </InteractiveCard>
            )}
          </For>
        </DelineatedSidebar>
        <GrowColumn>
          <Show when={entry()} keyed>
            {(e) => (
              <ContentStack>
                <ClusterRow>
                  {e.status === "sui" ? (
                    <CompliantBadge label="SUI compliant" />
                  ) : (
                    <WarningBadge label="not migrated" />
                  )}
                  <TextSublabel>{`${e.route} — ${e.name}`}</TextSublabel>
                </ClusterRow>
                <TextSublabel>{e.note}</TextSublabel>
                <ScrollXBox>
                  <e.component />
                </ScrollXBox>
              </ContentStack>
            )}
          </Show>
        </GrowColumn>
      </PaneRow>
    </div>
  );
};

export const meta = { label: "JTF Table Catalog" };

export default JtfTablesBench;
