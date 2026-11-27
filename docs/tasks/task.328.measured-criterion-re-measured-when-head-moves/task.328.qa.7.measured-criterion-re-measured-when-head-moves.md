# QA Report: Task 328 - A measured criterion is re-measured when the head moves (cycle 7)

**Task**: [task.328.measured-criterion-re-measured-when-head-moves.md](./task.328.measured-criterion-re-measured-when-head-moves.md)
**Gate File**: [task.328.gate.7.measured-criterion-re-measured-when-head-moves.yml](./task.328.gate.7.measured-criterion-re-measured-when-head-moves.yml)
**Previous**: [task.328.qa.6.measured-criterion-re-measured-when-head-moves.md](./task.328.qa.6.measured-criterion-re-measured-when-head-moves.md)
**Review Date**: 2026-11-27
**Gate Status**: PASS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T328-QA6-1 criterion 4 wording | ✅ FIXED | parity check requires `**unverified** with "re-measure"`; dropping it from qa-task turned the qa-task and identity tests red |
| T328-CR6-1 mapping undeclared | ✅ FIXED | "unverified on purpose" asserted and calibrated |
| T328-CR6-2 "whatever its value" | ✅ FIXED | dropping it from qa-story turned the qa-story and identity tests red |
| T328-CR6-3 duplicated locator | ✅ FIXED | one `leadParagraphs` helper |

## New Findings This Cycle

- None blocking. One advisory: the reason-list guard matches only the hyphenated engine tokens (reviewer CR-1, low severity, low confidence). Recorded under future recommendations.

### Review Methodology

- Re-review scope: files changed since gate 6 (head dcbdab636; 3 files) — default.
- Diff review: code review, checked against finalise Step 3 **and the task's success criteria** (obs #195). Reviewer returned in 76723 ms (`duration_ms`).
- Fast gate (LAN, `CI=true npm run test:remote`): 8951 tests, 8948 pass, 0 fail, TEST_EXIT=0.
- CI on 5fbd51264753: green.

## Success Criteria Verification

