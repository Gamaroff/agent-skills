# Definition of Done Verification

**Story/Task:** task.244 — The QA loop always ends on a gate
**Verification Started:** 2026-10-31
**PR:** #797 (source: branch) — `feature/task.244.qa-loop-ends-on-a-gate` → `develop`

---

## Step 1: QA Report Review ✅

**QA Reports:** `task.244.qa.1.*.md` (FAIL 70), `task.244.qa.2.*.md` (PASS 100)
**Gate Files:** `task.244.gate.1.*.yml` (FAIL), `task.244.gate.2.*.yml` (PASS, `head: 2e2780c4`, `top_issues: []`)

**Gate Status:** ✅ PASS — 100/100
**Cycle 1:** one HIGH (T244-QA-1: qa-task Phase 0 HALTed on a first review because `code-moved-since-gate.sh` refused an empty gate path) and two LOW. Fixed in `2e2780c4`; held by a committed test that goes red without the guard.
**Cycle 2:** refute pass over the whole branch diff, no new findings. NFRs: Security PASS (measured, 10 probes executed, 0 reproduced, 0 escaped), Performance PASS, Reliability PASS, Maintainability PASS.
**PR review (Step 5c):** `task.244.pr-review.1.*.md`, verdict APPROVE, one low consistency finding (develop-bug MAX_ITER row), fixed in `cc7017ee`.
**Waiver:** none (`waiver.active: false`).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN, #797 (source: branch)
**PR Review Decision:** no host review required (single maintainer); satisfied by the co-located `task.244.pr-review.1.qa-loop-ends-on-a-gate.md`, verdict APPROVE
**Re-run scope:** full (no-prior-record)

### Acceptance Criteria

#### SC-1: 5b only when `N < QA_MAX_CYCLES`, in both places that route there
**Status:** ✅ PASS
- Code evidence: `shared/resources/develop-pipeline-step-5-6-qa-loop.md:16` (Loop Setup rule) and `:1532` (§5c REQUEST CHANGES arm: "while `N < QA_MAX_CYCLES`. At `N == QA_MAX_CYCLES` → Loop Escalation")
- Test evidence: `evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs` (pins the test on both arms); step-isolation scenarios 11 and 12

