import { describe, expect, it } from "vitest";
import { join, map } from "../../../../src/fn";
import {
  linkKey,
  observeChanges,
  readLinks,
  addPerson,
  positionsOf,
  validateLinks,
  resetOne,
  setValue,
  staffOf,
  writeLinks,
} from "./changes-model";

/** A Map-backed Storage, enough for the three calls the model makes. */
const memoryStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: () => null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
};

/** A Storage that throws on every call — a private window, blocked data. */
const hostileStorage = (): Storage =>
  new Proxy({} as Storage, {
    get: () => () => {
      throw new Error("SecurityError");
    },
  });

describe("staffOf — the dials, from the shared events fixture", () => {
  it("one dial per person: baseline pay as prior, final pay as future", () => {
    const staff = staffOf();
    console.log(observeChanges(staff, [], "plan-a"));
    expect(
      map((e) => [e.id, e.old, e.value, e.range[1]], staff),
    ).toEqual([
      ["Person 1", 80_000, 110_000, 130_000],
      ["Person 2", 80_000, 95_000, 130_000],
      ["Person 3", 95_000, 110_000, 115_000],
      ["Person 4", null, 80_000, 130_000],
      ["Person 5", null, 95_000, 130_000],
    ]);
  });

  it("reset puts a person back to their prior, and a hire to their saved amount", () => {
    const saved = staffOf();
    const moved = setValue(setValue(saved, "Person 1", 120_000), "Person 4", 90_000);
    expect(resetOne(moved, saved, "Person 1")[0].value).toBe(80_000);
    expect(resetOne(moved, saved, "Person 4")[3].value).toBe(80_000);
  });
});

describe("addPerson — [Add] / the A hotkey", () => {
  it("appends a new hire past the highest person number", () => {
    const once = addPerson(staffOf());
    const twice = addPerson(once);
    const rows = map((e) => ({ id: e.id, old: e.old, value: e.value }), twice);
    console.table(rows);
    expect(map((e) => e.id, twice).slice(-2)).toEqual(["Person 6", "Person 7"]);
    expect(twice[6].old).toBeNull();
  });
});

describe("link persistence — localStorage, keyed by scenario, degrading to memory", () => {
  it("round-trips per scenario and removes the key when cleared", () => {
    const storage = memoryStorage();
    writeLinks(storage, "plan-a", ["Person 1", "Person 2"]);
    writeLinks(storage, "plan-b", ["Person 3"]);
    expect(readLinks(storage, "plan-a")).toEqual(["Person 1", "Person 2"]);
    expect(readLinks(storage, "plan-b")).toEqual(["Person 3"]);
    writeLinks(storage, "plan-a", []);
    expect(storage.getItem(linkKey("plan-a"))).toBeNull();
    expect(readLinks(storage, "plan-a")).toEqual([]);
  });

  it("reads garbage and non-strings as nothing", () => {
    const storage = memoryStorage();
    storage.setItem(linkKey("plan-a"), "{not json");
    expect(readLinks(storage, "plan-a")).toEqual([]);
    storage.setItem(linkKey("plan-a"), JSON.stringify(["Person 1", 7, null]));
    expect(readLinks(storage, "plan-a")).toEqual(["Person 1"]);
  });

  it("never throws when storage is missing or hostile", () => {
    expect(readLinks(undefined, "plan-a")).toEqual([]);
    expect(() => writeLinks(undefined, "plan-a", ["x"])).not.toThrow();
    expect(readLinks(hostileStorage(), "plan-a")).toEqual([]);
    expect(() => writeLinks(hostileStorage(), "plan-a", ["x"])).not.toThrow();
    expect(() => writeLinks(hostileStorage(), "plan-a", [])).not.toThrow();
  });
});

describe("validateLinks — stored links checked against the loaded values", () => {
  it("keeps the majority level (ties → highest), drops the rest, dissolves under two", () => {
    const at = (values: readonly (number | null)[]) =>
      map(
        (value: number | null, i: number) => ({
          id: `P${i + 1}`,
          label: `P${i + 1}`,
          old: 80_000,
          value,
          range: [70_000, 130_000] as const,
        }),
        values,
      );
    const cases: readonly [string, readonly (number | null)[], readonly string[]][] = [
      ["all level", [110_000, 110_000, 110_000], ["P1", "P2", "P3"]],
      ["one off → drops", [110_000, 110_000, 95_000], ["P1", "P2", "P3"]],
      ["2 vs 2 tie → highest", [95_000, 95_000, 110_000, 110_000], ["P1", "P2", "P3", "P4"]],
      ["pair split → dissolves", [110_000, 95_000], ["P1", "P2"]],
      ["removed member drops", [110_000, 110_000, null], ["P1", "P2", "P3"]],
      ["vanished id drops", [110_000, 110_000], ["P1", "P2", "gone"]],
      ["nothing stored", [110_000], []],
    ];
    const rows = map(([name, values, stored]) => {
      const entities = at(values);
      return {
        case: name,
        values: join(" ", map((v) => (v === null ? "—" : `${v / 1000}k`), values)),
        stored: join(",", stored),
        kept: join(",", validateLinks(entities, stored)),
      };
    }, cases);
    console.table(rows);
    expect(map((r) => r.kept, rows)).toEqual([
      "P1,P2,P3",
      "P1,P2",
      "P3,P4",
      "",
      "P1,P2",
      "P1,P2",
      "",
    ]);
  });

  it("never moves a value", () => {
    const staff = staffOf();
    const before = JSON.stringify(staff);
    validateLinks(staff, ["Person 1", "Person 2"]);
    expect(JSON.stringify(staff)).toBe(before);
  });
});

describe("positionsOf — Person 3 holds two positions", () => {
  it("adds the evening dial right after Person 3's main one, same item", () => {
    const rows = map(
      (e) => ({ id: e.id, item: e.item, old: e.old, value: e.value, range: join("–", e.range) }),
      positionsOf(),
    );
    console.table(rows);
    expect(map((r) => r.item, rows)).toEqual([
      "Person 1", "Person 2", "Person 3", "Person 3", "Person 4", "Person 5",
    ]);
  });
});
