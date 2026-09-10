# Sprint Review Summary: Task 105

**Task:** [Every tracker-comment call site feeds the plain-language lead, and the seven that bypass the engine stop bypassing it](./task.105.comment-call-sites-plain-language-lead.md)
**PR:** [#379](https://github.com/Gamaroff/agent-skills/pull/379) · **Issue:** [#378](https://github.com/Gamaroff/agent-skills/issues/378)
**Accepted:** 2026-09-10

---

## Summary

Task 104 taught the comment engine to open every tracker comment with a plain-language paragraph —
two to four sentences answering *what happened, what it means, what happens next*, for a reader with
no technical background. It worked, but it said the same thing every time, because no call site told
it anything specific. And seven comments never reached the engine at all.

This task fixed both halves. Comments now name the pull request, the verdict, the round number and
the count. And the seven that posted a bare `gh issue comment` — unmarked, so a resumed run posted a
second copy; `gh`-only, so a Jira project silently got nothing — now go through the same path as
everything else.

## What a stakeholder actually sees

Before, a QA result on a tracker issue opened with the same paragraph every cycle. Now, from this
task's own pipeline run on issue #378:

> The finished work has been through testing, and the results are in. **The checks found some
> problems worth knowing about, but none that stop the work.** The detail below records what was
> tested and what was found.

That middle sentence is the gate verdict `CONCERNS`, mapped rather than printed. Nothing about the
word "CONCERNS" tells an outside reader whether to worry.

## Key changes

- **24 call sites** now pass `--slot` values (up from 0)
- **7 bypass sites** converted onto the engine — they gain an idempotency marker and become postable
  on Jira at all
- **`review-story`** was the last `review-*` skill whose GitHub arm was off the CLI; its two arms are
  now literally one call, so the same review outcome reads the same way on either tracker
- **2 anti-regression guards** — one repaired, one added

## The part worth showing

**A guard already existed for this, named the exact bug, and passed all seven sites.**
`mutation-call-site-coverage` has watched `gh issue comment` since task 51–56 with
`tracker-comment.js` listed as its required chokepoint. Two independent defects blinded it, and
**fixing one changed nothing** — the mutation proof stayed green, which is how the second was found.

A third hole (`cmd && gh issue comment …`) was found afterwards by *probing* the repaired guard with
eight shell forms rather than reading it. That is the same lesson applied to its own fix: one
sufficient explanation for a miss is not evidence it was the only one.

## Technical details

**Files:** 20 modified + 1 added source; 47 regenerated bundle copies.
**Tests:** `npm run ci:fast` green — 3133 pass / 0 fail. 7 mutation proofs, each turning exactly its
own assertion red. 8 hostile security probes on the lead renderer (0 exploitable) + 9 probes on the
guard classifiers (1 reproduced → fixed).

**Guard B** is the durable output. It asserts every call site passes a slot *and* that every slot name
is one its stage's template reads — importing the mapping from `stakeholder-summary.js` rather than
restating it. That matters because the engine validates no slot names: a wrong one posts successfully,
reports `posted: true`, and is discarded in silence. Demonstrated by execution, both forms exit 0.

## Known limitations

1. **The seven converted sites give up the 3× exponential backoff.** The engine owns the
   `ACCESS_TRACKER` deferral gate but has no retry; re-wrapping would double-defer. The trade is
   deliberate and matches the reference implementation, but it is a real reduction in resilience.
   Follow-up: a retry that does not also defer.
2. **Neither review lens ran independently.** Both subagents hung and were killed; the code and
   conformance reviews were performed in-line by the agent that wrote the change. Every conclusion is
   grounded in something executed rather than re-read, which is a substitute for independence, not a
   replacement.
3. **`outcome` is mapped at each call site** rather than in the engine beside `GATE_MEANING`.
   Recorded as future work.

## Impact

After this, `tracker-comment.js` is the only way a comment reaches a Jira card or a GitHub issue —
which the comment contract has claimed since task 55 and which was not true until now. The claim is
now held by a test rather than by prose, which is the difference that matters: this convention drifted
for months while the documentation asserted otherwise, and nothing noticed, because a comment with no
marker posts exactly as successfully as one with a marker.
