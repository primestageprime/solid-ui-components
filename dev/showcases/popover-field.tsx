// PopoverField / DayOfMonthField: a compact field that opens a picker under it.
import { createSignal, type Component } from "solid-js";
import { DayOfMonthField, PopoverField } from "../../src/components/PopoverField";
import type { DayOfMonth } from "../../src/components/PopoverField";
import { SmallGhostButton } from "../../src/components/Button";

export const PopoverFieldShowcase: Component = () => {
  const [day, setDay] = createSignal<DayOfMonth>(5);
  const [colour, setColour] = createSignal("Red");
  return (
    <div class="component-section">
      <h2>PopoverField / DayOfMonthField — Depth 1 / 2</h2>
      <p class="text-meta">
        A compact field reading as its value that opens a picker in a popover under it. It opens on click or
        Enter (never on hover), closes on Escape, on an outside click, and when the picker calls close after a
        pick. Focus returns to the field.
      </p>
      <h3>Day of month</h3>
      <div class="example-group popover-field-demo">
        <DayOfMonthField value={day()} onChange={setDay} />
        <span class="text-meta">value: {String(day())}</span>
      </div>
      <h3>Any picker</h3>
      <div class="example-group popover-field-demo">
        <PopoverField label="Colour" value={colour()}>
          {(close) => (
            <div class="popover-field-demo__choices">
              {["Red", "Green", "Blue"].map((c) => (
                <SmallGhostButton
                  onClick={() => {
                    setColour(c);
                    close();
                  }}
                >
                  {c}
                </SmallGhostButton>
              ))}
            </div>
          )}
        </PopoverField>
      </div>
    </div>
  );
};
