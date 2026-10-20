import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { bucketOf, defineChildren } from "../../listDetail/children";
import { defineListDetail } from "../../listDetail/defineListDetail";
import { type ListItem, newId } from "../../listDetail/listkit";
import {
  defineCard,
  defineDetail,
  defineSide,
  tableSection,
} from "../../listDetail/views";
import { textCol } from "../Table/columnHelpers";
import {
  ConfiguredCard,
  ConfiguredDetail,
  ConfiguredLog,
  whenLabel,
} from "./ConfiguredViews";

type Leg = {
  id: string;
  name: string;
  status: "idle" | "live" | "over";
  startedAt?: string | null;
  completedAt?: string | null;
  log: { id: string; at: string; text: string }[];
};
type Trip = ListItem & {
  by: string;
  createdAt: string;
  legs: Leg[];
  focusLeg?: string;
};

const legs = defineChildren({
  key: "legs",
  focus: "focusLeg",
  status: { pending: "idle", current: "live", complete: "over" },
  lines: { started: "Left", completed: "Arrived", reopened: "Back" },
});
type Where = "planned" | "going" | "done";
const where = (t: Trip): Where =>
  bucketOf<Trip, Where>(t, [
    { id: "planned", when: (x) => legs.kindOf(x) === "pending" },
    { id: "going", when: (x) => legs.kindOf(x) === "current" },
    { id: "done", when: () => true },
  ]) ?? "done";
const leg = (id: string, name: string): Leg => legs.child(id, { name }) as Leg;
const SEED: Trip[] = [
  {
    id: "t1",
    title: "Alps",
    by: "Ada",
    createdAt: "2026-01-01T00:00:00.000Z",
    legs: [leg("l1", "Train"), leg("l2", "Hike")],
  },
];

const makeKit = () =>
  defineListDetail({
    storageKey: `cv-${newId()}`,
    collection: "trips",
    entity: {
      blank: (): Trip => ({
        id: newId(),
        title: "",
        by: "",
        createdAt: new Date().toISOString(),
        legs: [],
      }),
      textOf: (t: Trip) => t.title,
    },
    groups: {
      order: ["planned", "going", "done"] as const,
      of: (t: Trip) => where(t),
    },
    sorts: {
      order: ["added"] as const,
      default: "added",
      by: { added: () => 0 },
    },
    seed: SEED,
    primary: (t, kit) => kit.actions.update(t.id, legs.advance(t)),
  });

const STATUS = {
  planned: { label: "Planned", variant: "inactive" },
  going: { label: "Going", variant: "active" },
  done: { label: "Done", variant: "success" },
} as const;
const CARD = defineCard<Trip>({
  title: (t) => t.title,
  status: { of: (t) => where(t), map: STATUS },
  detail: (t) => `${legs.progress(t).done} of ${legs.progress(t).total} legs`,
  who: (t) => t.by,
  when: (t) => legs.activityAt(t),
});
const DETAIL = (kit: ReturnType<typeof makeKit>) =>
  defineDetail<Trip>({
    emptyLabel: "Pick a trip",
    titleField: "title",
    facts: [{ label: "By", of: (t) => t.by }],
    action: { hotkey: "c", label: "Complete leg" },
    sections: [
      tableSection<Trip, Leg>({
        title: "Legs",
        countNoun: "leg",
        rowsOf: (t) => t.legs,
        columns: [textCol<Leg>("name", "Name", { field: "name" })],
        selectedOf: (t) => legs.pick(t)?.id,
        onSelect: (t, id) => kit.actions.update(t.id, legs.select(id)),
      }),
    ],
  });
const SIDE = defineSide<Trip, Leg["log"][number]>({
  title: "Log",
  emptyLabel: "Nothing yet",
  rowsOf: (t) => legs.pick(t)?.log ?? [],
  at: (l) => l.at,
  text: (l) => l.text,
});

describe("whenLabel", () => {
  it("is the time today and the short date otherwise", () => {
    const now = new Date("2026-10-21T12:00:00");
    expect(whenLabel("2026-10-21T09:30:00", now)).toMatch(/9|09/);
    expect(whenLabel("2026-03-04T09:30:00", now)).toMatch(/Mar/);
    expect(whenLabel("nope", now)).toBe("");
  });
});

