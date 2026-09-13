# Sprint Review Summary - finalise publishes before it verifies

**Story/Task ID:** task.115
**Epic:** _n/a — standalone technical task_
**Completed Date:** 2026-09-13
**Completed By:** Claude (develop-task pipeline, autonomous under develop-next)
**Pull Request:** [#402](https://github.com/Gamaroff/agent-skills/pull/402)

---

## Summary

`/finalise` Step 7 now has a **publish boundary**: the acceptance artefacts are committed and pushed inside Step 7, asserted tracked-and-on-origin, and CI is read a second time on that pushed head — all before any PR comment, tracker comment, issue close or board move. The CHANGELOG release-checklist box gained a mechanism (citation convention, a CI-failing drift test, and an advisory warning at acceptance), and the DoD running summary carries its status in exactly one place.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC1 — A DoD body carries its status in exactly one place (`**Final Status:**`); the header line is gone from the template and its flip instructions are retired
- [x] SC2 — Two CI readings with their heads: reading 1 at the acceptance decision (DoD summary), reading 2 on the pushed acceptance commit (PR canonical comment + implementation report); no outward side-effect before it reads `SUCCESS`
- [x] SC3 — Step 7 and 5c assert artefacts are tracked and pushed (`git ls-files --error-unmatch`, `git show origin/<branch>:<path>`), not merely present; no step doc suppresses a `git commit`'s output or exit status
- [x] SC4 — `changelog-entry-drift.test.mjs` fails CI naming any accepted task merged since the last tag that `[Unreleased]` does not cite; `/finalise` 6d warns `no-changelog-entry`; `(task N)` / `(bug N)` documented with bugs as the named follow-on
- [ ] SC5 — Observations #40, #48, #57, #59 close naming this PR — **deferred by design** (`parked_until: task.115 merged to develop`); post-merge action

### Key Features Implemented

- **Publish boundary (6a–6d)**: acceptance commit + push with exit codes read (never suppressed) and an idempotent guard; per-artefact tracked-and-pushed assertions; a backgrounded, head-bound second CI reading with HALT `ci-not-green-on-acceptance-head`; an advisory CHANGELOG citation check
- **Orchestrator alignment**: Step 8 commits the implementation report only; the step-7 doc exempts the Jira sync's `jira_last_*` residue from the dirty-document HALT and checks it mechanically; 5c asserts the cycle's gate and QA report are on the branch before `/review-pr`
- **CHANGELOG mechanism**: `docs/contributing/releases.md` convention + advisory→blocking flip as a checklist line; drift test with a non-vacuity floor that refuses to skip without a reachable tag

---

## Technical Details

### Files Modified/Created

- `skills/finalise/SKILL.md` — Step 0 template; Step 6 `CI_HEAD_1`; Step 7 actions 6a–6d; Completion Checklist
- `shared/resources/develop-pipeline-step-7-finalise.md` — "The publish boundary"; DoD-post assertion; residue check; checklist
- `shared/resources/develop-pipeline-step-8-commit.md` — implementation report only
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — 5c tracked-and-pushed assertion; no-suppression rule
- `docs/contributing/releases.md` — citation convention, test, owner, flip line
- `evals/shared/tests/changelog-entry-drift.test.mjs` (new), `evals/shared/tests/finalise-publish-boundary.test.mjs` (new)
- `CHANGELOG.md` — two `[Unreleased]/Changed` entries `(task 115)`
- `skills/*/references/` — regenerated via `npm run bundle`

### Architecture/Design Decisions

- The final commit of a branch can be verified only after it exists; recording that verification inside the commit needs a third commit. Reading 2 is therefore recorded **off** the verified commit (PR comment + implementation report). Step 8's docs-only commit is the stated residue; `develop-next` Step 3 re-verifies the final head before merging.
- `verify-push-state.sh` is not reused at 6b because it fails on any dirty tree and the orchestrator's implementation report is legitimately uncommitted until Step 8.
- Counts are deliberately kept out of prose — the test file is the count.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none for consumers. Two new `/finalise` HALT reasons: `ci-not-green-on-acceptance-head` (blocking) and `no-changelog-entry` (advisory; flip recorded in `releases.md`)

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** two new `node:test` files under `evals/shared/tests/` (in the `npm test` glob; run per-PR by `test.yml`); every shape assertion mutation-proved across the QA cycles; the drift test mutation-proved by removing a citation
- **Integration Tests:** the fenced bash blocks were extracted and parsed under `bash -n` and `zsh -n`; 6d, 6a's add-failure path and the residue check were executed in scratch repos under both shells
- **Test Coverage:** `npm run ci:fast` green on every pushed head (3256 pass / 0 fail at the last fix)

### Code Review

- **Reviewers:** pipeline 5c `/review-pr` (two independent Explore lenses), three passes: CONCERNS → CONCERNS → **APPROVE**; QA cycles 1–4 (CONCERNS 80 → PASS 95 ×3)
- **Approval Status:** ✅ 5c APPROVE (advisory); no human review submitted
- **Review Comments Addressed:** 13 findings fixed across three fix cycles; 4 LOWs + 1 LOW carried to follow-up (`task.115.pr-review.3.*`, gate 4 `recommendations.future`)

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** (reasoned — docs and tests only)

- [x] No hardcoded secrets introduced
- [x] No new unsafe patterns; the change removes a silent-failure path (`>/dev/null 2>&1 || true` on commits is now a tested rule)
- [x] No dependency changes

### Compliance Review

⚠️ NOT_APPLICABLE — no PII, payment, UI or health data touched.

---

## Documentation

### Updated Documentation

- `skills/finalise/SKILL.md`, three `shared/resources/develop-pipeline-step-*.md`, `docs/contributing/releases.md`, `CHANGELOG.md`

### Documentation Links

- Task: `docs/tasks/task.115.finalise-publish-time-checks/task.115.finalise-publish-time-checks.md`
- Review / QA / PR-review / DoD artefacts co-located in the task directory

---

## Demo Notes

### How to Verify

1. `node --test evals/shared/tests/finalise-publish-boundary.test.mjs evals/shared/tests/changelog-entry-drift.test.mjs`
2. Remove a `(task N)` citation from `[Unreleased]` and re-run — the drift test goes red naming the task
3. Read `skills/finalise/SKILL.md` Step 7 from action 6 to action 7: the commit + push, the assertions and the second CI reading sit between the local writes and the first outward side-effect

### Screenshots/Visuals

_n/a_

---

## Impact & Value

### User Impact

Consumers of the develop pipelines get a `/finalise` whose published DoD cannot contradict itself, whose "green" means green on the accepted head, and whose CHANGELOG box is machine-checked.

### Technical Impact

The four observations that motivated the task (#40, #48, #57, #59) close on merge; the class they share — a check that runs before the write it checks — now has a named boundary and tests holding it.

---

## Known Limitations & Future Work

### Current Limitations

- Step 8's implementation-report commit is docs-only and unverified by a second CI reading (stated; `develop-next` Step 3 covers pipeline merges)
- The 6c poll script's `rollup()` is a documented placeholder; unsubstituted, it waits `MAX_WAIT` before the read HALTs

### Suggested Follow-Up Stories

- Fail-fast sentinel for the `rollup()` placeholder; residue-check preamble stripped positionally (`sed '1,/^@@/d'`); drop the dead `EXPECTED_HEAD` argument; re-derive `CI_HEAD_2` in the first 6c block (the four 5c pass-3 LOWs)
- Backfill `(bug 13)` and `(bug 15)` in `[Unreleased]`, then widen the drift test to bugs
- Per-cycle marker for the `qa-gate` / `qa-fix` tracker comments (observation #80)

---

## Metrics _(if applicable)_

- QA cycles: 4 · qa-fix cycles: 3 · 5c passes: 3 · findings fixed: 13 · commits on the branch: 8 before acceptance
