import { type Component, createSignal } from "solid-js";
import { PopoverMenu, RightPopoverMenu } from "../../src/components/PopoverMenu";
import { Row } from "../../src/components/Layout/Row";
import { ConstrainedBox, SpreadRow, NarrowStack } from "../../src/components/Layout";
import { CardSurface } from "../../src/components/Surface";
import { SubsectionTitle, MutedBody } from "../../src/components/Text";

export const PopoverMenuShowcase: Component = () => {
  const [last, setLast] = createSignal<string>("");
  return (
    <div class="component-section">
      <h2>PopoverMenu — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Click-to-open menu anchored to a trigger element. Generic over the item
        id type.
      </p>
      <div class="example-group">
        <Row gap="sm" align="center">
          <PopoverMenu
            trigger={<span>Actions ▾</span>}
            items={[
              { id: "edit", label: "Edit" },
              { id: "duplicate", label: "Duplicate" },
              { id: "delete", label: "Delete" },
            ]}
            onSelect={(id) => setLast(id as string)}
          />
          <span class="text-meta">last selected: {last() || "—"}</span>
        </Row>
      </div>

      <p class="text-meta">
        Mark the current choice with <code>active</code>. The item gets{" "}
        <code>sui-popover-menu__item--active</code> and{" "}
        <code>aria-current="true"</code>, while the role stays{" "}
        <code>menuitem</code>. <code>OverflowNav</code> uses this to keep the
        selected mark on a nav tab that collapses into the kebab menu.
      </p>
      <div class="example-group">
        <Row gap="sm" align="center">
          <PopoverMenu
            trigger={<span>View ▾</span>}
            items={[
              { id: "day", label: "Day", icon: "clock" },
              { id: "week", label: "Week", icon: "clock", active: true },
              { id: "month", label: "Month", icon: "clock" },
            ]}
            onSelect={(id) => setLast(id as string)}
          />
          <span class="text-meta">Week carries active</span>
        </Row>
      </div>

      <p class="text-meta">
        Inside a short <code>overflow: hidden</code> ancestor (reproduces a
        clipping nav/panel frame). The menu is portaled to <code>document.body</code>
        and positioned <code>fixed</code>, so it escapes the clip instead of being
        cut off.
      </p>
      <div class="example-group">
        <div class="popover-menu-demo__clipframe">
          <PopoverMenu
            trigger={<span>Account ▾</span>}
            header={<span>peter@example.com</span>}
            items={[
              { id: "settings", label: "Settings" },
              { id: "logout", label: "Logout" },
            ]}
            onSelect={(id) => setLast(id as string)}
          />
        </div>
      </div>

      <p class="text-meta">
        <code>RightPopoverMenu</code> — the header case, shown in the parent it
        exists for. A kebab pinned to the right edge of a panel header has no
        room to open leftwards, so the variant bakes{" "}
        <code>align="right"</code> and <code>size="sm"</code>: the menu hangs
        back under the trigger instead of off the panel. The call site passes
        only the trigger, the items and the handler.
      </p>
      <div class="example-group">
        <ConstrainedBox>
          <NarrowStack>
            <CardSurface>
              <SpreadRow>
                <SubsectionTitle>Berth utilisation</SubsectionTitle>
                <RightPopoverMenu
                  trigger={<span>⋯</span>}
                  items={[
                    { id: "rename", label: "Rename report" },
                    { id: "duplicate", label: "Duplicate" },
                    { id: "export", label: "Export CSV" },
                    { id: "remove", label: "Remove from dashboard" },
                  ]}
                  onSelect={(id) => setLast(id as string)}
                />
              </SpreadRow>
              <MutedBody>
                Long Beach · 400 calls · last refreshed 14 minutes ago
              </MutedBody>
            </CardSurface>
            <CardSurface>
              <SpreadRow>
                <SubsectionTitle>Tanker turnaround</SubsectionTitle>
                <RightPopoverMenu
                  trigger={<span>⋯</span>}
                  header={<span>Report actions</span>}
                  items={[
                    { id: "rename", label: "Rename report" },
                    { id: "share", label: "Share with team" },
                    { id: "remove", label: "Remove from dashboard" },
                  ]}
                  onSelect={(id) => setLast(id as string)}
                />
              </SpreadRow>
              <MutedBody>Oakland · 92 calls · median 31h alongside</MutedBody>
            </CardSurface>
          </NarrowStack>
        </ConstrainedBox>
      </div>
    </div>
  );
};
