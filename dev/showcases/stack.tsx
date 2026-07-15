import type { Component } from "solid-js";
import { Stack } from "../../src/components/Layout/Stack";
import {
  TightStack,
  NarrowStack,
  ContentStack,
  CenteredStack,
  SmRegion,
  MdRegion,
  LgRegion,
} from "../../src/components/Layout";
import { Surface } from "../../src/components/Surface/Surface";
import { Text } from "../../src/components/Text/Text";

const DemoBox: Component<{ label: string }> = (props) => (
  <Surface
    padding="sm"
    radius="sm"
    bg="rgba(0,212,255,0.1)"
    borderColor="rgba(0,212,255,0.3)"
  >
    <Text variant="body">{props.label}</Text>
  </Surface>
);

export const StackShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Stack — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (Layout.css). Flex-column container with gap/align/justify.
        Factory: createStack().
      </p>

      <div class="example-group">
        <h3>Base Component — Gap Sizes</h3>
        <div class="demo-cols">
          {(["xs", "sm"] as const).map((gap) => (
            <div>
              <Text variant="sublabel">{gap}</Text>
              <div class="demo-frame">
                <Stack gap={gap}>
                  <DemoBox label="A" />
                  <DemoBox label="B" />
                  <DemoBox label="C" />
                </Stack>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div class="example-group">
        <h3>Base Component — Alignment</h3>
        <div class="demo-cols">
          {(["start", "center", "end", "stretch"] as const).map((align) => (
            <div>
              <Text variant="sublabel">{align}</Text>
              {/* Fixed demo width so alignment has room to show. */}
              <div class="demo-frame" style={{ width: "160px" }}>
                <Stack gap="sm" align={align}>
                  <DemoBox label="Short" />
                  <DemoBox label="Medium item" />
                  <DemoBox label="A" />
                </Stack>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div class="example-group">
        <h3>Curried Variants</h3>
        <div class="demo-cols">
          <div>
            <Text variant="sublabel">TightStack</Text>
            <div class="text-meta">gap: "xs"</div>
            <div class="demo-frame">
              <TightStack>
                <DemoBox label="A" />
                <DemoBox label="B" />
                <DemoBox label="C" />
              </TightStack>
            </div>
          </div>
          <div>
            <Text variant="sublabel">NarrowStack</Text>
            <div class="text-meta">gap: "sm"</div>
            <div class="demo-frame">
              <NarrowStack>
                <DemoBox label="A" />
                <DemoBox label="B" />
                <DemoBox label="C" />
              </NarrowStack>
            </div>
          </div>
          <div>
            <Text variant="sublabel">ContentStack</Text>
            <div class="text-meta">gap: "xs", flex: 1</div>
            <div class="demo-frame">
              <ContentStack>
                <DemoBox label="A" />
                <DemoBox label="B" />
              </ContentStack>
            </div>
          </div>
          <div>
            <Text variant="sublabel">CenteredStack</Text>
            <div class="text-meta">align/justify: center, gap: "sm"</div>
            {/* Fixed demo height so vertical centering has room to show. */}
            <div class="demo-frame" style={{ height: "120px", display: "flex" }}>
              <CenteredStack>
                <DemoBox label="Centered" />
              </CenteredStack>
            </div>
          </div>
        </div>
      </div>

      <div class="example-group">
        <h3>Region Variants</h3>
        <div class="text-meta">
          Centered stacks with size-specific padding and min-height
        </div>
        <Stack gap="sm">
          <div>
            <Text variant="sublabel">SmRegion</Text>
            <div class="text-meta">padding: 16px 12px, min-height: 60px</div>
            <div class="demo-frame">
              <SmRegion>
                <Text variant="body">Small region</Text>
              </SmRegion>
            </div>
          </div>
          <div>
            <Text variant="sublabel">MdRegion</Text>
            <div class="text-meta">padding: 32px 16px, min-height: 120px</div>
            <div class="demo-frame">
              <MdRegion>
                <Text variant="body">Medium region</Text>
              </MdRegion>
            </div>
          </div>
          <div>
            <Text variant="sublabel">LgRegion</Text>
            <div class="text-meta">padding: 48px 24px, min-height: 200px</div>
            <div class="demo-frame">
              <LgRegion>
                <Text variant="body">Large region</Text>
              </LgRegion>
            </div>
          </div>
        </Stack>
      </div>
    </div>
  );
};
