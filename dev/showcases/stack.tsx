import { Component } from "solid-js";
import { Stack } from "../../src/components/Layout";
import {
  TightStack, NarrowStack, SpacedStack, ContentStack, CenteredStack,
  SmRegion, MdRegion, LgRegion,
} from "../../src/components/Layout";
import { Surface } from "../../src/components/Surface";
import { Text } from "../../src/components/Text";

const DemoBox: Component<{ label: string }> = (props) => (
  <Surface padding="sm" radius="sm" bg="rgba(0,212,255,0.1)" borderColor="rgba(0,212,255,0.3)">
    <Text variant="body">{props.label}</Text>
  </Surface>
);

export const StackShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Stack — Primitive (Depth 0)</h2>
      <p class="text-meta">Owns CSS (Layout.css). Flex-column container with gap/align/justify. Factory: createStack().</p>

      <div class="example-group">
        <h3>Base Component — Gap Sizes</h3>
        <div class="example-row" style={{ "align-items": "flex-start", gap: "32px" }}>
          {(["xs", "sm", "md", "lg", "xl"] as const).map((gap) => (
            <div>
              <Text variant="sublabel">{gap}</Text>
              <Stack gap={gap} style={{ "margin-top": "8px" }}>
                <DemoBox label="A" />
                <DemoBox label="B" />
                <DemoBox label="C" />
              </Stack>
            </div>
          ))}
        </div>
      </div>

      <div class="example-group">
        <h3>Base Component — Alignment</h3>
        <div class="example-row" style={{ "align-items": "flex-start", gap: "32px" }}>
          {(["start", "center", "end", "stretch"] as const).map((align) => (
            <div>
              <Text variant="sublabel">{align}</Text>
              <Stack gap="sm" align={align} style={{ "margin-top": "8px", width: "160px", border: "1px dashed rgba(255,255,255,0.1)", padding: "8px" }}>
                <DemoBox label="Short" />
                <DemoBox label="Medium item" />
                <DemoBox label="A" />
              </Stack>
            </div>
          ))}
        </div>
      </div>

      <div class="example-group">
        <h3>Curried Variants</h3>
        <div class="example-row" style={{ "align-items": "flex-start", gap: "32px" }}>
          <div>
            <Text variant="sublabel">TightStack</Text>
            <div class="text-meta">gap: "xs"</div>
            <TightStack style={{ "margin-top": "8px" }}>
              <DemoBox label="A" />
              <DemoBox label="B" />
              <DemoBox label="C" />
            </TightStack>
          </div>
          <div>
            <Text variant="sublabel">NarrowStack</Text>
            <div class="text-meta">gap: "sm"</div>
            <NarrowStack style={{ "margin-top": "8px" }}>
              <DemoBox label="A" />
              <DemoBox label="B" />
              <DemoBox label="C" />
            </NarrowStack>
          </div>
          <div>
            <Text variant="sublabel">SpacedStack</Text>
            <div class="text-meta">gap: "md"</div>
            <SpacedStack style={{ "margin-top": "8px" }}>
              <DemoBox label="A" />
              <DemoBox label="B" />
              <DemoBox label="C" />
            </SpacedStack>
          </div>
          <div>
            <Text variant="sublabel">ContentStack</Text>
            <div class="text-meta">gap: "xs", flex: 1</div>
            <ContentStack style={{ "margin-top": "8px", border: "1px dashed rgba(255,255,255,0.1)", padding: "8px" }}>
              <DemoBox label="A" />
              <DemoBox label="B" />
            </ContentStack>
          </div>
          <div>
            <Text variant="sublabel">CenteredStack</Text>
            <div class="text-meta">align/justify: center, gap: "sm"</div>
            <CenteredStack style={{ "margin-top": "8px", height: "120px", border: "1px dashed rgba(255,255,255,0.1)", padding: "8px" }}>
              <DemoBox label="Centered" />
            </CenteredStack>
          </div>
        </div>
      </div>

      <div class="example-group">
        <h3>Region Variants</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>Centered stacks with size-specific padding and min-height</div>
        <Stack gap="md">
          <div>
            <Text variant="sublabel">SmRegion</Text>
            <div class="text-meta">padding: 16px 12px, min-height: 60px</div>
            <SmRegion style={{ "margin-top": "8px", border: "1px dashed rgba(255,255,255,0.1)" }}>
              <Text variant="body">Small region</Text>
            </SmRegion>
          </div>
          <div>
            <Text variant="sublabel">MdRegion</Text>
            <div class="text-meta">padding: 32px 16px, min-height: 120px</div>
            <MdRegion style={{ "margin-top": "8px", border: "1px dashed rgba(255,255,255,0.1)" }}>
              <Text variant="body">Medium region</Text>
            </MdRegion>
          </div>
          <div>
            <Text variant="sublabel">LgRegion</Text>
            <div class="text-meta">padding: 48px 24px, min-height: 200px</div>
            <LgRegion style={{ "margin-top": "8px", border: "1px dashed rgba(255,255,255,0.1)" }}>
              <Text variant="body">Large region</Text>
            </LgRegion>
          </div>
        </Stack>
      </div>
    </div>
  );
};
