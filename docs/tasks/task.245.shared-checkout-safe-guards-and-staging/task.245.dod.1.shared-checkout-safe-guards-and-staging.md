# Definition of Done Verification

**Story/Task:** task.245 — Shared-checkout-safe guards and staging
**Verification Started:** 2026-10-30

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Report Found:** `task.245.qa.5.shared-checkout-safe-guards-and-staging.md`
**Gate File Found:** `task.245.gate.5.shared-checkout-safe-guards-and-staging.yml`

**Gate Status:** ✅ PASS (head `de860cd7`, 5 gates: CONCERNS 90, 80, 90, 90, then PASS 100)
**Quality Score:** 100/100
**Immediate Actions from QA:** none
**Future Actions from QA:** the `already` arm wording of the develop-batch lane (low); a trap for the DIRTY_Z temp file; a distinct stageReason for a hash-object or update-index failure; a re-read of the index blob before update-index; a behavioural harness for the merge lane.
**PR review (Step 5c):** CONCERNS — `task.245.pr-review.1.shared-checkout-safe-guards-and-staging.md`; PC-1 to PC-3 addressed in the carry.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL — 11 of 15 PASS
**PR Status:** OPEN (PR #796, source: branch)
**PR Review Decision:** none required on this host; the Step 5c report (CONCERNS, no open coverage finding) stands in for it
**Re-run scope:** full (no-prior-record) — 15 re-judged, 0 carried

| Criterion | Status | Code evidence | Test evidence |
| --- | --- | --- | --- |
| SC-1 | ✅ PASS | `shared/resources/registry-tick.js:1185` | `shared/resources/tests/registry-tick.test.mjs:2163` |
| SC-2 | ✅ PASS | `shared/resources/registry-tick.js:1185` | `registry-tick.test.mjs:2183` |
| SC-3 | ✅ PASS | `registry-tick.js:168` | `registry-tick.test.mjs:2233`, `:2254`, `:2330` (`unmerged` has no case — advisory) |
| SC-4 | ✅ PASS | `skills/finalise/SKILL.md:1634` | `shared/resources/tests/finalise-6a-registry-staging.test.mjs:162` |
| SC-5 | ✅ PASS | `skills/develop-next/SKILL.md:603` | `evals/develop-batch/protocol/skill-shape.test.mjs:436` |
| SC-6 | ✅ PASS | `shared/resources/qa-re-review-scope.md:222` | `shared/resources/tests/qa-scope-from-head.test.mjs:784` |
| SC-7 | ✅ PASS | `qa-re-review-scope.md:229` | `qa-scope-from-head.test.mjs:798` |
| SC-8 | ✅ PASS | `qa-re-review-scope.md:225` | `qa-scope-from-head.test.mjs:808` |
| SC-9 | ❌ FAIL (as judged) | implementation report line 65 | measured criterion — see below |
| SC-10 | ❌ FAIL | `registry-tick.js:170` | none — no test asserts the absence of a network call |
| SC-11 | ✅ PASS | implementation report line 64 | documentation criterion |
| SC-12 | ✅ PASS | `package.json:24` | `qa-scope-from-head.test.mjs:296` |
| SC-13 | ❌ FAIL (as judged) | none cited at the time | — |
| SC-14 | ✅ PASS | `CHANGELOG.md:35` | documentation criterion |
| SC-15 | ❌ FAIL (as judged) | `docs/standards/task-registry.md:39` | documentation criterion |

**Evidence recorded after the agent's verdict (the next run re-judges these):**

- **SC-9:** an A/B timing of `npm test` against the merge-base (`2471b6a8`), alternating base, head, base, head. Base 87.7 s and 80.6 s (mean 84.2 s); head 82.2 s and 81.3 s (mean 81.8 s) — 2.8% faster, with 48 more tests. Load averages recorded per run. Written to the implementation report's Decisions Log.
- **SC-13:** `quick_validate.py` run once per skill; finalise, develop-next, develop-batch, qa-task and qa-story all exit 0. The criterion's single multi-directory call is not how the validator is called.
- **SC-15:** the two Phase 4 greps re-run and the hits classified in the implementation report.

**Still open:** SC-10 needs a behavioural test (sockets and DNS blocked, `--stage` still works). That is a code change, so it re-enters QA.

### Advisory (not a gap)

- **SC-12:** the `eval:all`, `validate:all`, `check:generated`, `bundle:check` and `lint:shell` legs have no committed log for this head; CI on the PR head is `SUCCESS` (below).
- **SC-3:** the `unmerged` stageReason (`registry-tick.js:1206`) has no test case.

### Documentation

- **Registry staging rule in the task-registry standard**: ✅ PASS — `docs/standards/task-registry.md:39`
- **Skill files where behaviour changed**: ✅ PASS — `skills/finalise/SKILL.md:1439`

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

- **No hardcoded secrets introduced:** ✅ PASS — the added code carries no secret literals
- **No new unsafe patterns:** ✅ PASS — `registry-tick.js` `stageRow` calls `execFileSync('git', args)` with an argument array and a fixed set of git subcommands; no `eval`, no string-built command
- **Security TODOs/FIXMEs:** ✅ PASS
- **Dependency risk:** ⚠️ NOT_APPLICABLE — `package.json` is not modified

### Probe Results

**Boundary:** yes. The QA re-review dirty-tree HALT in `shared/resources/qa-re-review-scope.md` is a refusal guard driven by repository state. `registry-tick.js --stage` is not a boundary: it composes an index entry and accepts or rejects nothing.
**Probe run by /finalise from the security agent's plan** — 1 control, record `task.245.dod.1.security.run.json`, cases `task.245.dod.1.security.cases.json`.
**Candidates executed:** 14 — **reproduced:** 0, escapes 0, refusals 0

✅ **The boundary held** — every candidate returned its expected verdict (8 hostile cases refused with the guard's own output; 6 legitimate cases accepted).

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — no data collection, payments, UI or health data

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- **CHANGELOG.md updated:** ✅ PASS — `CHANGELOG.md:35`, under `## [Unreleased]`
- **API/type-specific docs updated:** ✅ PASS — `docs/standards/task-registry.md`; every `SKILL.md` hunk is below the frontmatter, so no catalog change is needed
- **README / architecture docs updated:** ⚠️ NOT_APPLICABLE — no public API, configuration variable or CLI command changed

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED — GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (100/100, gate 5)
- Acceptance Criteria: ⚠️ 11/15 PASS as judged; SC-9, SC-13 and SC-15 have since been evidenced; SC-10 is open
- PR Review & Tests: ✅ Step 5c CONCERNS with no open coverage finding; fast gate 6910 tests, 0 fail
- Documentation: ✅ PASS
- Security Review: ✅ PASS (boundary probed, 14 executed, 0 reproduced)
- Compliance Review: ⚠️ NOT_APPLICABLE
- CI: **CI reading 1:** SUCCESS @ `bb00bd3ee215` (the acceptance decision)

**Outcome:**

- [ ] SC-10: `--stage` adds no network call — no test asserts it; add a behavioural test and take it through QA
- [ ] SC-9: measured criterion — A/B timing recorded after the verdict; re-judge on the next run
- [ ] SC-13: validator run once per skill, recorded after the verdict; re-judge on the next run
- [ ] SC-15: Phase 4 sweep recorded after the verdict; re-judge on the next run

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED
**Completion Time:** 2026-10-30
**CI reading 1:** SUCCESS @ `bb00bd3ee215` (the acceptance decision)

**Blocking Issues Summary:**

1. SC-10: no test asserts that `--stage` makes no network call.
2. SC-9, SC-13, SC-15: evidence recorded after the verdict; they pass a re-judge on unchanged inputs.

**Estimated Effort to Close Gaps:** Small (one test, one QA cycle, one scoped re-run)

**Next Steps:**

- Add the SC-10 test, run QA on it, then re-run `/finalise`; it re-judges only the four failed criteria.
