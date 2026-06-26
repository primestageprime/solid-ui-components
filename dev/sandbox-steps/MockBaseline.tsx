// Generic two-pane scaffold every sandbox step starts from. Wraps a
// thematic PageCanvas around a FlexRow with a DelineatedSidebar + detail
// SimplePanel. Pass `sidebar`/`detail` JSX (typically curried layout
// components) or fall back to the empty hints.
import { Component, JSX } from "solid-js";
import {
  FlexRow,
  LgRegion,
  ContentStack,
  DelineatedSidebar,
  PageCanvas,
} from "../../src/components/Layout";
import { HintText } from "../../src/components/Text";
import { SimplePanel } from "../../src/components/Panel";

export interface MockBaselineProps {
  sidebar?: JSX.Element;
  detail?: JSX.Element;
  sidebarEmpty?: string;
  detailEmpty?: string;
}

const DEFAULT_SIDEBAR_EMPTY = "this sidebar is empty";
const DEFAULT_DETAIL_EMPTY = "nothing selected";

export const MockBaseline: Component<MockBaselineProps> = (props) => (
  <PageCanvas>
    <FlexRow gap="sm" align="stretch" style={{ height: "100%", "min-height": "70vh" }}>
      <DelineatedSidebar>
        {props.sidebar ?? (
          <LgRegion>
            <HintText>{props.sidebarEmpty ?? DEFAULT_SIDEBAR_EMPTY}</HintText>
          </LgRegion>
        )}
      </DelineatedSidebar>
      <ContentStack>
        <SimplePanel style={{ height: "100%" }}>
          {props.detail ?? (
            <LgRegion>
              <HintText>{props.detailEmpty ?? DEFAULT_DETAIL_EMPTY}</HintText>
            </LgRegion>
          )}
        </SimplePanel>
      </ContentStack>
    </FlexRow>
  </PageCanvas>
);
