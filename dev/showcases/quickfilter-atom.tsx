import { Component, For } from "solid-js";
import { QuickFilter } from "../../src/components/QuickFilter";
import { Stack } from "../../src/components/Layout";
import { CompactCard } from "../../src/components/Surface";
import { TextLabel, TextSublabel } from "../../src/components/Text";

interface Item { id: string; name: string; tags: string[]; }

const ITEMS: Item[] = [
  { id: "1", name: "us-east-1 latency p99", tags: ["us-east-1", "latency", "p99"] },
  { id: "2", name: "us-west-2 latency p99", tags: ["us-west-2", "latency", "p99"] },
  { id: "3", name: "eu-north-1 cascade resolve cost", tags: ["eu-north-1", "cascade", "regression"] },
  { id: "4", name: "queue depth payments", tags: ["payments", "queue", "saturation"] },
  { id: "5", name: "cache hit ratio peak hours", tags: ["cache", "hit-ratio"] },
  { id: "6", name: "compactor write volume", tags: ["compactor", "writes"] },
];

export const QuickFilterAtomShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>QuickFilter — Atomic (Depth 1, generic)</h2>
      <p class="text-meta">
        Generic filter input with a render-prop child. Tokenized AND-matching
        across whitespace-split tokens. Composes over any list/table/tree.
      </p>

      <div class="example-group">
        <h3>Composing over a card list</h3>
        <p class="text-meta">
          Try queries like <code>latency</code>, <code>us-east latency</code>,
          <code>eu cascade</code>.
        </p>
        <QuickFilter
          items={ITEMS}
          extract={(it) => `${it.name} ${it.tags.join(" ")}`}
          placeholder="Filter items…"
        >
          {(filtered, q) => (
            <Stack gap="xs" style={{ "max-width": "480px" }}>
              <TextSublabel>{filtered.length} of {ITEMS.length} matching {q ? `"${q}"` : "(none)"}</TextSublabel>
              <For each={filtered}>
                {(it) => (
                  <CompactCard>
                    <TextLabel>{it.name}</TextLabel>
                    <div class="text-meta">{it.tags.join(" · ")}</div>
                  </CompactCard>
                )}
              </For>
            </Stack>
          )}
        </QuickFilter>
      </div>
    </div>
  );
};