| # | Status | Note |
| --- | --- | --- |
| 1–3 | PASS | engine and comparative tests (qa.1, extended in cycles 2–4) |
| 4 | PASS | both skills cite Step 3 and state "unverified with re-measure"; the parity test fails on a lost citation or a restated reason |
| 5 | PASS | amended wording (owner-approved); the one newly listed example by path is in qa.1 (task 320 #10; 375 → 376) |
| 6, 7 | PASS | red-first runs in qa.1; mutation tables in qa.1–qa.7 |
| 8 | PASS | fast gate 0 failed; CI green at 5fbd51264; bundle:check 0 problems |
| 9 | PASS | CHANGELOG `[Unreleased]` cites task 328 |

## Code Review

- [low/low] `evals/shared/tests/qa-measured-figure-parity.test.mjs:41`: the reason guard sees only token forms. Advisory; future.

mutation-proven: dropped "re-measure" from qa-task → `qa-task grades a measured figure…` red → covered
mutation-proven: dropped "whatever its value" from qa-story → `qa-story grades a measured figure…` red → covered

## NFR Assessment

Security PASS (reasoned, `boundary: false`, probes 0, escaped 0) · Performance PASS · Reliability PASS · Maintainability PASS.

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Deployment**: READY.

---

## Addendum — finalise dod.1 gaps (2026-11-27)

Recorded at head `5c3d00e42` after `/finalise` run 1 (`task.328.dod.1.measured-criterion-re-measured-when-head-moves.md`) found three records missing or stale. **This addendum is not part of gate 7's verdict**: it adds evidence for criteria 5, 6 and 7 and changes no code. Owner approval: "Go ahead with one more fix cycle" (2026-11-27). Every mutation below was made with the file tool on a snapshot copy, the named file was run with `command node --test`, the snapshot was restored, and `git diff --quiet` confirmed the file clean. Logs are per-mutation; the baseline is 21 pass, 0 fail for each test file.

### Record — criterion 5 (corpus, at head)

The qa.1 record (375 → 376, one example given as a glob) was taken on the cycle-1 regex. NUMERIC_BOUND was widened in cycles 3–5 ("or equal to", lower/higher/bigger, later/earlier, hedges), so it is re-measured here with the shipped engine.

Command (scratch script; develop's engine extracted with `git show develop:shared/resources/finalise-record-preflight.js`, develop at `c937ce621`):

```
command node <scratchpad>/corpus.js . <scratchpad>/old/finalise-record-preflight.js shared/resources/finalise-record-preflight.js
```

Output: 333 task documents, 331 with criteria, 3305 criteria. **375 listed before, 379 after, delta 4.** 131 listed entries are `measured: true` after the change.

Every newly listed example by path:

1. `docs/tasks/task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md`, criterion 10 ("no test that waits longer than 30 s")
2. `docs/tasks/task.59.prettier-sweep-and-format-guard/task.59.prettier-sweep-and-format-guard.md`, criterion 6 ("adds under ~15s")
3. `docs/tasks/task.76.mutation-proof-limits/task.76.mutation-proof-limits.md`, criterion 10 ("no more than ~55 lines")
4. `docs/tasks/task.94.observe-work-skill/task.94.observe-work-skill.md`, criterion 11 ("over ~300 lines")

The amended wording ("every newly listed example by path (up to five)") is met: four examples, all listed. **The premise the owner approved the amendment on — "only one newly listed criterion exists" — was true of the cycle-1 engine and is not true of the shipped one.**

### Record — criterion 6 (red first: the calibration tests)

The 14 calibration tests in `evals/shared/tests/qa-measured-figure-parity.test.mjs` (lines 214–318; the DoD's count of 13 was one short) had no red-first record. Each calibration tests the checker `measuredFigureProblems`, so its red-first state is the checker without the check it calibrates. That state is reconstructed here by mutation, after the fact, by the same method qa.1 used for the engine tests; it is not a run made chronologically before the change.

| # | Calibration (line) | Mutation to the checker | Red line |
| --- | --- | --- | --- |
| M01 | a correct paragraph passes (214) | add an over-strict check that rejects a paragraph without "applied whole" (GOOD lacks it; the skills have it) | `✖ calibration: a correct paragraph passes` |
| M02 | a file with no such paragraph fails (218) | return `[]` when no paragraph is found (the vacuous pass) | `✖ calibration: a file with no such paragraph fails, never passes vacuously` |
| M03 | losing its citation fails (223) | remove the `CITATION` check | `✖ calibration: the paragraph losing its citation fails, though the file cites it elsewhere` |
| M04 | a restated reason list fails (235) | `REASONS = []` | `✖ calibration: a restated reason list fails` |
| M05 | a paraphrase of which figures Step 3 holds fails (244) | drop the `taken on the (?:PR's )?head commit` alternative | `✖ calibration: a paraphrase of which figures Step 3 holds to the head fails` |
| M06 | Step 3's head-or-M sentence fails (252) | narrow the regex to `taken on the head commit` (no `PR's`, no commit-M alternative) | `✖ calibration: Step 3's own head-or-M sentence, copied in, fails` |
| M07 | "re-measure" for every rejection fails (260) | remove the other-note check | `✖ calibration: "re-measure" as the note for every rejection fails (QA-3, CR3-1)` |
| M08 | no "re-measure" at all fails (269) | remove the `**unverified** with "re-measure"` check | `✖ calibration: no "re-measure" at all fails criterion 4 (QA-6, QA6-1)` |
| M09 | dropping "whatever its value" fails (281) | remove that check | `✖ calibration: dropping "whatever its value" fails (QA-6, CR6-2)` |
| M10 | an undeclared unverified mapping fails (287) | remove the "unverified on purpose" check | `✖ calibration: an undeclared unverified mapping fails (QA-6, CR6-1)` |
| M11 | a missed bound called unverified fails (293) | remove the missed-bound check | `✖ calibration: a missed bound called unverified fails (QA-4, CR4-1)`; also `✖ calibration: a FAIL branch that ignores provenance fails (QA-5, CR5-1)`, which asserts the same message as part of its scenario |
| M12 | a FAIL branch that ignores provenance fails (302) | loosen the bound regex so it no longer requires "Only a figure the rule accepts" | `✖ calibration: a FAIL branch that ignores provenance fails (QA-5, CR5-1)` (alone) |
| M13 | a dropped **unverified** is caught by its own check (313) | remove the `**unverified**` check | `✖ calibration: a dropped **unverified** is caught by its own check (QA-4, CR4-4)` |
| M14 | a check with no repository-root cwd fails (318) | remove the repository-root check | `✖ calibration: a check with no repository-root cwd fails` |

Every mutation turned exactly its named calibration red (M11 also reds 302, which shares the check; M12 reds 302 alone). Restored after each: `git diff --quiet` clean.

### Record — criterion 7 (the three unmapped remedies)

| Remedy | Revert | Red |
| --- | --- | --- |
| CR6-1 "unverified on purpose" | drop "on purpose" from `skills/qa-task/SKILL.md:1106` | `✖ qa-task grades a measured figure by finalise's rule, cited not restated`; also `✖ qa-task and qa-story hold the same measured-figure paragraph (QA-4, CR4-5)` (the copies now differ) |
| CR4-4 locate by lead | restore the pre-cycle-4 locator (`e9c20b2b3^`: a paragraph holding `finalise-delta.js docs-only` and `**unverified**`) | `✖ calibration: a dropped **unverified** is caught by its own check (QA-4, CR4-4)` |
| Bundle finalise-delta.js into qa-task/qa-story — the citation | point qa-task's paragraph at `.agents/skills/finalise/references/finalise-delta.js` | `✖ qa-task's paragraph runs its own bundled finalise-delta.js`; also the identity test |
| Bundle finalise-delta.js — the copy | `rm skills/qa-task/references/finalise-delta.js` | no `npm test` file turns red (`shared-script-literals`, `skill-resolution-reach`, `bundled-links` stay green); `npm run bundle:check` exits 1: `MISSING references/finalise-delta.js — has a shared source but no bundled copy` (the `validate` CI job, criterion 8's gate). Restored with `git checkout --`. |

The bundled copy itself is held by `bundle:check`, a named CI check, not by a test in the parity file; its citation is held by a named test.

After all restores: `qa-measured-figure-parity.test.mjs` 21 pass / 0 fail; `finalise-record-preflight.test.mjs` 21 pass / 0 fail; `git status` clean.