describe("ConfiguredCard", () => {
  it("draws title, status label, detail, who and when from the config", () => {
    const { getByText } = render(() => (
      <ConfiguredCard item={SEED[0]} config={CARD} />
    ));
    expect(getByText("Alps")).toBeTruthy();
    expect(getByText("Planned")).toBeTruthy();
    expect(getByText("0 of 2 legs")).toBeTruthy();
    expect(getByText("Ada")).toBeTruthy();
  });

  it("omits the slots the config leaves out", () => {
    const { queryByText } = render(() => (
      <ConfiguredCard
        item={SEED[0]}
        config={defineCard<Trip>({ title: (t) => t.title })}
      />
    ));
    expect(queryByText("Planned")).toBeNull();
  });

  it("a row card draws the marker icon and the foot line", () => {
    const { container, getByText } = render(() => (
      <ConfiguredCard
        item={SEED[0]}
        config={defineCard<Trip>({ layout: "row", title: (t) => t.title, marker: () => "warning", foot: { left: () => "2026-01-01", right: () => "27h" } })}
      />
    ));
    expect(container.querySelector(".sui-configured-card__aside .sui-icon, .sui-configured-card__aside svg, .sui-configured-card__aside span")).toBeTruthy();
    expect(getByText("2026-01-01")).toBeTruthy();
    expect(getByText("27h")).toBeTruthy();
  });
});

describe("ConfiguredDetail", () => {
  it("shows the empty label with nothing selected", () => {
    const kit = makeKit();
    kit.setState("view", "selectedId", null);
    const { getByText } = render(() => (
      <ConfiguredDetail kit={kit} config={DETAIL(kit)} />
    ));
    expect(getByText("Pick a trip")).toBeTruthy();
  });

  it("draws the title, a fact, the table and the action for the selected item", () => {
    const kit = makeKit();
    const { getByText, container } = render(() => (
      <ConfiguredDetail kit={kit} config={DETAIL(kit)} />
    ));
    expect(getByText("Alps")).toBeTruthy();
    expect(getByText("By: Ada")).toBeTruthy();
    expect(getByText("Train")).toBeTruthy();
    expect(container.querySelectorAll("tbody tr").length).toBe(2);
    expect(getByText(/omplete leg/)).toBeTruthy();
  });

  it("the action runs the kit's primary verb and a row click drives the config's onSelect", async () => {
    const kit = makeKit();
    const { getByText } = render(() => (
      <ConfiguredDetail kit={kit} config={DETAIL(kit)} />
    ));
    fireEvent.click(getByText("Hike"));
    expect(kit.live()[0].focusLeg).toBe("l2");
    const spy = vi.spyOn(kit.actions, "primary");
    fireEvent.click(getByText(/omplete leg/));
    expect(spy).toHaveBeenCalled();
  });

  it("subtitle, summary and the toolbar placement with extra actions", () => {
    const kit = makeKit();
    const extra = vi.fn();
    const { getByText, container } = render(() => (
      <ConfiguredDetail
        kit={kit}
        config={defineDetail<Trip>({
          emptyLabel: "Pick a trip",
          titleField: "title",
          subtitle: () => "Jan 1 to Jan 3",
          summary: () => ({ text: "All legs planned", icon: "check", variant: "success" }),
          action: { hotkey: "c", label: "Go", placement: "toolbar" },
          actions: [{ hotkey: "g f", label: "Skip", onTrigger: extra }],
          sections: [],
        })}
      />
    ));
    expect(getByText("Jan 1 to Jan 3")).toBeTruthy();
    expect(getByText("All legs planned")).toBeTruthy();
    expect(container.querySelector(".sui-configured-detail__summary--success")).toBeTruthy();
    const bar = container.querySelector(".sui-configured-detail__toolbar")!;
    expect(bar.querySelectorAll("button").length).toBe(2);
    fireEvent.click(getByText(/kip/));
    expect(extra).toHaveBeenCalledWith(kit.live()[0]);
  });
});

describe("ConfiguredLog", () => {
  it("lists the log of the focused child of the selected item, and the empty label when none", () => {
    const kit = makeKit();
    const first = render(() => <ConfiguredLog kit={kit} config={SIDE} />);
    expect(first.getByText("Nothing yet")).toBeTruthy();
    first.unmount();
    kit.actions.update(
      "t1",
      legs.advance(kit.live()[0], "2026-10-21T10:00:00.000Z"),
    );
    const second = render(() => <ConfiguredLog kit={kit} config={SIDE} />);
    expect(second.getByText("Left")).toBeTruthy();
  });
});
