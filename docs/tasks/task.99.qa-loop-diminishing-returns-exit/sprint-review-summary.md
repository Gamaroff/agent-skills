# Sprint Review Summary — Task 99

**Task:** A diminishing-returns exit for the QA loop
**PR:** [#361](https://github.com/Gamaroff/agent-skills/pull/361) → `develop`
**Accepted:** 2026-09-09 · **Gate:** PASS 100/100 · **QA cycles:** 5

---

## Summary

The QA loop had one stall guard — the Convergence check — and it measures HIGH findings. A run that
reaches zero HIGH but keeps producing MEDIUM and LOW findings *inside its own test machinery*
satisfies nothing that guard looks at, so it runs to the five-cycle limit refining pins while the
product has been finished for two cycles. Measured on the consumer run this was filed from: HIGH
`2, 0, 0, 0` across four cycles, 21 findings, **none of them in the three fixes the task existed to
make**.

This adds the opposite instrument beside the existing one. The Convergence check fires when HIGH
findings *remain and stop falling* and **escalates** — the loop stopped working. The new exit fires
when HIGH findings are *gone* and the residue is machinery, and **exits cleanly** — the loop finished
working. Neither can claim the other's run.

## Success Criteria Met

12 / 12, each verified mechanically rather than asserted: section placement by line number, the rule's
behaviour by 34 executable tests over 11 reconstructed gate fixtures, the config key by three
occurrences in the reference, and the Convergence check's byte-identity by diff (5624 bytes both
sides).

## Key Features

- **`shared/resources/qa-diminishing-returns.js`** — a pure library (no filesystem access, never
  throws) modelled on `review-report-freshness.js`. It does **not** recount HIGH findings: it takes
  the sequence the Convergence check already recorded, because two implementations of one count drift
  silently and would leave the two guards disagreeing about the same run while each looked right.
- **The exit hands to 5c**, exactly as a clean gate does — it never becomes the one path to Step 7
  that skips the PR conformance review.
- **`qa.testArtifactGlobs`**, defaulting to `[]`. An empty list matches nothing, so the exit can never
  fire and an unconfigured project keeps today's behaviour exactly: the fail-safe direction is the
  default, not an opt-in.
- **An empty residue never exits.** Condition 2 is vacuously true of no findings, and a rule that
  fires on vacuous truth fires hardest exactly when its reader is broken.

## Testing & QA

- 34 unit tests; full `npm run ci` (including `eval:all`) green at **2938 / 0**; CI green on the final head.
- **Mutation-proved ten ways.** Two mutations initially survived and both were real gaps:
  dropping the "two consecutive zero-HIGH" half of condition 1 (no fixture distinguished it), and the
  glob-collapse (added later, proved at 3301×).
- **The rule was run against this PR's own gates.** It declined three times for three distinct correct
  reasons — `high-findings-remain`, `non-test-finding`, `no-residue` — and fired once when globs were
  configured to cover the residue. Condition 1 was first satisfied at cycle 4 and it still declined,
  because this repo has never set `qa.testArtifactGlobs`: the fail-safe demonstrated live rather than
  asserted.

## Security

Probe mode fired — the deliverable is a predicate. **7 candidates executed against the shipped code**,
1 reproduced: `*` × N compiled to `[^/]*` × N, so a 14-star glob took **23 seconds**. Not a
vulnerability (both inputs repo-controlled) but a hang inside the QA loop. Fixed by collapsing star
runs, which is a no-op on meaning. **Four QA cycles walked past it; probe mode found it on its first
pass, because it executed the predicate rather than reading it.**

## Demo Notes

```
HIGH sequence 1,1,0,0,0 — this PR's own gates

Convergence check @ 4:  0>=0 true, 0>=1 FALSE   →  does not trip
Diminishing-returns @ 4, globs unset:              continue | non-test-finding
Diminishing-returns @ 4, globs configured:         exit     | diminishing-returns
Diminishing-returns @ 5, clean gate:               continue | no-residue
```

## Impact

A loop that has stopped finding blockers can now end at cycle 3 instead of running to five. On the
recorded consumer run that is one cycle — roughly 19 minutes of CI plus the agent time — **not the two
the task's Motivation claims**; the arithmetic was corrected during implementation and the correction
is argued in the document.

## Known Limitations

1. **The saving is extrapolated from one run.** The task says so itself; nothing here changes that.
   Re-measure across the next few pipeline runs before treating it as an expected return.
2. Three latent LOWs remain in the gate's `recommendations.future`, deliberately unfixed — refining
   them is the behaviour this rule exists to end.
3. `mutation-proving.md` names four vacuity shapes; this task surfaced a **fifth** — a fixture corpus
   containing no instance of the input class, which no mutation can reveal. Worth its own task.
4. Nothing yet emits `category:` on a gate entry, so condition 3 rests on the `nfr_validation` signal.
5. **No independent reviewer at any point in this run.** Every review lens ran in the context that
   authored the change.
