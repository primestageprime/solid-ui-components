import { Component } from "solid-js";
import { AlertBox } from "../../src/components/Feedback";
import { Button } from "../../src/components/Button";
import { Stack } from "../../src/components/Layout";
import {
  WarningSurface, InfoSurface, SuccessSurface, DangerSurface,
} from "../../src/components/Surface";
import { SpreadRow, ContentStack, ActionSlot } from "../../src/components/Layout";
import {
  WarningTitle, InfoTitle, SuccessTitle, DangerTitle, TextBody,
} from "../../src/components/Text";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const AlertBoxShowcase: Component<Depth2Props> = (props) => {
  return (
    <div class="component-section">
      <h2>AlertBox — Depth 2 (zero CSS)</h2>
      <p class="text-meta">Composes Surface + Layout + Text (curried). Status-colored alert with optional action slot.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <Stack gap="md">
            <AlertBox
              variant="info"
              title="Information"
              description="This is an informational message."
            />
            <AlertBox
              variant="warning"
              title="Pending Review"
              description="This item requires review and approval before proceeding."
              action={<Button variant="primary" size="sm">Approve</Button>}
            />
            <AlertBox
              variant="success"
              title="Complete"
              description="All checks have passed successfully."
            />
            <AlertBox
              variant="danger"
              title="Violation Detected"
              description="Critical compliance violation requires immediate attention."
              action={<Button variant="danger" size="sm">Resolve</Button>}
            />
          </Stack>
        </div>
        <div class="depth2-atoms">
          <h3>Curried Variants Used</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Surface (variant-selected)</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("surface")}>
              <div class="depth2-atom__label">InfoSurface</div>
              <InfoSurface><TextBody>padding: md, radius: md, info colors</TextBody></InfoSurface>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("surface")}>
              <div class="depth2-atom__label">WarningSurface</div>
              <WarningSurface><TextBody>padding: md, radius: md, warning colors</TextBody></WarningSurface>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("surface")}>
              <div class="depth2-atom__label">SuccessSurface</div>
              <SuccessSurface><TextBody>padding: md, radius: md, success colors</TextBody></SuccessSurface>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("surface")}>
              <div class="depth2-atom__label">DangerSurface</div>
              <DangerSurface><TextBody>padding: md, radius: md, danger colors</TextBody></DangerSurface>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Layout</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("row")}>
              <div class="depth2-atom__label">SpreadRow</div>
              <div class="text-meta">align: center, justify: between, gap: md</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("stack")}>
              <div class="depth2-atom__label">ContentStack</div>
              <div class="text-meta">gap: xs, flex: 1</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("stack")}>
              <div class="depth2-atom__label">ActionSlot</div>
              <div class="text-meta">flex-shrink: 0</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Text (variant-selected)</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("text")}>
              <div class="depth2-atom__label">InfoTitle / WarningTitle / SuccessTitle / DangerTitle</div>
              <div class="text-meta">title variant + status color</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("text")}>
              <div class="depth2-atom__label">TextBody</div>
              <div class="text-meta">body variant</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
