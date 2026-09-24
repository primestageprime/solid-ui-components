import { type Component, createMemo, createSignal } from "solid-js";
import { NavLink } from "../../src/components/Navigation";
import { TightClusterRow, NarrowStack } from "../../src/components/Layout";
import { OverflowNav, type OverflowNavItem } from "../../src/components/OverflowNav";
import { ResizableContainer } from "../../src/components/ResizableContainer";
import { MutedBody } from "../../src/components/Text";

// One realistic nav — a workspace's section list, long enough that no
// reasonable header width fits all of it.
const SECTIONS: OverflowNavItem[] = [
  { id: "overview", label: "Overview", href: "#", active: true },
  { id: "berths", label: "Berths", href: "#" },
  { id: "calls", label: "Port calls", href: "#" },
  { id: "alerts", label: "Alerts", href: "#", color: "warning", badge: 3 },
  { id: "schedules", label: "Schedules", href: "#" },
  { id: "invoicing", label: "Invoicing", href: "#" },
  { id: "audit", label: "Audit log", href: "#" },
  { id: "settings", label: "Settings", href: "#" },
];

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

// Pinnable tabs: Dashboard/Scenarios are permanent; the rest can be closed
// into the kebab and re-opened from it.
const TABS = [
  { id: "dashboard", label: "Dashboard", closable: false },
  { id: "timeline", label: "Timeline", closable: true },
  { id: "scenarios", label: "Scenarios", closable: false },
  { id: "configure", label: "Configure", closable: true },
  { id: "import", label: "Import", closable: true },
];

const PinnableTabsDemo: Component = () => {
  const [pinned, setPinned] = createSignal(
    new Set(["dashboard", "timeline", "scenarios"]),
  );
  const [current, setCurrent] = createSignal("dashboard");
  const toItem = (tab: (typeof TABS)[number]): OverflowNavItem => ({
    id: tab.id,
    label: tab.label,
    href: "#",
    active: current() === tab.id,
    closable: tab.closable,
    onClick: (e) => {
      e?.preventDefault();
      setPinned((prev) => new Set(prev).add(tab.id));
      setCurrent(tab.id);
    },
  });
  const inline = createMemo(() =>
    TABS.filter((t) => pinned().has(t.id)).map(toItem),
  );
  const hidden = createMemo(() =>
    TABS.filter((t) => !pinned().has(t.id)).map(toItem),
  );
  const close = (id: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (current() === id) setCurrent("dashboard");
  };
  return (
    <NarrowStack>
      <OverflowNav items={inline()} overflowItems={hidden()} onClose={close} />
      <MutedBody>
        on: {current()} · pinned: {[...pinned()].join(", ")}
      </MutedBody>
    </NarrowStack>
  );
};

export const NavBarShowcase: Component<Depth2Props> = (props) => {
  const [picked, setPicked] = createSignal("");
  return (
    <div class="component-section">
      <h2>NavBar — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Composes NavLink (Atomic). Horizontal navigation bar with active state
        and badges.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <TightClusterRow class="nav-bar-demo__composed">
            <NavLink href="#" active>
              Dashboard
            </NavLink>
            <NavLink href="#">Reports</NavLink>
            <NavLink href="#" color="warning" badge={3}>
              Alerts
            </NavLink>
            <NavLink href="#">Settings</NavLink>
          </TightClusterRow>
        </div>
        <div class="depth2-atoms">
          <h3>Atomic</h3>
          <div
            class="depth2-atom depth2-atom--link"
            onClick={() => props.onNavigate?.("nav-item")}
          >
            <div class="depth2-atom__label">NavItem</div>
            <NarrowStack>
              <NavLink href="#" active>
                Active
              </NavLink>
              <NavLink href="#">Inactive</NavLink>
              <NavLink href="#" color="warning" badge={3}>
                With Badge
              </NavLink>
            </NarrowStack>
          </div>
        </div>
      </div>

      <h3>OverflowNav — the same nav that measures itself</h3>
      <p class="text-meta">
        Composes the same NavLink atoms plus a PopoverMenu. It measures its
        container and moves whatever no longer fits into a trailing kebab, so
        the nav never wraps or clips. Drag the right edge of the frame below:
        items fall into the kebab as it narrows and climb back out as it widens.
        Selecting from the kebab fires the item's own <code>onClick</code>, so a
        collapsed item behaves exactly like an inline one.
      </p>
      <div class="example-group">
        <NarrowStack>
          <ResizableContainer
            directions={["right"]}
            initialWidth={620}
            initialHeight={44}
            minWidth={140}
            maxWidth={900}
          >
            <OverflowNav
              items={SECTIONS.map((item) => ({
                ...item,
                onClick: () => setPicked(item.label),
              }))}
            />
          </ResizableContainer>
          <MutedBody>last activated: {picked() || "—"}</MutedBody>
        </NarrowStack>
      </div>

      <h3>OverflowNav — closable items and an explicit overflow list</h3>
      <p class="text-meta">
        Items marked <code>closable</code> get a trailing close button that
        calls the nav's <code>onClose(id)</code>. <code>overflowItems</code>{" "}
        always live in the kebab, whatever the width — here, the tabs the
        reader has closed. Picking one from the kebab re-opens it. Kebab rows
        keep <code>active</code>.
      </p>
      <div class="example-group">
        <PinnableTabsDemo />
      </div>
    </div>
  );
};
