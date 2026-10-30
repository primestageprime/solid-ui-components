// TieableRankList — drag to rank, = to tie neighbours, ⊘ to veto. The
// showcase plays a ballot: it owns order + ties in signals and applies the
// exported pure ops for the "tie all" / "split all" helpers, as a store would.
import { createSignal, For, Show, type Component } from "solid-js";
import {
  TieableRankList,
  splitAll,
  tieAll,
  toTiers,
} from "../../src/components/TieableRankList";
import { SmallButton, SmallGhostButton, SmallQuietButton } from "../../src/components/Button";
import { SpreadRow, TightStack } from "../../src/components/Layout";
import { SectionTitle, MutedBody, TextBody } from "../../src/components/Text";

const TITLES: Record<string, string> = {
  p: "Piranesi",
  c: "Circe",
  k: "Klara and the Sun",
  b: "Babel",
};

export const TieableRankListShowcase: Component = () => {
  const [order, setOrder] = createSignal(["p", "c", "k", "b"]);
  const [ties, setTies] = createSignal([false, true, false]);
  const [vetoed, setVetoed] = createSignal<string | null>(null);
  const tiers = () => toTiers(order(), ties());
  return (
    <div class="component-section component-section--full">
      <div class="example-group">
        <SectionTitle>TieableRankList</SectionTitle>
        <MutedBody>
          Drag ≡ to order. Tap = to tie two neighbours. Alt+↑/↓ on a rank moves
          it. ⊘ is the caller's action slot.
        </MutedBody>
        <div class="tieable-rank-list-demo">
          <TightStack>
            <SpreadRow>
              <MutedBody>{tiers().length} tiers</MutedBody>
              <SmallQuietButton onClick={() => setVetoed(null)}>clear veto</SmallQuietButton>
              <Show
                when={tiers().length > 1}
                fallback={
                  <SmallButton
                    onClick={() => setTies(splitAll(order().length))}
                  >
                    ≠ Split all
                  </SmallButton>
                }
              >
                <SmallButton onClick={() => setTies(tieAll(order().length))}>
                  = Tie all
                </SmallButton>
              </Show>
            </SpreadRow>
            <TieableRankList
              label="Your ranking"
              items={order()}
              getId={(id) => id}
              ties={ties()}
              itemLabel={(id) => TITLES[id]}
              onChange={(o, t) => {
                setOrder(o);
                setTies(t);
              }}
              renderItem={(id) => <TextBody>{TITLES[id]}</TextBody>}
              renderAction={(id) => (
                <SmallGhostButton
                  aria-label={`Veto ${TITLES[id]}`}
                  aria-pressed={vetoed() === id}
                  onClick={() => setVetoed(vetoed() === id ? null : id)}
                >
                  ⊘
                </SmallGhostButton>
              )}
            />
            <MutedBody>
              Tiers:{" "}
              <For each={tiers()}>
                {(t, i) => (
                  <>
                    {i() ? " > " : ""}
                    {t.map((id) => TITLES[id]).join(" = ")}
                  </>
                )}
              </For>
              {vetoed() ? ` · vetoed ${TITLES[vetoed() as string]}` : ""}
            </MutedBody>
          </TightStack>
        </div>
      </div>
    </div>
  );
};
