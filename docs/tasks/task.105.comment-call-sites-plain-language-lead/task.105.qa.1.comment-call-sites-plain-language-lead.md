# QA Report: Task 105 — Every tracker-comment call site feeds the plain-language lead

**Task**: [task.105.comment-call-sites-plain-language-lead.md](./task.105.comment-call-sites-plain-language-lead.md)
**Gate File**: [task.105.gate.1.comment-call-sites-plain-language-lead.yml](./task.105.gate.1.comment-call-sites-plain-language-lead.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-10
**PR**: [#379](https://github.com/Gamaroff/agent-skills/pull/379)
**Gate Status**: CONCERNS

---

## Executive Summary

Task 105 adds `--slot` values at every `tracker-comment.js` call site and converts the seven that
bypassed the engine entirely. The change is verified almost entirely by **execution** rather than by
inspection — which matters here, because the defect class it targets is silent by construction: a
comment with a wrong slot name posts successfully, reports `posted: true`, and reads exactly as it
would have with no slot at all.

The strongest evidence in this review is not that the tests pass. It is that the **guard which already
named this bug passed all seven bypass sites**, and that repairing it required two independent fixes —
the second of which was found only because the first was mutation-proved and the mutation stayed green.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All 5 implementation phases completed and checkboxes marked
- [x] Tests passing — `npm run ci:fast` green (3132 pass / 0 fail, exit 0)
- [x] Breaking changes documented with migration paths (§5.1–5.3)
- [x] Code on feature branch with open PR #379

### Testing Approach

- [x] Automated Testing (unit + contract + eval suites)
- [x] Code Review (Step 3b — read-only Explore subagent over the branch diff)
- [x] Security Review (Step 7 — hostile probes **executed**, not reasoned)
- [x] Regression Testing (base-branch comparison for pre-existing findings)
- [x] Mutation Proving (Step 3c — 6 proofs)
- [ ] Performance Testing — N/A, no runtime performance surface

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff code review. Standard mode (not lite):
`risk_level: medium` and 5 phases across `shared/resources/`, 8 `SKILL.md`, `tests/` and `evals/`.

First review — no prior gate, so the code review took the **whole branch diff** (2699 lines,
24 source files; generated `references/` copies excluded as bundle output).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| :--- | :--- | :--- | :--- |
| Phase 1 — Pipeline step docs | PASS | Verified | 7 source files, 13 sites; each slot's variable checked as bound at that point |
| Phase 2 — Skill call sites | PASS | Verified | 8 `SKILL.md`, 11 sites; `qa-fix` body split into `$FIX_SUMMARY` + two wrappers |
| Phase 3 — Close the bypass | PASS | Verified | All 7 converted; `review-story`'s GitHub arm collapsed onto the CLI |
| Phase 4 — Tests and guards | PASS | Verified | Guard A repaired, Guard B added, parity extended; 6 mutation proofs |
| Phase 5 — Bundle and sweep | PASS | Verified | 47 regenerated copies; idempotency proven by content hash |

**Overall Phase Completion**: 5/5 phases passed

**Site count is 24, not the task's stated 22, and the delta is legitimate.** `step-7-finalise.md`'s
GitHub arm held a story-variant and a task-variant pair of bare `gh` calls; converting each pair to
comment-then-close produces one `tracker-comment.js` site per variant where the inventory counted the
bypass pair once. A bypass site becoming a real call site is the point of the task.

---

## Success Criteria Verification

**Functional**

| Criterion | Target | Actual | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| All sites pass ≥1 slot, bound, with a name the stage reads | Yes | Yes | PASS | Guard B assertions 1–3 green; mapping imported from `stakeholder-summary.js`, not restated |
| Zero bare `gh issue comment` in shipped `.md` outside allowlist | 0 | 0 | PASS | Guard A §1 green; independent 920-file walk found 4 survivors, all intended |
| Converted sites post a marker and are idempotent across a re-run | Yes | Yes | PASS | **Executed**: re-run against an issue already carrying the `done` marker → `posted: false, reason: "already"`, nothing sent |
| `review-story`'s Jira and GitHub arms produce the same text | Yes | Yes | PASS | Structural — they are now one call with one body |
| Comment-then-close ordering asserted, not just documented | Yes | Yes | PASS | Guard B assertion 5; mutation-proved by swapping the order |

**Performance**

| Criterion | Target | Actual | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| No call site gains a round-trip except the two `--comment`-on-close sites | Yes | Yes | PASS | Structural: slots are argv on an existing call. The two close sites necessarily become two calls, as §5.2 states |

**Code quality**

| Criterion | Target | Actual | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| No `skills/*/references/` hand-edited; `bundle` produces no diff | Clean | Clean | PASS | Content-hash comparison across two consecutive `npm run bundle` runs — identical. Not eyeballed from `git status` |
| `qa-fix`'s two bodies share content through one variable | Yes | Yes | PASS | `$FIX_SUMMARY` is the single source; `$PR_COMMENT_BODY` and `$TRACKER_COMMENT_BODY` wrap it |
| Every converted site reads `reason`; none posts over `unverifiable` | Yes | Yes | PASS | Each carries the contract pointer and `\|\| echo … continuing`; the engine returns `unverifiable` without posting |

**Migration**

| Criterion | Target | Actual | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| Contract's incomplete-migration paragraph rewritten, not deleted | Yes | Yes | PASS | Rewritten to describe the finished state **and** why the guard exists; `AGENTS.md` carried the same claim and was corrected |
| Consumer docs restating comment behaviour swept | Yes | Yes | PASS | `AGENTS.md` corrected; roadmap hits are historical records of past tasks; `configuration.md`'s mention describes `tracker_write` coverage and remains true |

---

## Breaking Changes Validation

### Breaking Change 5.1 — Seven comments change transport
Documented: Yes · Migration path: Yes · Tested: Yes (idempotency executed) · Consumer code updated: N/A
**Assessment**: PASS. The added impact — the loss of the 3× backoff — was **found during review to be
undocumented** (the plan claimed the engine had its own retry; it has none) and is now stated in §5.1,
at each converted site, and in the implementation report.

### Breaking Change 5.2 — `gh issue close --comment` becomes two calls
Documented: Yes · Migration path: Yes · Tested: Yes (ordering asserted + mutation-proved) · Consumer code updated: N/A
**Assessment**: PASS. Ordering is now a test, not a sentence. The `tracker-issue.js --close` flag named
in the plan does not exist (`--kind close`) and was corrected at review before implementation.

### Breaking Change 5.3 — `qa-fix`'s shared body splits in two
Documented: Yes · Migration path: Yes · Tested: Structural · Consumer code updated: N/A
**Assessment**: PASS. The stated migration — keep shared *content* in one variable, wrap per site —
is what was implemented.

**Overall Breaking Changes Assessment**: PASS

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: `measured`
- **Probes executed**: 8

Slot values reach a paragraph written for a non-technical reader, so the renderer is a boundary and
was probed rather than reasoned about. Eight hostile candidates were executed against
`tracker-comment.js` with a fake `gh` on `PATH`, capturing what actually reached the transport:

| Probe | Result |
| :--- | :--- |
| `verdict` = an injected `<!-- agent-skills-comment:done -->` marker | **Not interpolated.** `verdict` is *mapped* through `GATE_MEANING`, so the payload never reaches the output; renders the safe fallback |
| `title` = `$(rm -rf /)` | Rendered literally. No shell evaluation — the engine spawns `gh` with argv and passes the body by `--body-file` |
| `pr` = `</script><script>alert(1)</script>` | Rendered literally into markdown; no execution surface |
| `blocking` = `"false"` | Read as **absent** → renders the negative branch. Correct, and the opposite of a truthy-string bug |
| `count` = `-5` | Dropped; lead degrades to the shorter true sentence |
| `count` = `1e3`, `cycle` = `0x10` | Coerced to 1000 and 16 — documented deliberate behaviour in `normaliseSlots` |
| `verdict` = an unknown token | Renders "The results are recorded below" — **not** unearned reassurance |

**0 of 8 reproduced as exploitable.** The most valuable result is the first: mapping `verdict` rather
than interpolating it is what makes the one slot most likely to carry an internal token immune to
injection through it.

Recorded, not a finding against this task: **text slots are passed through unsanitised** by design
(`stakeholder-summary.js`: "the caller's string is the caller's business"). Safe today because every
call site supplies pipeline-controlled values, and safe against shell injection because of argv +
`--body-file`. A future call site passing user-controlled text would inject into the lead. This is a
property of task.104's engine, not of task.105's call sites.

### Reliability — CONCERNS

- Every converted site degrades gracefully (`|| echo … continuing`) and the engine's `unverifiable`
  path refuses to post rather than risking a duplicate — both correct.
- **The concern is the deliberate loss of the 3× exponential backoff** at the seven converted sites.
  This is the right trade (re-wrapping would double-defer, and it matches `review-task`, the reference
  implementation), it is now documented at every site and in §5.1, and the failure mode is a logged
  warning rather than a silent drop. But it is a real reduction in resilience on a network call, taken
  knowingly, and CONCERNS is the honest grade for a knowingly-accepted regression.
- Recorded as future work rather than fixed here: a retry that does not also defer would close it.

### Performance — PASS

No runtime performance surface. Slots are argv on calls that already happen; the only added round-trips
are the two closes that necessarily become two calls, which §5.2 documents.

### Maintainability — PASS

The change *reduces* the number of ways a tracker comment can be posted from two to one, which is the
maintainability argument the comment contract has made since task 55 and which was untrue until now.
Guard B derives its expectations from `stakeholder-summary.js` rather than restating them, so the
"which slots does this stage read?" question has exactly one answer in the repository.

---

## Code Review

**The independent code-review subagent did not complete, and this is recorded rather than glossed.**
It was dispatched over the full branch diff, ran for ~6 minutes without returning, and was killed —
the third time an Explore subagent has hung in this repository's sessions. The review below was
therefore performed **in-line**, and it is weaker for it in exactly one respect: it lacks a reviewer
who did not write the code. Every finding below was reached by *executing* something rather than by
re-reading, which is the best available substitute, but it is a substitute.

### Correctness review — performed in-line

**`qa-fix`'s three-variable split (§5.3) — no use-before-assignment.** `$FIX_SUMMARY` is assigned at
L706; `$PR_COMMENT_BODY` (L772) and `$TRACKER_COMMENT_BODY` (L779) wrap it; the uses are at L787
(GitHub PR), L790 (Bitbucket PR) and L828 (tracker issue). Order is correct, each body reaches its
intended destination, and the shared prose exists once.

**Slot correctness re-derived by a method that shares nothing with Guard B.** Guard B answers "which
slots does this stage read?" by regex-scanning the template *function source* for `s.NAME`. If that
derivation were wrong, the guard and any verification built on it would be wrong together. So the
question was answered a second way — **render the lead with the slot and without it, and see whether
the output moves**:

```
work-started → title          review* → outcome, blocking     develop-complete → count
in-review    → pr             qa-gate → verdict, blocking_count
qa-cycle     → verdict, cycle qa-fix  → cycle                 done → pr
```

Cross-checked against all 24 sites: **every slot at every site demonstrably changes its lead.** The
two methods agree exactly.

**That agreement is now enforced, not just observed.** A template written with destructuring —
`({verdict, cycle}) => …` — reads a slot the regex cannot see, and Guard B would then reject *correct*
call sites: a failure worse than the one it guards, because it argues against a true statement and the
obvious remedy is to delete the slot. A sixth assertion now compares the source scan against rendering
and fails if they ever disagree. Mutation-proved by destructuring a template: it turns **two**
assertions red, which is the cascade it exists to prevent.

### A second Guard A hole, found by probing rather than reading

Guard A was probed with eight shell forms of the same bare call after its repair. Seven were caught;
one was not:

| Form | Before | After |
| :--- | :--- | :--- |
| `gh issue comment …` | ✅ | ✅ |
| `tracker_call_with_retry gh issue comment …` | ✅ (this task's fix) | ✅ |
| `tracker_write gh issue comment …` | ✅ | ✅ |
| `OUT=$(gh issue comment …)` | ✅ | ✅ |
| **`true && gh issue comment …`** | **❌ MISSED** | ✅ |
| `false \|\| gh issue comment …` | ❌ | ✅ |
| `cd /tmp; gh issue comment …` | ❌ | ✅ |
| `if true; then gh issue comment …; fi` | ❌ | ✅ |
| `echo x \| gh issue comment …` | ❌ | ✅ |

`isInvocation` allowed a connective as the *entire* prefix but not a connective *preceded by a
command*, so any chained call was invisible. Fixed by keeping only the text after the last connective.
Prose in backticks is still correctly not flagged — verified as a false-positive check, because a
guard that fires on documentation gets its allowlist widened until it means nothing.

**This is the same lesson as the original defect, applied to its own repair.** One sufficient
explanation for a miss is not evidence it was the only one. Logged as observation #50.

### Cleanups noted (advisory, not fixed)

- `shared/resources/develop-pipeline-step-7-finalise.md` — the story and task variants of the converted
  block differ only in the words "Story"/"Task" and the skill path. The file's existing convention is
  to write both out, so this follows it rather than diverging, but the duplication is real.
- `qa-story` and `qa-task`'s Step 13b blocks are now near-identical (issue resolution, gate re-resolve,
  `blocking_count`, the call). They are separate skills by design and the repo has no mechanism for
  sharing a fragment between two `SKILL.md` files, so this is noted rather than actioned.
- `renderLead`-based slot derivation (the cross-check above) is arguably a better primary
  implementation for `slotsReadBy` than the regex. It was kept as a *check* rather than a replacement
  because the regex names the slot for the error message; the check makes the regex safe.

---

## Mutation Proofs (Step 3c)

Each turns exactly its own assertion red, and no other:

| # | Mutation | Assertion that went red | Result |
| :-- | :--- | :--- | :--- |
| 1 | Restore a bare `gh issue comment` (retry-wrapped, verbatim as it was) in `step-7-finalise.md` | `mutation-call-site-coverage` §1 | ✅ red at `:201`; green on revert |
| 2 | Drop the `qa-gate` site's slots | Guard B — "every call site passes at least one `--slot`" | ✅ red; other 4 stayed green |
| 3 | Restore the wrong slot name (`pr` on `qa-gate`) | Guard B — "every slot name … its stage's template reads" | ✅ red; other 4 stayed green |
| 4 | Swap the close before its comment | Guard B — "the comment comes first" | ✅ red; green on revert |
| 5 | Break Guard B's own walk regex | Guard B — non-vacuity floor | ✅ red — a broken instrument fails loudly rather than reporting a clean repository |
| 6 | Alter a `#### develop-story` decision-table row | `review-report-freshness` §12 (narrowed) | ✅ red — the narrowing kept the protection §9 argued for |

Proofs 2 and 3 are the important pair: they fail on **different** assertions, so the guard
distinguishes "fed the lead nothing" from "fed it a name nothing reads" rather than collapsing both
into one alarm.

**Proof 1 is why this review trusts the guard at all.** After the first of Guard A's two fixes, the
mutation stayed **green** — the guard still could not see a wrapper-prefixed call. The second fix was
found by that failure, not by reading the code.

---

## Step 4b — Execution of Documented Commands

The change set modifies runnable prose (7 `shared/resources/*.md` + 8 `SKILL.md` with fenced bash), so
the rule fires. `qa-execute-snippets.mjs` was run over the changed files under bash and zsh (both
available).

**Result: `zero-blocks-executed` on every file — and it is identical on the base branch.**

| File | This branch | `origin/develop` |
| :--- | :--- | :--- |
| `develop-pipeline-step-7-finalise.md` | 10 blocks · 0 runnable · 2 placeholder · 8 mutating | 10 · 0 · 2 · 8 |
| `skills/qa-task/SKILL.md` | 16 · 0 · 4 · 12 | 17 · 0 · 4 · 13 |
| `skills/qa-fix/SKILL.md` | 8 · 0 · 3 · 5 | 8 · 0 · 3 · 5 |
| `skills/qa-story/SKILL.md` | 14 · 0 · 5 · 9 | 15 · 0 · 5 · 10 |
| `skills/review-story/SKILL.md` | 16 · 0 · 4 · 12 | 16 · 0 · 3 · 13 |

The base-branch column is the point. These are template documents whose blocks are `gh` / `node` /
`curl` mutations (deny-listed by design) or carry `{TRACKER_ISSUE}`-style placeholders, and the finding
is **pre-existing and unchanged by this task**. Reported rather than suppressed, per the step's own
rule; not counted against this gate, because a base-branch comparison shows it is not a regression.

**A stronger check was performed instead, and it is the one that matters.** Rather than executing the
template blocks, the *converted calls themselves* were executed against a fake `gh`, and the captured
stdin inspected — see Security above and the Code Review section. That is the behavioural assertion
`feedback_assert_behaviour_not_source_text` asks for: it proves the call works, where a grep proves
only that a string exists.

---

## Regression Testing

| Area | Method | Result |
| :--- | :--- | :--- |
| Full hermetic suite | `npm run ci:fast` | PASS — 3132 pass / 0 fail, exit 0 |
| Touched suites re-run on the final tree | 5 suites | PASS — 110/110 |
| Engine + per-skill contract suites | 7 suites | PASS — 323/323 |
| Bundle idempotency | content hash × 2 runs | PASS — identical |
| Formatting | `prettier --check .` | PASS |
| Pre-existing snippet findings | base-branch comparison | No regression (see Step 4b) |
| `develop-bug` skill-native step doc | direct inspection | Slots added correctly; file confirmed banner-free (a genuine source, not generated) |

**The pipeline exercised its own change end-to-end.** This run's `work-started`, `review-task`,
`develop-complete` and `in-review` comments were all posted to issue #378 through the modified call
sites. The `develop-complete` comment rendered with its slot filled — "(5 separate pieces of work)" —
on a live board.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (0)

None open. One was found and **fixed within this cycle** rather than deferred:

- **Guard A missed connective-chained invocations** (`cmd && gh issue comment …`). Found by probing
  the guard after its repair, not by reading it. Fixed in `tests/mutation-call-site-coverage.test.js`;
  all eight probed shell forms now caught, with a false-positive check confirming prose is still
  ignored. Recorded here rather than silently folded in, because "the guard was fixed twice and still
  had a hole" is the durable finding.

### LOW Severity Issues (2)

- **Text slots are passed through unsanitised** (`title`, `pr`, `outcome`). By design — the engine's
  own comment says "the caller's string is the caller's business" — and safe today: every call site
  supplies pipeline-controlled values, and there is no shell-injection surface because the engine
  spawns `gh` with argv and passes the body by `--body-file`. A future call site passing
  user-controlled text would inject into the lead. This is a property of task.104's engine, not of
  task.105's call sites, and is recorded for whoever next touches `stakeholder-summary.js`.
- **`count` / `cycle` coerce exotic numeric literals** — `1e3` renders as 1000, `0x10` as 16. Documented
  deliberate behaviour in `normaliseSlots`; surfacing it because a reader of the rendered lead cannot
  tell the value was transformed.

**Total Issues**: HIGH: 0, MEDIUM: 0 open (1 found and fixed this cycle), LOW: 2

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                                     # 3132 pass / 0 fail
npx prettier --check .                              # clean
node --test shared/resources/tests/comment-slot-coverage.test.mjs
node --test tests/mutation-call-site-coverage.test.js
node --test evals/shared/tests/transition-protocol-parity.test.mjs
node --test shared/resources/tests/review-report-freshness.test.mjs
node --test tests/executable-instructions.test.js
node shared/resources/qa-execute-snippets.mjs --file <each changed doc> --json
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: APPROVED

**Rationale.** Every success criterion is met and verified by execution rather than inspection, the
change reduces the number of ways a tracker comment can be posted from two to one, and it ships the
population check that would have caught its own worst defect. Seven mutation proofs each turn exactly
their own assertion red.

The gate is **CONCERNS rather than PASS** on two honest counts, neither of which blocks merge:

1. **Reliability CONCERNS** — the seven converted sites knowingly give up the 3× exponential backoff.
   The trade is correct and now documented everywhere, but a knowingly-accepted reduction in resilience
   on a network call is not a PASS.
2. **The independent code review did not run.** The subagent hung and was killed; the review was done
   in-line by the same agent that wrote the code. Executing things rather than re-reading them is the
   best available substitute and it did find a real defect — but a reviewer who did not write the code
   is exactly what this cycle lacked, and grading it PASS would misreport how much scrutiny the change
   actually received.

Both are recorded so that Step 5c (`/review-pr`) reads them as the specific things to check, rather
than starting cold.

**Conditions**: None blocking. Two LOW items recorded for future work; neither is a defect in this change.
