import { type Component, For, createSignal } from "solid-js";
import {
  NestedList,
  NestedListItem,
  NESTED_LIST_MAX_INDENT_STEPS,
} from "../../src/components/Layout";
import { SpreadRow, TightStack } from "../../src/components/Layout";
import { CountText, TextLabel, TextSublabel } from "../../src/components/Text";
import { SmStatusBadge } from "../../src/components/Badge";

type WorkNode = {
  id: string;
  title: string;
  status: "compliant" | "pending" | "warning";
  children?: WorkNode[];
};

const WORK: WorkNode = {
  id: "w0",
  title: "Ship the Work Inspector",
  status: "pending",
  children: [
    {
      id: "w1",
      title: "Decompose the statement",
      status: "compliant",
      children: [
        { id: "w1a", title: "Architect pass", status: "compliant" },
        {
          id: "w1b",
          title: "Capability routing",
          status: "compliant",
          children: [
            { id: "w1b1", title: "frontend persona", status: "compliant" },
            { id: "w1b2", title: "backend persona", status: "compliant" },
          ],
        },
      ],
    },
    {
      id: "w2",
      title: "Render the tree",
      status: "warning",
      children: [
        { id: "w2a", title: "Row chrome", status: "compliant" },
        { id: "w2b", title: "Indent rail", status: "warning" },
      ],
    },
    { id: "w3", title: "Bump SUI and adopt", status: "pending" },
  ],
};

const countNodes = (n: WorkNode): number =>
  1 + (n.children ?? []).reduce((acc, c) => acc + countNodes(c), 0);

/**
 * The recursive render function. Note what is NOT here: no `level`, no depth
 * counter, no wrapper element. The component hands back more of itself.
 */
const WorkTreeNode: Component<{ node: WorkNode }> = (p) => (
  <NestedListItem
    subtree={
      p.node.children?.length ? (
        <For each={p.node.children}>{(c) => <WorkTreeNode node={c} />}</For>
      ) : undefined
    }
  >
    <SpreadRow>
      <TextSublabel>{p.node.title}</TextSublabel>
      <SmStatusBadge variant={p.node.status} label={p.node.status} />
    </SpreadRow>
  </NestedListItem>
);

/** A synthetic chain, to show what happens well past the indent cap. */
const DEEP_ROOT: WorkNode = (() => {
  // Built leaf-first, so the last wrap is the root of the render.
  let node: WorkNode = { id: "x1", title: "level 1", status: "compliant" };
  for (let i = 2; i <= 14; i++) {
    node = {
      id: `x${i}`,
      title: `level ${i}`,
      status: "compliant",
      children: [node],
    };
  }
  // rename so labels read top-down
  const relabel = (n: WorkNode, lvl: number): WorkNode => ({
    ...n,
    title: `level ${lvl}${lvl > NESTED_LIST_MAX_INDENT_STEPS + 1 ? " — indent capped, aria-level still exact" : ""}`,
    children: n.children?.map((c) => relabel(c, lvl + 1)),
  });
  return relabel(node, 1);
})();

/** Flat rows that know their own depth — the virtualised-list shape. */
const FLAT_ROWS = [
  { id: "f1", title: "…rows 1–3998 are not mounted", level: 3 },
  { id: "f2", title: "row 3999", level: 4 },
  { id: "f3", title: "row 4000", level: 5 },
  { id: "f4", title: "row 4001", level: 4 },
  { id: "f5", title: "row 4002", level: 2 },
];

export const NestedListShowcase: Component = () => {
  const [showDeep, setShowDeep] = createSignal(true);
  return (
    <div class="component-section">
      <h2>NestedList / NestedListItem — Layout Primitive (Depth 1)</h2>
      <p class="text-meta">
        The library's hierarchical indent. <code>role="list"</code> /{" "}
        <code>role="listitem"</code> + <code>aria-level</code> carry the depth
        exactly, so the pixels only have to disambiguate it for sighted users —
        one <code>--sui-space-3</code> (12px) step and a 1px guide rail per
        ancestor. Deliberately <strong>not</strong> <code>role="tree"</code>:
        this primitive owns neither focus nor selection, so it cannot honour the
        tree pattern's keyboard contract and does not claim it.
      </p>

      <div class="example-group">
        <h3>Recursive — no level prop at any call site</h3>
        <TightStack>
          <SpreadRow>
            <TextLabel>WORK BREAKDOWN</TextLabel>
            <CountText>{countNodes(WORK)} nodes</CountText>
          </SpreadRow>
          <NestedList aria-label="Work breakdown">
            <WorkTreeNode node={WORK} />
          </NestedList>
        </TightStack>
      </div>

      <div class="example-group">
        <h3>Explicit level — a flat list that knows its own depth</h3>
        <p class="text-meta">
          A virtualised list renders row 4000 without its ancestors mounted.
          Passing <code>level</code> re-seeds the context, so any subtree
          continues from it.
        </p>
        <NestedList aria-label="Virtualised window">
          <For each={FLAT_ROWS}>
            {(r) => (
              <NestedListItem
                level={r.level}
                posInSet={Number(r.id.slice(1))}
                setSize={4002}
              >
                <TextSublabel>{r.title}</TextSublabel>
              </NestedListItem>
            )}
          </For>
        </NestedList>
      </div>

      <div class="example-group">
        <h3>
          Degradation past {NESTED_LIST_MAX_INDENT_STEPS} steps (click to
          toggle)
        </h3>
        <p class="text-meta">
          The indent stops growing at {NESTED_LIST_MAX_INDENT_STEPS} steps (96px)
          so content is never squeezed to nothing; a dashed rule at the content
          edge marks the elision, and <code>aria-level</code> keeps counting.
        </p>
        <button type="button" onClick={() => setShowDeep((v) => !v)}>
          {showDeep() ? "hide" : "show"} 14-level chain
        </button>
        {showDeep() && (
          <NestedList aria-label="Deep chain">
            <WorkTreeNode node={DEEP_ROOT} />
          </NestedList>
        )}
      </div>
    </div>
  );
};
