// MonthDayGrid — one weekday-aligned month, multi-select days. The showcase
// plays a club scheduling its next meetings: as HOST you open days (accent
// wash); as MEMBER you tick the open days you can make, and each open day
// shows how many members picked it. Three months stack, as the app does.
import { createSignal, For, type Component } from "solid-js";
import {
  MondayMonthDayGrid,
  MonthDayGrid,
  type MonthDayState,
} from "../../src/components/MonthDayGrid";
import { PillTabs } from "../../src/components/Tabs";
import { TightStack } from "../../src/components/Layout";
import {
  SectionTitle,
  MutedBody,
  SubsectionTitle,
} from "../../src/components/Text";

const MONTHS = ["2026-11", "2026-12", "2027-01"];
const TODAY = "2026-11-05";
const OTHERS: Record<string, number> = {
  "2026-11-10": 3,
  "2026-11-17": 5,
  "2026-12-01": 2,
  "2026-12-08": 4,
};

export const MonthDayGridShowcase: Component = () => {
  const [mode, setMode] = createSignal<"host" | "member">("member");
  const [open, setOpen] = createSignal(
    new Set([
      "2026-11-10",
      "2026-11-17",
      "2026-11-24",
      "2026-12-01",
      "2026-12-08",
      "2027-01-12",
    ]),
  );
  const [mine, setMine] = createSignal(new Set(["2026-11-17"]));
  const toggle = (set: Set<string>, iso: string) => {
    const next = new Set(set);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    return next;
  };
  const days = (): Record<string, MonthDayState> => {
    const out: Record<string, MonthDayState> = {};
    for (const m of MONTHS) {
      for (let d = 1; d <= 31; d++) {
        const iso = `${m}-${String(d).padStart(2, "0")}`;
        const isOpen = open().has(iso);
        out[iso] =
          mode() === "host"
            ? { selected: isOpen }
            : {
                enabled: isOpen,
                tone: isOpen ? "accent" : undefined,
                selected: mine().has(iso),
                count: isOpen
                  ? (OTHERS[iso] ?? 0) + (mine().has(iso) ? 1 : 0)
                  : 0,
              };
      }
    }
    return out;
  };
  return (
    <div class="component-section component-section--full">
      <div class="example-group">
        <SectionTitle>MonthDayGrid</SectionTitle>
        <MutedBody>
          One month, weekday-aligned, any number of days picked. Past days
          (before {TODAY}) and days the host has not opened are disabled, and weeks that ended before today are hidden. Arrows
          move, Enter/Space toggle.
        </MutedBody>
        <div class="month-day-grid-demo">
          <TightStack>
            <PillTabs
              tabs={[
                { id: "member", label: "Member: pick days" },
                { id: "host", label: "Host: open days" },
              ]}
              activeTab={mode()}
              onTabChange={(m) => setMode(m as "host" | "member")}
            />
            <For each={MONTHS}>
              {(m) => (
                <TightStack>
                  <SubsectionTitle>{m}</SubsectionTitle>
                  <MonthDayGrid
                    month={m}
                    days={days()}
                    minDate={TODAY}
                    hideWeeksBefore={TODAY}
                    onDayClick={(iso) =>
                      mode() === "host"
                        ? setOpen(toggle(open(), iso))
                        : setMine(toggle(mine(), iso))
                    }
                  />
                </TightStack>
              )}
            </For>
            <SubsectionTitle>
              MondayMonthDayGrid · 2026-11, Monday first
            </SubsectionTitle>
            <MondayMonthDayGrid month="2026-11" days={days()} minDate={TODAY} />
          </TightStack>
        </div>
      </div>
    </div>
  );
};
