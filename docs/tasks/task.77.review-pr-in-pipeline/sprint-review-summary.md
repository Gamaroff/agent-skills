# Sprint Review — Task 77: Run the PR conformance review before a work item is finalised

**Status:** Accepted (by waiver) · **PR:** [#309](https://github.com/Gamaroff/agent-skills/pull/309) · **Date:** 2026-09-04

## What shipped

`/review-pr`'s **conformance** lens is now Step 5c of the develop pipelines — the exit gate of the
Steps 5–6 QA loop. A gate reading `PASS`/`WAIVED` no longer leaves the loop on its own; it hands to
5c, which is the only way through to Step 7.

- `REQUEST CHANGES` → back to `/qa-fix`, consuming a cycle from the **same** 5-cycle budget
- `CONCERNS` → recorded, non-blocking · `APPROVE` → exit
- **Review failed** → HALT, never a fall-through to `/finalise`
- `ready-for-merge` moved behind the review, so a card is not advertised mergeable while the run can still loop backwards
- Lite mode **degrades** the review to `--effort low`; it never skips it
- Still 8 steps. No `{N}/8` string changed. `/review-pr` gains no new power — no gate, no formal review, no code edits

## Why it existed

`/review-pr` shipped standalone because its *code* lens duplicates the reviewer QA already runs. That
was right about the code lens and silent about the conformance lens — *does the diff deliver what the
work item promised, and does the trail behind it hold up* — which had no counterpart anywhere. A run
could reach `accepted` on a complete-looking trail that did not hold.

## The demo

**The task caught its own class of defect, on its own PR, repeatedly.** Step 5c ran on #309 and
returned REQUEST CHANGES, including the finding that the agent which wrote the change had also
written the gate clearing it. Seven independent gates followed, none reaching PASS:

| Gate | Verdict | Found |
| --- | --- | --- |
| 5 | FAIL 70 | a finding dropped while full closure was claimed |
| 6 | FAIL 75 | a **fabricated mutation proof**, published in three artifacts |
| 7 | FAIL 78 | the fix for that still weaker than its claim |
| 8 | CONCERNS 87 | a matrix that could not discriminate the mechanism it cited |
| 9 | CONCERNS 91 | *"the trail is now honest"* — 44 mutations, none failed |
| 10 | CONCERNS 90 | a **real guard hole**: the verdict table was mention-matched |
| 11 | CONCERNS 90 | a **sixth** mention-for-mapping — inside the fix for the fifth |

Then three DoD runs, the third of which falsified the waiver's own precondition.

**Every finding across all of it was in the artifact trail or in test strength. None was a defect in
pipeline behaviour** — gate 11: *"every routing arm on disk is correct."*

## Evidence

22 parity tests (0/22 against `origin/develop` — none vacuous) · lock 14/14 under bash **and** zsh ·
`npm run ci` exit 0 · CI 4/4 on the accepted head · security PASS on **3029 executed probes**, 0
introduced · bundles content-verified.

## Known residuals

Accepted **by operator waiver**, not by a PASS. The waiver covers LOW and MEDIUM trail-currency and
test-strength findings; it covers nothing in routing, security or CI. Carried: AC5's artifact
evidence is contract-chain rather than per-run; AC16 has no CI guard against a 5c leak into
`develop-bug`. Two pre-existing `advance-pipeline-lock.sh` issues were found and deliberately left
out of scope: a zero-byte lock reports success for an advance that did not happen, and `$LOCK.tmp`
follows a symlink.

## Worth carrying forward

**Six instances of one bug class**: an assertion claiming a *relationship* — X routes to Y, X fires
at Y — that only tests whether both names appear. It recurred on six different surfaces, twice
inside the fix for the previous instance. A lint for prose-matching assertions would be worth more
than any of the individual fixes.
