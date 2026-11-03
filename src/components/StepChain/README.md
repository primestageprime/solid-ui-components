# StepChain / PayChain

A name, a muted tag and a chain of steps that fits its container.

```
Sara Lincoln monthly  $6,250/mo →6mo $37,500 →1mo $16,667 →        one line
Peter D Stradinger bi-weekly                                       two lines
$2,784/biwk →4wk $3,857 →52wk $16,897 →20wk $36,610 →10wk $7,692 →
Michael A Arnold bi-weekly                                         folded
$2,530/biwk →4wk $3,957 →26wk  5 more  →52wk $7,692 →
                               …
```

- `fold.ts` is the pure rule: measured widths in, `{ mode, shown, omitted }` out. Tested without a DOM.
- `StepChain.tsx` measures a hidden probe once (and again on font load or data change) and the container with `observeSize`.
- `PayChain/steps.ts` cleans pay steps (drop zero-length $0 gaps, merge equal neighbours) and words them.
- Zero-config: `<PayChain name cadence steps ends />`. See `COMPONENTS.md` and `dev/showcases/pay-chain.tsx`.
