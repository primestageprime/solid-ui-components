import { type Component, createSignal } from "solid-js";
import { PopoverMenu } from "../../src/components/PopoverMenu";
import { Row } from "../../src/components/Layout/Row";

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
        Inside a short <code>overflow: hidden</code> ancestor (reproduces a
        clipping nav/panel frame). The menu is portaled to <code>document.body</code>
        and positioned <code>fixed</code>, so it escapes the clip instead of being
        cut off.
      </p>
      <div class="example-group">
        <div
          style={{
            height: "48px",
            overflow: "hidden",
            border: "1px dashed var(--sui-border)",
            "border-radius": "var(--sui-radius-md, 4px)",
            display: "flex",
            "align-items": "center",
            padding: "0 12px",
          }}
        >
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
    </div>
  );
};
