import { Component } from "solid-js";
import { EmptyState } from "../../src/components/Feedback";
import { Icon } from "../../src/components/Icon";
import { Stack } from "../../src/components/Layout";
import { TextBody, MutedBody, AccentBody } from "../../src/components/Text";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const EmptyStateShowcase: Component<Depth2Props> = (props) => {
  return (
    <div class="component-section">
      <h2>EmptyState — Depth 2 (zero CSS)</h2>
      <p class="text-meta">Composes Layout + Text (curried). Centered placeholder with icon, message, size variants.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Sizes</h3>
          <Stack gap="md">
            <div>
              <div class="text-meta">sm</div>
              <EmptyState size="sm" message="No results found" />
            </div>
            <div>
              <div class="text-meta">md (default)</div>
              <EmptyState
                icon={<Icon name="search" size="lg" />}
                message="No results found"
              />
            </div>
            <div>
              <div class="text-meta">lg</div>
              <EmptyState
                size="lg"
                icon={<Icon name="search" size="lg" />}
                message="No results found"
              />
            </div>
          </Stack>

          <h3 style={{ "margin-top": "24px" }}>Composed — Variants</h3>
          <Stack gap="md">
            <div>
              <div class="text-meta">default</div>
              <EmptyState message="Default text style" />
            </div>
            <div>
              <div class="text-meta">muted</div>
              <EmptyState variant="muted" message="Muted text style" />
            </div>
            <div>
              <div class="text-meta">accent</div>
              <EmptyState variant="accent" message="Accent text style" />
            </div>
          </Stack>
        </div>
        <div class="depth2-atoms">
          <h3>Curried Variants Used</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Layout (size-selected)</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("stack")}>
              <div class="depth2-atom__label">SmRegion</div>
              <div class="text-meta">centered stack, padding: 16px 12px, min-height: 60px</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("stack")}>
              <div class="depth2-atom__label">MdRegion</div>
              <div class="text-meta">centered stack, padding: 32px 16px, min-height: 120px</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("stack")}>
              <div class="depth2-atom__label">LgRegion</div>
              <div class="text-meta">centered stack, padding: 48px 24px, min-height: 200px</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("stack")}>
              <div class="depth2-atom__label">FadedBox</div>
              <div class="text-meta">opacity: 0.5</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("stack")}>
              <div class="depth2-atom__label">ConstrainedBox</div>
              <div class="text-meta">max-width: 400px</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Text (variant-selected)</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("text")}>
              <div class="depth2-atom__label">TextBody</div>
              <div class="text-meta">body variant</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("text")}>
              <div class="depth2-atom__label">MutedBody</div>
              <div class="text-meta">body + color: --text-muted</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("text")}>
              <div class="depth2-atom__label">AccentBody</div>
              <div class="text-meta">body + color: --hud-accent</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
