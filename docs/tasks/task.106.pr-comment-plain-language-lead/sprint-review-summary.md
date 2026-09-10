# Sprint Review Summary — Pull-request summary comments open with a plain-language lead

**Task ID:** task.106
**Completed Date:** 2026-09-10
**Completed By:** Claude (develop-task pipeline, invoked by /develop-next)
**Pull Request:** [#381](https://github.com/Gamaroff/agent-skills/pull/381)
**Tracker Issue:** [#380](https://github.com/Gamaroff/agent-skills/issues/380)

---

## Summary

Anyone following a pull request from a tracker card used to land on the most technical text this
pipeline writes — a five-row Definition of Done table, a QA review full of findings, a code-review
summary of file-and-line references. Tasks 104 and 105 gave *tracker* comments a plain-language
opening paragraph; this task carries that paragraph through to the pull request itself.

---

## What Was Delivered

- **Eleven pull-request conversation templates** now open with a plain-language lead: the Definition
  of Done comment, `finalise`'s canonical summary, the three board-warning notices, the DoD-gaps
  comment, both QA reviews, the qa-fix summary, and the two review-skill summaries.
- **The one engine-built body** — `pr-inline-comment.js` `buildSummaryBody()` — leads too, while a
  caller-supplied `--summary-file` still wins outright and is never double-led.
- **Per-line inline findings deliberately carry no lead.** A comment anchored to line 47 of a diff
  has one reader. That exclusion is now held by two tests rather than by a sentence in a task
  document that disappears on acceptance.
- **A new `stakeholder-summary-cli.js`** so a shell site obtains its lead once, above the
  GitHub/Bitbucket arm split — eleven sites × two arms is twenty-two places a lead could drift.

## Impact

The chain a non-technical stakeholder actually walks — board comment → pull request → detail — is now
readable at every step, not only the first. There is **one** vocabulary: the pull-request stages come
from the same catalogue as the tracker stages, and where a moment exists on both, the same stage
renders both.

**Demonstrated on itself.** The QA gate decision and this task's own review comments were posted to
PR #381 using the feature the task adds.

---

## Testing & QA

| | |
|---|---|
| QA cycles | 3 — CONCERNS 80 → PASS 95 → PASS 90 |
| Final gate | PASS 90/100, 0 open issues |
| Step 5c `/review-pr` | ✅ APPROVE |
| CI | SUCCESS, 5/5, on `008f95aa` |
| Tests | 3 suites extended (52 + 53 + 11); 143/143 verified live by an independent reviewer |
| Security | **measured** — `boundary: true`, 15 adversarial probes executed, 0 reproduced |
| Mutation proofs | 10 run; 2 of the first 4 were invalid and were re-run correctly |

---

## Known Limitations

Carried forward deliberately rather than closed quietly:

1. **The eleven new call sites have no automated shell coverage.** `shellcheck` lints tracked `*.sh`
   sources and this branch changes none; Step 4b refuses the blocks as `mutating` because `node` is
   fail-closed in its allow-list. They were linted by hand for this change — a one-off, not a guard.
2. **Three success criteria rest on inspection, not tests** — SC-4 (idempotency of the two marker
   sites), SC-6 (no new network calls), SC-10 (no hand-edited `references/`).
3. **`npm run eval:all` had not run** at acceptance; it fires at the merge gate.

## Future Work

- Extend the snippet engine to execute repo-local read-only commands, so shell-in-markdown acquires
  a guard (`shared/resources/qa-execute-snippets.mjs`).
- A check that a shell variable a documented block interpolates is actually bound in that block.
  Guard C covers slot *names*; the variable half is what shipped T106-001.
- `qa-task` Step 10 should refuse to write a gate while a dispatched Step 3b review is outstanding
  (observation #56).
