// A realistic screen: layout + text + table + panel. Neither heavy dep is
// reachable from any of these, so contamination here means a leak, not usage.
import { render } from "solid-js/web";
import {
  DefaultButton, TightStack, SpreadRow, TextTitle, TextBody,
  FilterableTable, InfoPanel, Badge,
} from "@primestageprime/solid-ui-components";
render(
  () => (
    <TightStack>
      <TextTitle>t</TextTitle>
      <SpreadRow><Badge>b</Badge><DefaultButton>x</DefaultButton></SpreadRow>
      <InfoPanel><TextBody>y</TextBody></InfoPanel>
      <FilterableTable rows={[]} columns={[]} />
    </TightStack>
  ),
  document.body,
);
