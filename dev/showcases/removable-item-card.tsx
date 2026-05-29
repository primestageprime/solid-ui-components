import { Component, createSignal } from "solid-js";
import { RemovableItemCard } from "../../src/components/Card";
import { StatusBadge } from "../../src/components/Badge/StatusBadge";
import { Stack } from "../../src/components/Layout/Stack";
import { TextBody, MutedBody } from "../../src/components/Text";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const RemovableItemCardShowcase: Component<Depth2Props> = (props) => {
  const [removed, setRemoved] = createSignal<string[]>([]);
  const isRemoved = (id: string) => removed().includes(id);
  const remove = (id: string) => setRemoved((prev) => [...prev, id]);

  return (
    <div class="component-section">
      <h2>RemovableItemCard — Depth 2 (zero CSS)</h2>
      <p class="text-meta">Composes Surface + Layout + Text (curried) + Button (Atomic). Interactive card with title, details, remove action.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Default</h3>
          <Stack gap="sm" style={{ "max-width": "280px" }}>
            <RemovableItemCard
              title="ITEM ALPHA"
              details={
                <>
                  <MutedBody>ID-1042</MutedBody>
                  <MutedBody>2026-02-13</MutedBody>
                </>
              }
            />
          </Stack>

          <h3 style={{ "margin-top": "24px" }}>Composed — Active + Remove</h3>
          <Stack gap="sm" style={{ "max-width": "280px" }}>
            <RemovableItemCard
              title="ITEM BRAVO"
              active
              onRemove={() => alert("Removed!")}
              details={
                <>
                  <MutedBody>ID-2087</MutedBody>
                  <MutedBody>2026-02-14</MutedBody>
                </>
              }
            />
          </Stack>

          <h3 style={{ "margin-top": "24px" }}>Composed — Sidebar List</h3>
          <Stack gap="sm" style={{ "max-width": "280px" }}>
            {!isRemoved("v1") && (
              <RemovableItemCard
                title="ITEM CHARLIE"
                active
                onRemove={() => remove("v1")}
                details={
                  <>
                    <MutedBody>ID-3001</MutedBody>
                    <StatusBadge variant="compliant">COMPLIANT</StatusBadge>
                  </>
                }
              >
                <TextBody>3 metrics passing</TextBody>
              </RemovableItemCard>
            )}
            {!isRemoved("v2") && (
              <RemovableItemCard
                title="ITEM DELTA"
                onRemove={() => remove("v2")}
                details={
                  <>
                    <MutedBody>ID-3002</MutedBody>
                    <StatusBadge variant="violation">VIOLATION</StatusBadge>
                  </>
                }
              >
                <TextBody>2 metrics failing</TextBody>
              </RemovableItemCard>
            )}
            {!isRemoved("v3") && (
              <RemovableItemCard
                title="ITEM ECHO"
                onRemove={() => remove("v3")}
                details={
                  <>
                    <MutedBody>ID-3003</MutedBody>
                    <StatusBadge variant="pending">PENDING</StatusBadge>
                  </>
                }
              />
            )}
          </Stack>
        </div>
        <div class="depth2-atoms">
          <h3>Curried Variants Used</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Surface</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("surface")}>
              <div class="depth2-atom__label">InteractiveCard</div>
              <div class="text-meta">padding: sm, radius: sm, hover glow + active state</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Text</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("text")}>
              <div class="depth2-atom__label">FlexLabel</div>
              <div class="text-meta">card title, 600 weight, flex: 1</div>
            </div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("text")}>
              <div class="depth2-atom__label">MutedBody</div>
              <div class="text-meta">detail values, muted color</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Layout</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("row")}>
              <div class="depth2-atom__label">SpreadRow</div>
              <div class="text-meta">header + details: space-between alignment</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Button</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("button")}>
              <div class="depth2-atom__label">Button</div>
              <div class="text-meta">ghost/sm — remove action</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
