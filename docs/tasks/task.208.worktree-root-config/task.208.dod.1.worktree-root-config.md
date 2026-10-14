# Definition of Done Verification

**Story/Task:** task.208.worktree-root-config
**Verification Started:** 2026-10-14T17:01:33Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.208.qa.5.worktree-root-config.md`
**Gate File Found:** `task.208.gate.5.worktree-root-config.yml`
**Gate Status:** ✅ PASS · **Quality Score:** 100/100
**QA cycles:** 5
**PR:** #660 (source: branch) — the acceptance PR on `chore/task.208-209-pipeline-catchup`. The implementation merged earlier as #657 without the pipeline; this branch carries the retroactive PR review, QA, fixes and acceptance.
**PR review report:** `task.208.pr-review.1.worktree-root-config.md` (verdict REQUEST CHANGES, cycle-1 findings since fixed)
**Immediate Actions from QA:** None · **Future Actions from QA:** advisory items in the gate's `recommendations.future`

---
## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL
**PR Status:** OPEN (PR #660) · **PR Review Decision:** none required — review report `task.208.pr-review.1.worktree-root-config.md`

| Criterion | Status | Evidence |
| --- | --- | --- |
| AC1 No shipped skill, script or runbook creates a worktree outside the repo | ❌ FAIL | Selector and develop-batch held by tests (`select-next.test.mjs:853`, `skill-shape.test.mjs:139`); create-parallel-stories and the two runbooks have no per-PR test; QA skills' scratch worktrees under /tmp fall under the literal wording (owner decision: scope the criterion to persistent worktrees) |
| AC2 worktreeRoot documented | ✅ PASS | `configuration.md:288`, `skill-shape.test.mjs:220` |
| AC3 Selector refuses a root that leaves the repo | ✅ PASS | `select-next.mjs:57`, `:81`; tests `:878`, `:903`, `:929`, `:971` |
| AC4 Stale check matches the selector's paths, by test | ✅ PASS | `skill-shape.test.mjs:139` |
| AC5 Root ignored | ✅ PASS | `.gitignore:25`; Step 0.3a executed by `skill-shape.test.mjs:503`, `:519`, `:536` |
| AC6 Root-wide searches and copies skip .worktrees/ | ❌ FAIL | Copy filter tested (`qa-execute-snippets.test.mjs:2575`); the grep/find commands in three skills verified by hand only; nothing pins `.gitignore:25` |
| AC7 npm test, evals, bundle:check pass | ⏳ PENDING | PR #660 `test` job still running |

**Docs gap:** `skills/develop-next/SKILL.md:18` — `--batch` docs omit `--worktree-root` and the gitignore requirement (PR review CR-1).

---

## Step 3: Security Review

**Overall Security Status:** ✅ PASS · boundary: true · **Probes executed:** 21 (`task.208.dod.1.security.run.json`)

- Two controls: `normaliseWorktreeRoot` (11 cases) and `select-next --check-root` (10 cases). Reproduced 4, all low: an encoded traversal nothing decodes, and a symlink case the engine cannot build (real symlinks refused by `worktreeRootEscapes`; 13b tests re-run 7/7).
- No secrets, no unsafe exec, no security TODOs, no dependency change.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE — internal tooling; no personal data, payments, UI or health data.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS — CHANGELOG `[Unreleased]` Changed and Fixed entries; develop-batch, create-parallel-stories, both runbooks, `.gitignore` and the configuration reference updated.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**CI reading 1:** PENDING @ `8fc5c24b` (PR #660 `test` job running)

**Outcome:**

- [ ] AC1: reword to persistent worktrees (owner decision) and add a per-PR guard that no shipped skill or runbook names a sibling worktree path
- [ ] AC6: a per-PR test that runs the grep/find exclusions in the three skills against a fixture with a nested `.worktrees/`, and one that `.gitignore` ignores `.worktrees/`
- [ ] Docs: `develop-next --batch` names `--worktree-root` and the gitignore requirement
- [ ] AC7: PR #660 CI green on the fix head

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED
**Completion Time:** 2026-10-14T17:05:26Z

**Next Steps:** fix the four gaps, re-run QA on the change, re-run `/finalise` (dod.2).
