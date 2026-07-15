import type { Component } from "solid-js";
import {
  InfoPanel,
  AccentPanel,
  DangerPanel,
  WarningPanel,
  SuccessPanel,
  CompactPanel,
  DecoratedPanel,
} from "../../src/components/Panel";
import { Panel } from "../../src/components/Panel/Panel";
import { Stack } from "../../src/components/Layout/Stack";
import {
  MutedBody,
  AccentBody,
  TextValueDangerSm,
  TextValueSuccessSm,
} from "../../src/components/Text";

export const PanelShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Panel — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (HUD.css), no component imports. Sci-fi panel with title,
        corners, glow.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Corner Variants</h3>
          <div class="example-row">
            <Panel title="Clip Corners" corners="clip" glow="subtle">
              <MutedBody>Angled corners using clip-path.</MutedBody>
            </Panel>
            <Panel title="Bracket Corners" corners="bracket" glow="medium">
              <MutedBody>L-shaped bracket decorations.</MutedBody>
            </Panel>
            <Panel title="Notch Corners" corners="notch" glow="strong">
              <MutedBody>Asymmetric notch cut-outs.</MutedBody>
            </Panel>
          </div>

          <h3>Composed — Color Variants</h3>
          <div class="example-row">
            <Panel title="Primary" variant="primary" corners="clip" size="sm">
              <AccentBody>Accent color</AccentBody>
            </Panel>
            <Panel title="Danger" variant="danger" corners="clip" size="sm">
              <TextValueDangerSm>Warning state</TextValueDangerSm>
            </Panel>
            <Panel title="Success" variant="success" corners="clip" size="sm">
              <TextValueSuccessSm>Positive state</TextValueSuccessSm>
            </Panel>
          </div>

          <h3>Composed — Edge Accents</h3>
          <Panel
            title="With Edge Accents"
            corners="clip"
            edgeAccents
            glow="subtle"
          >
            <MutedBody>Decorative edge lines on the panel borders.</MutedBody>
          </Panel>

          <h3>Curried Variants</h3>
          <Stack gap="sm">
            <div>
              <InfoPanel title="InfoPanel">
                <MutedBody>clip corners, subtle glow</MutedBody>
              </InfoPanel>
              <div class="text-meta">
                InfoPanel — corners: "clip", glow: "subtle"
              </div>
            </div>
            <div>
              <AccentPanel title="AccentPanel">
                <MutedBody>primary, bracket corners, medium glow</MutedBody>
              </AccentPanel>
              <div class="text-meta">
                AccentPanel — variant: "primary", corners: "bracket", glow:
                "medium"
              </div>
            </div>
            <div class="example-row">
              <DangerPanel title="DangerPanel">
                <MutedBody>danger + strong glow</MutedBody>
              </DangerPanel>
              <WarningPanel title="WarningPanel">
                <MutedBody>warning + subtle glow</MutedBody>
              </WarningPanel>
              <SuccessPanel title="SuccessPanel">
                <MutedBody>success + subtle glow</MutedBody>
              </SuccessPanel>
            </div>
            <div>
              <CompactPanel title="CompactPanel">
                <MutedBody>small size, no glow</MutedBody>
              </CompactPanel>
              <div class="text-meta">
                CompactPanel — size: "sm", corners: "clip", glow: "none"
              </div>
            </div>
            <div>
              <DecoratedPanel title="DecoratedPanel">
                <MutedBody>bracket corners + edge accents</MutedBody>
              </DecoratedPanel>
              <div class="text-meta">
                DecoratedPanel — corners: "bracket", edgeAccents, glow: "medium"
              </div>
            </div>
          </Stack>
        </div>
        <div class="depth2-atoms">
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Corners</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                clip / bracket / notch / round / none
              </div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Glow</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                none / subtle / medium / strong
              </div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Variant</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                default / primary / danger / warning / success
              </div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Size</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">sm / md / lg</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
