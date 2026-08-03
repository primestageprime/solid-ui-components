import { renderToString } from "solid-js/web";
import {
  DefaultButton, TightStack, SpreadRow, TextTitle, TextBody, InfoPanel, Badge,
} from "@primestageprime/solid-ui-components";
console.log(
  renderToString(() => (
    <TightStack>
      <TextTitle>t</TextTitle>
      <SpreadRow><Badge>b</Badge><DefaultButton>x</DefaultButton></SpreadRow>
      <InfoPanel><TextBody>y</TextBody></InfoPanel>
    </TightStack>
  )),
);
