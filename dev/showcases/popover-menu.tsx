import { Component, createSignal } from "solid-js";
import { PopoverMenu } from "../../src/components/PopoverMenu";
import { Row } from "../../src/components/Layout/Row";

export const PopoverMenuShowcase: Component = () => {
  const [last, setLast] = createSignal<string>("");
  return (
    <div class="component-section">
      <h2>PopoverMenu — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Click-to-open menu anchored to a trigger element. Generic over the
        item id type.
      </p>
      <div class="example-group">
        <Row gap="md" align="center">
          <PopoverMenu
            trigger={<button>Actions ▾</button>}
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
    </div>
  );
};
