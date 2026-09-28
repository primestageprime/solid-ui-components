import { createSignal, type Component } from "solid-js";
import {
  GroupedBucketQueue,
  type GroupNode,
} from "../../src/components/GroupedBucketQueue";
import { SubsectionTitle } from "../../src/components/Text";

interface ConfigRow {
  id: string;
  bucket: string;
  name: string;
}

// The shape thorcasting's /configure sidebar groups by: Direction -> Category
// -> Type, three levels deep, each a collapsible header with a rolled-up
// count. Nothing about GroupedBucketQueue assumes exactly three levels — this
// is just the fixture this showcase demonstrates.
const GROUPS: GroupNode[] = [
  {
    key: "revenue",
    label: "Revenue",
    tone: "success",
    children: [
      {
        key: "revenue:license",
        label: "License",
        children: [
          {
            key: "revenue:license:monthly",
            label: "Monthly fixed",
            bucketKey: "rev-lic-monthly",
          },
          {
            key: "revenue:license:annual",
            label: "Annual fixed",
            bucketKey: "rev-lic-annual",
          },
        ],
      },
      {
        key: "revenue:contract",
        label: "Contract",
        children: [
          {
            key: "revenue:contract:milestone",
            label: "Milestone",
            bucketKey: "rev-contract-milestone",
          },
        ],
      },
    ],
  },
  {
    key: "expense",
    label: "Expense",
    tone: "danger",
    children: [
      {
        key: "expense:office",
        label: "Office",
        children: [
          {
            key: "expense:office:monthly",
            label: "Monthly fixed",
            bucketKey: "exp-office-monthly",
          },
        ],
      },
      {
        key: "expense:salary",
        label: "Salary",
        collapsedByDefault: true,
        children: [
          {
            key: "expense:salary:biweekly",
            label: "Biweekly anchored",
            bucketKey: "exp-salary-biweekly",
          },
        ],
      },
    ],
  },
];

const ITEMS: ConfigRow[] = [
  { id: "1", bucket: "rev-lic-monthly", name: "Regus" },
  { id: "2", bucket: "rev-lic-monthly", name: "Acme Corp" },
  { id: "3", bucket: "rev-lic-annual", name: "Big Co" },
  { id: "4", bucket: "rev-contract-milestone", name: "Milestone A" },
  { id: "5", bucket: "exp-office-monthly", name: "WeWork" },
  { id: "6", bucket: "exp-office-monthly", name: "Internet" },
  { id: "7", bucket: "exp-salary-biweekly", name: "Payroll" },
];

export const GroupedBucketQueueShowcase: Component = () => {
  const [selectedKey, setSelectedKey] = createSignal<string | undefined>("1");

  return (
    <div class="component-section">
      <h2>
        GroupedBucketQueue — nested collapsible groups over BucketQueue's row
        model
      </h2>
      <p class="text-meta">
        Where <code>BucketQueue</code> has one flat level of always-present
        buckets, <code>GroupedBucketQueue</code> nests a nested{" "}
        <code>groups</code> tree of any depth — Direction → Category → Type in
        this demo — each collapsible with a rolled-up count. Rows keep
        BucketQueue's own row semantics: controlled <code>selectedKey</code> /{" "}
        <code>onSelect</code>, roving-tabindex keyboard navigation across every
        visible interactive row with no wrap, and the same triage-advance rule (
        <code>../BucketQueue/selection.ts</code>, imported directly) for when a
        selected item's bucket changes out from under it. Full usage guide:{" "}
        <code>src/components/GroupedBucketQueue/README.md</code>.
      </p>

      <SubsectionTitle>
        Click a row to select it; click a header to collapse it
      </SubsectionTitle>
      <p class="text-meta">
        <strong>Salary</strong> starts collapsed (
        <code>collapsedByDefault</code>). Arrow keys / Home / End walk every
        visible row top to bottom regardless of which group it's nested under —
        a row hidden behind a collapsed ancestor is skipped entirely, exactly as
        a collapsed BucketQueue bucket drops its rows from the sequence.
      </p>
      <div class="grouped-bucket-queue-demo">
        <GroupedBucketQueue<ConfigRow>
          groups={GROUPS}
          items={ITEMS}
          bucketOf={(row) => row.bucket}
          keyOf={(row) => row.id}
          renderItem={(row) => <span>{row.name}</span>}
          selectedKey={selectedKey()}
          onSelect={(key) => setSelectedKey(key ?? undefined)}
        />
      </div>
    </div>
  );
};
