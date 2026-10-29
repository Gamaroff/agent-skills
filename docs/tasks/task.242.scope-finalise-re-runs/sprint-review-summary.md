# Sprint Review Summary - Scope finalise re-runs

**Story/Task ID:** task.242
**Completed Date:** 2026-10-29
**Completed By:** Lorien Gamaroff (via `/develop-task`)
**Pull Request:** [#781](https://github.com/Gamaroff/agent-skills/pull/781)

---

## Summary

A `/finalise` re-run now has a fixed scope. It re-judges only the criteria the previous run failed, the criteria whose text changed, and the passes whose cited evidence changed since the previous run's head. Every other verdict is carried forward. A new doubt about an untouched criterion is reported as an advisory, not a gap. Before this, every re-run judged every criterion afresh and more finely than the last time, and task.239 needed five runs and a hand-set stop rule (observation #121).

---

## What Was Delivered

### Success Criteria Met

- [x] SC-1: `scope` answers `full` for `no-prior-record`, `prior-unreadable`, `reopened`, `head-not-ancestor` and `no-criteria`, each pinned by a test.
- [x] SC-2: the per-criterion reasons (`new-criterion`, `criterion-changed`, `reported-gap`, `evidence-changed`, `evidence-unresolved`, `unchanged`) are each pinned, with `#N` ids and text-hash matching for id-less documents.
- [x] SC-3: the task.239 replay scopes SC-11 to `reported-gap`, and `merge` gives PASS with the new member as an advisory.
- [x] SC-4 and SC-5: `merge` restores carried verdicts, moves a differing verdict to `advisories[]`, and recomputes `overall` from the merged criteria and docs.
- [x] SC-6 to SC-9: `/finalise` Steps 3a and 3c, the AC prompt's Step 0, the DoD block's scope line and advisory list, and the bug-mode skip marker are all held by contract tests.
- [x] SC-11 to SC-13: every § 8 guard is mutation-proved, CI and the bundle check are green, and the CHANGELOG entry is written.

### Key Features Implemented

- **`shared/resources/finalise-rerun-scope.js`**: a `scope` command (run before agent dispatch) and a `merge` command (run after it). It writes `${STEM}.dod.${N}.ac.json`, which the next run reads.
- **AC prompt Step 0**: the agent receives `<RERUN_SCOPE>` and judges only the criteria it lists.
- **DoD block**: a `**Re-run scope:**` line and an "Advisory (not a gap)" list.

---

## Technical Details

### Files Modified/Created

- `shared/resources/finalise-rerun-scope.js`: new engine
- `shared/resources/tests/finalise-rerun-scope.test.mjs`: new, 52 tests
- `shared/resources/finalise-dod-ac-prompt.md`: Step 0, `members[]`, `non_member_fail`, `advisories[]`
- `skills/finalise/SKILL.md`: Steps 3a and 3c, the DoD block, the bug-mode row, the 6a/6b AC-record staging
- `shared/resources/develop-pipeline-step-7-finalise.md`, `develop-pipeline-step-8-commit.md`
- `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`, `finalise-rerun-scope-blocks.test.mjs`, `finalise-bug-mode.test.mjs`
- `CHANGELOG.md`, plus regenerated bundled copies under `skills/*/references/`

### Architecture/Design Decisions

The engine fails toward a full run whenever it has a doubt: no prior record, an unreadable one, a reopened document, or a rebased head. A carried verdict cannot be overruled by the agent, because `merge` restores it whatever the agent returns. A citation resolves only to tracked files. A bare basename resolves to every file that carries it, so evidence on any candidate counts as changed.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none. The first run after upgrading is `full` (`no-prior-record`), which is today's behaviour.

---

## Testing & Quality Assurance

### Test Coverage

- **Tests:** engine suite 52/52; contract suites green; `ci:fast` 6802 tests on the code head.
- **Mutation proofs:** M1–M28 for the § 8 guards, plus proofs in every QA fix cycle.
- **QA:** 10 gates (5 plus a granted 5): FAIL 30 → FAIL 40 → FAIL 80 → CONCERNS 90 (×7). Every cycle from 3 on found a new edge in how a citation token resolves. Gate 10's one medium (QA10-1) was accepted by the operator as a known limit.

### Code Review

- **Reviewers:** Step 5c `/review-pr` (single-maintainer host, so no required approver)
- **Approval Status:** APPROVE. The 2 low doc findings are fixed.

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] git runs through `execFileSync` with an argv array. A prior record's head must be 40 hex characters before it reaches git.
- [x] No secrets, no eval, no new dependency.
- [x] Probe run: 17 candidates over `isReopened` and `merge`'s no-record-on-unparseable guard. 0 reproduced, 0 escapes.

### Compliance Review

Not applicable. This is internal developer tooling and handles no personal, payment or health data.

---

## Documentation

- [x] `skills/finalise/SKILL.md` and the AC prompt (with bundled copies)
- [x] `CHANGELOG.md` `[Unreleased]` entry citing (task 242)

---

## Demo Notes

### How to Verify

1. Run `/finalise` on a task with no `*.ac.json` beside it. The DoD reads `**Re-run scope:** full (no-prior-record)`, and a `${STEM}.dod.1.ac.json` is written.
2. Change one cited file and run `/finalise` again. Only the criteria citing that file are re-judged. The rest show `(carried from the prior run)`.
3. Move the newest `*.ac.json` aside. The next run is `full` again.

---

## Known Limitations / Future Work

- QA10-1 (accepted limit): a path citation written with `./`, a leading `/`, backslashes or a `#L` anchor does not resolve (task § 3).
- Code-review CR-2 (cleanup): a test comment names `lib/a.test.mjs`. The fixture file is `tests/a.test.mjs`.
- A duplicate `ac_id` in the agent's YAML resolves last-wins (noted by the DoD security agent; not a finding).