#### SC-2: §5b step 7 always increments and returns to 5a
**Status:** ✅ PASS
- Code evidence: the budget test is gone from §5b step 7 in `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
- Test evidence: `evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs` (mutation-proven: old step 7 restored in a copy goes red)

#### SC-3: route 2c is gone
**Status:** ✅ PASS
- Code evidence: `shared/resources/qa-diminishing-returns.js` has no `budgetSpent` branch, no `ROUTES.GATE_THE_LAST_FIX`, no `RUNNING_QA_FIX_RE`; only the legacy token `LEGACY_GATE_THE_LAST_FIX` (`:486`) is kept so `describeLoopRoute` renders old reports; the step doc has no half-cycle section
- Test evidence: route-table tests in `shared/resources/tests/` (same route for `budgetSpent` true and false), 82 pass in QA cycle 2

#### SC-4: grant re-enters at 5b when 0 moved, 5a otherwise or when it cannot answer
**Status:** ✅ PASS
- Code evidence: `shared/resources/grant-qa-cycles.sh:73,111` (calls `code-moved-since-gate.sh`)
- Test evidence: `grant-qa-cycles.test.sh` cases (a)–(f), 63 pass / 0 fail; red against the pre-change script

#### SC-5: develop-bug verify loop escalates at `N == MAX_ITER` with no fifth fix
**Status:** ✅ PASS
- Code evidence: `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:18,63`; the escalation row in `skills/develop-bug/SKILL.md` reworded in `cc7017ee`
- Test evidence: `evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs`

#### SC-6: an escalation commit at 5a carries gate N and QA report N
**Status:** ✅ PASS
- Code evidence: `shared/resources/develop-pipeline-step-5-6-qa-loop.md:2036` ("alongside it (gate N and QA report N)"), with the story and task escalation-commit sections at `:2039` and `:2043`
- Test evidence: scenarios 11 and 12 (replay) pass

#### SC-7: at the default budget an escalating run runs 5 gates and at most 4 fixes
**Status:** ✅ PASS
- Code evidence: Loop Setup, `shared/resources/develop-pipeline-step-5-6-qa-loop.md:16`
- Test evidence: step-isolation scenario 11 (cycle-5 CONCERNS gate, budget 5, escalates with no `fix(` commit); `qa-loop-ends-on-a-gate.test.mjs`

#### SC-8: `ci:fast`, `bundle:check`, `validate` green; new test mutation-proven
**Status:** ✅ PASS
- Evidence: QA cycle 2 ran `npm test` (6894 pass, 0 fail), `eval:all`, `bundle:check` (0 problems), `lint:shell`, and `quick_validate` for develop-task, develop-story, develop-bug and qa-task. PR CI on `cc7017ee`: `test`, `validate`, `shellcheck`, `link-check`, `secret-scan` all SUCCESS. The mutation proof is recorded in both QA reports.

#### SC-9: the code-movement computation exists once
**Status:** ✅ PASS
- Code evidence: the only `git rev-list --count` in the three call sites' files is `shared/resources/code-moved-since-gate.sh:81`; `grant-qa-cycles.sh` and qa-task Phase 0 call the helper

#### SC-10: existing reports with `**Half-cycle**` rows and the green fixtures stay lint-green; CHANGELOG states the change
**Status:** ✅ PASS
- Evidence: `report-lint` suites pass in `npm test`; `CHANGELOG.md` `[Unreleased]` entry "The QA loop always ends on a gate (task 244)" states that a budget of N now gives N gates and N−1 fixes, and `qa_max_cycles: 6` keeps five fixes

### Advisory (not a gap)

- The new test pins the helper, not the Phase 0 block that called it wrongly (QA gate 2, `recommendations.future`).
- The budget-rule tests read the step doc as text; replay evals 11 and 12 hold the behaviour (QA gate 2, `recommendations.future`).
- PC-1 (PR review, low): the Files Summary ticked items 19–21 as modified. The develop-bug row was reworded in `cc7017ee`; items 20 and 21 now say the other sites were checked and left unchanged.

### Documentation

- **Step doc, resume contract, prompts, runbooks, troubleshooting, SKILL.md and README restatements:** ✅ PASS — updated in `3d8e0313`
- **CHANGELOG:** ✅ PASS — `[Unreleased]` cites (task 244)
- **Bundled copies:** ✅ PASS — `bundle:check` 0 problems

**Agent summary:** inline. The four DoD checks ran inline in the finalise fork, which cannot spawn Explore subagents, so no independent reader ran. Every criterion cites a file, a line, or a committed test.

---

## Step 3: Security Review

**Story Type:** task (refactoring / pipeline scripts)
**Overall Security Status:** ✅ PASS

- **Hardcoded secrets:** ✅ PASS — `secret-scan` SUCCESS on the head; the diff adds no credentials
- **Input handling:** ✅ PASS — `code-moved-since-gate.sh` refuses a missing directory and a non-empty gate path that is not a file (exit 2), and reads an empty gate path as a first review (prints 1)
- **Untrusted execution:** ✅ PASS — no new `eval`, no network calls, no new privileges

### Probe Results

**Boundary:** true — `code-moved-since-gate.sh` decides whether a PASS gate may skip re-review.
**Candidates executed:** 10 — **reproduced:** 0 — **escaped:** 0 (QA cycle 2 run record `task.244.qa.2.security.run.json`, 2 controls, shell-argv form under bash)
✅ **The boundary held** — every candidate returned its expected verdict.
`git diff 2e2780c4 HEAD` on the helper (shared source and bundled copies) is empty, so the probed code is the shipped code. This finalise run did not re-run the probe plan; the QA record is cited in its place (see Deviations).

**Agent summary:** inline check, no independent reader.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — a pipeline-tooling change that touches no personal data, payments, user interface or regulated surface.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- **CHANGELOG `[Unreleased]` cites (task 244):** ✅ PASS — `changelog-enforce.sh` answers `on`; the entry sits in `CHANGELOG.md`
- **Docs sweep:** ✅ PASS — the Files Summary documentation sites are each updated or recorded as checked and left unchanged
- **Work-item documents' links:** ✅ PASS — `link-check` SUCCESS on the head

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (100/100, gate 2)
- Acceptance Criteria: ✅ 10/10 met
- PR Review & Tests: ✅ APPROVE (`task.244.pr-review.1`), `npm test` 6894 pass / 0 fail
- Documentation: ✅ updated, CHANGELOG cites (task 244)
- Security Review: ✅ PASS
- Compliance Review: ⚠️ NOT_APPLICABLE
- CI: ✅ CI reading 1: SUCCESS @ `cc7017ee2023` over 6 checks (the acceptance decision)

**Outcome:** the task meets every Definition of Done criterion.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-10-31
**CI reading 1:** SUCCESS @ `cc7017ee2023` over 6 checks (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with the DoD verification section
- ✅ Sprint Review summary created
- Outward side-effects (the PR canonical comment, the tracker comment and close, the board move) fire after this file is committed and pushed; their outcomes are recorded on the PR canonical comment, not here

**Deviations:**

1. The four DoD checks ran inline, not as four independent subagents (a fork cannot spawn them). No second reader.
2. The security probe plan was not re-run in finalise. The helper is byte-identical to the version the QA cycle 2 record probed (10 executed, 0 reproduced, 0 escaped), so that record is cited.
3. The code review lens and the PR conformance lens were inline in QA cycles 1–2 and Step 5c for the same reason.

**Next Steps:**

- Task is ready for merge by the orchestrator.
