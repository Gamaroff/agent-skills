# Definition of Done Verification

**Story/Task:** task.200.tracker-side-effects-after-their-gate
**Verification Started:** 2026-10-20T19:31Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.200.qa.3.tracker-side-effects-after-their-gate.md` (3 cycles)
**Gate File Found:** `task.200.gate.3.tracker-side-effects-after-their-gate.yml`
**PR:** #711 (source: branch)
**PR Review (Step 5c):** `task.200.pr-review.1.tracker-side-effects-after-their-gate.md`, ✅ APPROVE, 0 conformance findings

**Gate Status:** ⚠️ CONCERNS. `top_issues: []`; route 3, an NFR-level reservation with no open entry.
**Quality Score:** 90/100

**Success Criteria Coverage (from QA):** 10/10 PASS
**Phases Verified:** 5/5

**NFR Validation (from QA):**

- Security: ✅ PASS. Measured: 11 probes executed, 0 escaped
- Performance: ✅ PASS
- Reliability: ✅ PASS
- Maintainability: ⚠️ CONCERNS. Two advisory guard-breadth gaps (CR-1 LINK_RE `${V:-…}`, CR-2 one-hop binding), both with no live instance, plus one unreachable clause.

**Immediate Actions from QA:** None
**Future Actions from QA:** 6 (`recommendations.future`)
**Bugs:** 8 filed across 3 cycles, all Closed.

**Judgement on CONCERNS:** non-blocking. The reservation is about guard breadth in two new tests, with no live defect and nothing in `top_issues[]`. The 5c conformance review approved.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL as the agent reported it; the orchestrator accepts it on the committed record (see AC8)
**PR Status:** OPEN (PR #711)
**PR Review Decision:** null (the host requires no reviews). Satisfied by `task.200.pr-review.1.tracker-side-effects-after-their-gate.md`, ✅ APPROVE.

**Diff note:** `gh pr diff 711` refused the PR (more than 20,000 lines; 77 of its files are bundled `references/` copies). The agents read `git diff origin/develop...HEAD` with those copies excluded.

### Acceptance Criteria

| # | Criterion | Status | Code | Test (per-PR) |
|---|---|---|---|---|
| AC1 | Step 1 has no ensure-bug, signal or push; Step 2b is the only ensure-bug | ✅ PASS | `skills/develop-bug/SKILL.md:212` | `skills/develop-bug/tests/develop-bug.test.js:259` |
| AC2 | NEEDS DETAIL / DUPLICATE / STALE halts name the branch and report, and delete nothing | ✅ PASS | `skills/develop-bug/SKILL.md:326` | `develop-bug.test.js:300` |
| AC3 | Step 2b writes `tracker_issue` and `tracker_step` in one write; resume contract states six states | ✅ PASS | `skills/develop-bug/SKILL.md:238` | `develop-bug.test.js:373` |
| AC4 | Unrelated branch → default; own / parent / hotfix branch → that branch | ✅ PASS | `shared/resources/doc-link-branch.js:109` | `shared/resources/tests/doc-link-branch.test.mjs:85` |
| AC5 | `task.20` does not match `feature/task.200.x` | ✅ PASS | `doc-link-branch.js:67` | `doc-link-branch.test.mjs:94` |
| AC6 | At most one `gh repo view`, and none with `--default` | ✅ PASS | `doc-link-branch.js:183` | `doc-link-branch.test.mjs:253` |
| AC7 | `npm test` green with `.agents/skills` aside; bundle:check and format:check clean | ✅ PASS | `.github/workflows/test.yml:52` | `.github/workflows/test.yml:55` |
| AC8 | Each new test mutation-proved | ⚠️ agent: FAIL, accepted on record | committed records: task doc Implementation Summary (develop 7/7), implementation report QA cycles 1–2 (qa-fix: "each new test", then 5/5), `task.200.qa.3…md` (QA's own mutants: 4 of 5 red, 1 unreachable) | no per-PR test can check a process claim |
| AC9 | `npm run validate` passes for every changed SKILL.md | ✅ PASS | `.github/workflows/validate.yml:62` | same |
| AC10 | CHANGELOG `[Unreleased]` entry | ✅ PASS | `CHANGELOG.md:23` | NOT_APPLICABLE: documentation criterion |
| AC11 | configuration.md § Document link branch states the work-item rule | ✅ PASS | `docs/reference/configuration.md:798` | NOT_APPLICABLE: documentation criterion |

**AC8, the orchestrator's decision, stated rather than inherited.** The criterion is a process claim. It is not one of the prompt's three NOT_APPLICABLE kinds, so the agent marked it FAIL. Its evidence is the committed record of every mutation run: develop's 7 mutants, qa-fix cycles 1 and 2, and QA cycle 3's independent mutants. task.90's DoD accepted a mutation criterion on the same kind of record. **What the record does not cover, as the agent found:** not every new test has its own recorded mutant. The records name behaviours (upstream without the work-item check, the `.` and `-` anchors, hotfix scope, Step 2b order and fields, sibling bug, unbound read, reassignment, pin), and each behaviour's tests went red. Individual TABLE rows and the stubbed-`gh` CLI tests, for example, have no mutant of their own. That residue is named here, not upgraded to PASS.

### Documentation

- **CHANGELOG `[Unreleased]` entries for task 200**: ✅ PASS — `CHANGELOG.md:23`
- **Reference doc (Document link branch)**: ✅ PASS — `docs/reference/configuration.md:784`
- **Skill files where behaviour changed**: ✅ PASS — `skills/develop-bug/SKILL.md:220`, `develop-pipeline-resume-contract.md:477`

**Agent summary:** 10 of 11 success criteria pass with code and per-PR test evidence. The mutation criterion rests on committed self-reports that do not cover every new test.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ❌ FAIL (4 probes reproduced, all graded low)

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: no added line assigns a literal to password, api_key, secret or token

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: `shared/resources/doc-link-branch.js:140`. `execFileSync` with argv arrays and no shell.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS (0 found)
- **dependency risk**: ⚠️ NOT_APPLICABLE (no package.json or lockfile changes)

### Probe Results

**Candidates executed:** 42 — **reproduced:** 4

- `hotfix/vendor-sdk-bump` (bug document) — expected **rejected**, got **accepted** — severity low
- `release/1.4.0` (story 1.4.2) — expected **rejected**, got **accepted** — severity low
- `hotfix/1.4.1` (story 1.4.2) — expected **rejected**, got **accepted** — severity low
- `feature/1.4.x` (story 1.4.2) — expected **rejected**, got **accepted** — severity low

- Probe run by /finalise from the security agent's plan: 3 controls (`branchNamesWorkItem` on a task, a bug and a story document), record `task.200.dod.1.security.run.json`, 0 escapes, 0 refusals.
- **All four accepts are the specified behaviour.** The task's Implementation Summary (lines 412–414) and `docs/reference/configuration.md:802-804` say a story matches "a segment starting `{P}.{E}` under any prefix" and a bug matches `hotfix/v*`. The probe expected a stricter rule than the spec states. The "any prefix" rule exists because `branching.epicIntegration.branchPattern` is configurable. The grader's view is that the worst consequence is one card's Document link pointing at a branch that may later 404: no write, no path built, no auth.
- QA's earlier record (`task.200.qa.3.security.run.json`, the `integrationBranchOf` entry) is not evidence for this control. That function is a file read, not an accept/reject predicate.

**Agent summary:** checklist clean. The boundary rule fired on `branchNamesWorkItem`. 42 executed, 4 reproduced, each a spec-sanctioned accept graded low.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

GDPR, PCI-DSS, WCAG and HIPAA are all NOT_APPLICABLE: no personal, payment, UI or health data. This is an internal agent-skills library change.

**Agent summary:** no compliance area applies.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- **CHANGELOG.md updated**: ✅ PASS — `CHANGELOG.md:23` (four task-200 entries)
- **Skill / reference docs**: ✅ PASS — `skills/develop-bug/SKILL.md:212`
- **README / architecture**: ✅ PASS — `docs/reference/configuration.md:796`. No new CLI, key or public API. Only SKILL.md bodies changed, so the catalog needs no regeneration.

**Agent summary:** CHANGELOG, skill, resume-contract and configuration docs are updated.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**CI reading 1:** SUCCESS @ `fc7e0527286110da0fab83ebdf7ec9c742e3ba66`, over 5 checks (test, validate, link-check, shellcheck, branch rule)

**Summary:**

- QA Report: ⚠️ CONCERNS (90/100), nothing open
- Acceptance Criteria: 10/11 PASS; AC8 accepted on the committed record, with its residue named
- PR Review & Tests: ✅ 5c `/review-pr` APPROVE; CI green
- Documentation: ✅ PASS
- Security Review: ❌ FAIL — 4 reproduced probes, all low and all spec-sanctioned
- Compliance Review: ✅ NOT_APPLICABLE

**Why not fix-and-recheck (Step 8a):** the findings are low, but the fix would not be a correction to what QA reviewed. It would change the specified rule ("`{P}.{E}` under any prefix", "`hotfix/v*`") in the code, the task document and `docs/reference/configuration.md`, and it raises a design question: should the story fallback read the configured `branching.epicIntegration.branchPattern` instead of accepting any prefix? That is a scope decision for a person, not a one-line fail-closed defect. The evaluator was therefore not run.

**Blocking Issues:**

- [ ] Security probe: `branchNamesWorkItem` accepts `release/1.4.0`, `hotfix/1.4.1` and `feature/1.4.x` for story 1.4.2 (the "`{P}.{E}` under any prefix" rule). Decide: narrow it (e.g. to the configured `branchPattern` prefix) or confirm the spec and record the accepts as intended
- [ ] Security probe: `branchNamesWorkItem` accepts `hotfix/vendor-sdk-bump` for a bug document (`hotfix/v*` read as a raw prefix). Decide: require a version after `v` (`hotfix/v<digit>`) or confirm the spec

**Outcome:** Task does NOT meet the Definition of Done as the gate is written. The open questions are scope decisions about specified behaviour, not defects found by QA.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-10-20T19:40Z
**Total Duration:** about 10 minutes

**Blocking Issues Summary:**

1. Security probe: the story `{P}.{E}`-under-any-prefix rule accepts release, hotfix and feature branches (3 low probes)
2. Security probe: the bug `hotfix/v*` rule accepts a non-version hotfix branch (1 low probe)

**Estimated Effort to Close Gaps:** Small (under 1 hour) once the scope decision is made. Either narrow both predicates and re-probe, or record the accepts as intended and re-run `/finalise`.

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted

**Next Steps:**

- Decide whether to narrow the two predicates or confirm the specified rule
- A gap closed by changing code re-enters QA before this verification re-runs; a document-only fix (documentation under `ci.docsOnly.patterns`) re-runs it directly
