// GroupedBucketQueue — fixtures shared across the split test files. Not
// exported from ./index.ts.
import { render } from "@solidjs/testing-library";
import { GroupedBucketQueue } from "./GroupedBucketQueue";
import type { GroupNode } from "./groupTree";

export interface Item {
  id: string;
  bucket: string;
}

// Direction -> Category -> Type, mirroring thorcasting's Configure sidebar.
export const GROUPS: GroupNode[] = [
  {
    key: "revenue",
    label: "Revenue",
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
    ],
  },
  {
    key: "expense",
    label: "Expense",
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
    ],
  },
];

export const renderQueue = (
  items: Item[],
  extra: Record<string, unknown> = {},
) =>
  render(() => (
    <GroupedBucketQueue<Item>
      groups={GROUPS}
      items={items}
      bucketOf={(i) => i.bucket}
      keyOf={(i) => i.id}
      renderItem={(i) => <span>{i.id}</span>}
      {...extra}
    />
  ));

export const rows = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-gbq-key]")] as HTMLElement[];

export const rowFor = (container: HTMLElement, key: string) =>
  container.querySelector(`[data-gbq-key="${key}"]`) as HTMLElement;

export const headerFor = (container: HTMLElement, nodeKey: string) =>
  container.querySelector(
    `[data-gbq-node="${nodeKey}"] > .grouped-bucket-queue__header`,
  ) as HTMLElement;
