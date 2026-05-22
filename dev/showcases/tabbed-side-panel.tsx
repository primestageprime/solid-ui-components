import { Component, createMemo, createSignal } from "solid-js";
import {
  TabbedSidePanel,
  RightDetailTabbedPanel,
  LeftNavTabbedPanel,
  type TabbedPanelTab,
} from "../../src/components/TabbedSidePanel";

const placeholderBody = (label: string) => () => (
  <div style={{ padding: "16px", color: "var(--sui-text-muted)", "font-size": "13px" }}>
    {label} body — replace with real content in consumer.
  </div>
);

const baseTabs: TabbedPanelTab[] = [
  { id: "details", label: "Details", content: placeholderBody("Details") },
  { id: "status", label: "Status", hint: "⌥S", content: placeholderBody("Status") },
  { id: "raw", label: "Raw", status: "warning", content: placeholderBody("Raw") },
];

interface InstanceRenderProps {
  tabs: TabbedPanelTab[];
  active: () => string;
  setActive: (id: string) => void;
  open: () => boolean;
  setOpen: (o: boolean) => void;
}

function Instance(props: { title: string; render: (p: InstanceRenderProps) => any }) {
  const [active, setActive] = createSignal("details");
  const [open, setOpen] = createSignal(true);
  return (
    <div style={{ flex: 1, "min-width": "320px" }}>
      <h3 style={{ "margin-bottom": "8px" }}>{props.title}</h3>
      <button
        style={{ "margin-bottom": "12px", padding: "4px 10px", "font-size": "12px" }}
        onClick={() => setOpen((v) => !v)}
      >
        {open() ? "Close panel" : "Open panel"}
      </button>
      <div style={{ "min-height": "260px", border: "1px dashed var(--sui-border)" }}>
        {props.render({
          tabs: baseTabs,
          active,
          setActive,
          open,
          setOpen,
        })}
      </div>
    </div>
  );
}

function FilteredInstance() {
  const [active, setActive] = createSignal("details");
  const [open, setOpen] = createSignal(true);
  const [showStatus, setShowStatus] = createSignal(true);
  const [showRaw, setShowRaw] = createSignal(true);
  const visibleTabs = createMemo(() => {
    const out: TabbedPanelTab[] = [baseTabs[0]];
    if (showStatus()) out.push(baseTabs[1]);
    if (showRaw()) out.push(baseTabs[2]);
    return out;
  });
  return (
    <div style={{ flex: 1, "min-width": "320px" }}>
      <h3 style={{ "margin-bottom": "8px" }}>Filtered tabs (consumer pre-filters)</h3>
      <div style={{ "margin-bottom": "12px", display: "flex", gap: "12px", "font-size": "12px" }}>
        <label><input type="checkbox" checked={showStatus()} onChange={(e) => setShowStatus(e.currentTarget.checked)} /> Status</label>
        <label><input type="checkbox" checked={showRaw()} onChange={(e) => setShowRaw(e.currentTarget.checked)} /> Raw</label>
        <button style={{ "margin-left": "auto", padding: "2px 8px" }} onClick={() => setOpen((v) => !v)}>
          {open() ? "Close" : "Open"}
        </button>
      </div>
      <div style={{ "min-height": "260px", border: "1px dashed var(--sui-border)" }}>
        <RightDetailTabbedPanel
          tabs={visibleTabs()}
          activeTab={active()}
          onTabChange={setActive}
          isOpen={open()}
          onOpenChange={setOpen}
        />
      </div>
    </div>
  );
}

export const TabbedSidePanelShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>TabbedSidePanel — Composite (Depth 2)</h2>
      <p class="text-meta">
        Zero CSS. Composes vertical Tabs + Row. Tab strip is always visible; the
        active tab's content renders inboard only when isOpen=true. Clicking the
        active tab toggles isOpen.
      </p>
      <div style={{ display: "flex", gap: "24px", padding: "24px", "flex-wrap": "wrap" }}>
        <Instance
          title="RightDetailTabbedPanel"
          render={(p) => (
            <RightDetailTabbedPanel
              tabs={p.tabs}
              activeTab={p.active()}
              onTabChange={p.setActive}
              isOpen={p.open()}
              onOpenChange={p.setOpen}
            />
          )}
        />
        <Instance
          title="LeftNavTabbedPanel"
          render={(p) => (
            <LeftNavTabbedPanel
              tabs={p.tabs}
              activeTab={p.active()}
              onTabChange={p.setActive}
              isOpen={p.open()}
              onOpenChange={p.setOpen}
            />
          )}
        />
        <Instance
          title="Bare TabbedSidePanel — tabsVariant='underline'"
          render={(p) => (
            <TabbedSidePanel
              tabs={p.tabs}
              activeTab={p.active()}
              onTabChange={p.setActive}
              isOpen={p.open()}
              onOpenChange={p.setOpen}
              tabsVariant="underline"
            />
          )}
        />
        <FilteredInstance />
      </div>
    </div>
  );
};
