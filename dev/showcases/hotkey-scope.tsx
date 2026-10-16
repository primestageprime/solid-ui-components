// useHotkeys / createHotkeyScope — one window listener for a whole table of
// { action, keys, scope } bindings. Not a visual component: a hook. Shown with
// a live table you can press, the scopes switching when a dialog "opens", and
// the same decisions printed as a trace with no DOM at all (traceHotkeys).
//
// Press n, j, k, g then t, or ? with the dialog closed. Open the dialog and the
// list keys go quiet: only Escape (closing it) answers.
import { type Component, For, createSignal } from "solid-js";
import { SmallOutlinedButton } from "../../src/components/Button";
import { Kbd } from "../../src/components/Kbd";
import { ClusterRow, NarrowStack, SpreadRow } from "../../src/components/Layout";
import { SectionTitle, MutedBody, TextBody, TextLabel, TextSublabel } from "../../src/components/Text";
import {
  traceHotkeys,
  useHotkeys,
  type HotkeyEntry,
} from "../../src/hooks";

const TABLE: ReadonlyArray<HotkeyEntry> = [
  { action: "new", verb: "new", keys: "n", scope: "global" },
  { action: "help", verb: "help", keys: "?", scope: "global" },
  { action: "tasks", keys: "g t", scope: "global" },
  { action: "next", verb: "next", keys: "j", scope: "list" },
  { action: "prev", verb: "prev", keys: "k", scope: "list" },
  { action: "closeDialog", verb: "close", keys: "Escape", scope: "modal" },
];

const TRACE = traceHotkeys(
  TABLE,
  (i) => (i < 6 ? ["global", "list"] : ["modal"]),
  ["n", "g", "t", "g", "z", "j", "j", "Escape"],
);

export const HotkeyScopeShowcase: Component = () => {
  const [dialog, setDialog] = createSignal(false);
  const [fired, setFired] = createSignal<string[]>([]);
  const note = (action: string) => setFired((f) => [action, ...f].slice(0, 6));

  useHotkeys({
    table: TABLE,
    handlers: {
      new: () => note("new"),
      help: () => {
        note("help");
        setDialog(true);
      },
      tasks: () => note("tasks (g t)"),
      next: () => note("next"),
      prev: () => note("prev"),
      closeDialog: () => {
        note("closeDialog");
        setDialog(false);
      },
    },
    scopes: () => (dialog() ? ["modal"] : ["global", "list"]),
  });

  return (
    <div class="component-section component-section--full">
      <div class="example-group">
        <SectionTitle>useHotkeys / createHotkeyScope</SectionTitle>
        <MutedBody>
          One capture-phase window listener dispatches the table. Keys typed in a
          text field are ignored, a chord like <Kbd>g</Kbd> <Kbd>t</Kbd> waits for
          its second key, and while the dialog scope is active nothing below it fires.
        </MutedBody>
        <div class="hotkey-scope-demo">
          <NarrowStack>
            <SpreadRow>
              <TextLabel>{dialog() ? "Dialog open: scope is modal only" : "Scopes: global, list"}</TextLabel>
              <SmallOutlinedButton onClick={() => setDialog(!dialog())}>
                {dialog() ? "Close dialog" : "Open dialog"}
              </SmallOutlinedButton>
            </SpreadRow>
            <For each={TABLE}>
              {(e) => (
                <SpreadRow>
                  <TextBody>{`${e.action} (${e.scope})`}</TextBody>
                  <ClusterRow>
                    <Kbd>{e.keys}</Kbd>
                  </ClusterRow>
                </SpreadRow>
              )}
            </For>
            <TextSublabel>Last fired, newest first:</TextSublabel>
            <TextBody>{fired().length ? fired().join(", ") : "(press a key)"}</TextBody>
          </NarrowStack>
        </div>
      </div>

      <div class="example-group">
        <SectionTitle>traceHotkeys — the same decisions, no DOM</SectionTitle>
        <MutedBody>
          A key sequence driven through the pure dispatcher. The dialog opens before the last press.
        </MutedBody>
        <div class="hotkey-scope-demo">
          <NarrowStack>
            <SpreadRow>
              <TextSublabel>key</TextSublabel>
              <TextSublabel>outcome</TextSublabel>
              <TextSublabel>action</TextSublabel>
              <TextSublabel>waiting</TextSublabel>
            </SpreadRow>
            <For each={TRACE}>
              {(row) => (
                <SpreadRow>
                  <Kbd>{row.key}</Kbd>
                  <TextBody>{row.outcome}</TextBody>
                  <TextBody>{row.action || "—"}</TextBody>
                  <TextBody>{row.waiting || "—"}</TextBody>
                </SpreadRow>
              )}
            </For>
          </NarrowStack>
        </div>
      </div>
    </div>
  );
};
