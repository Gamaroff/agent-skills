# Definition of Done Verification

**Story/Task:** task.285 qa-fix Step 4 guard survives hostile paths
**Verification Started:** 2026-11-07T06:17Z

---

## Verification Results

## Step 1: QA Report Review

**QA Report Found:** `task.285.qa.5.qa-fix-step4-guard-hostile-paths.md`
**Gate File Found:** `task.285.gate.5.qa-fix-step4-guard-hostile-paths.yml`
**PR review (Step 5c):** `task.285.pr-review.1.qa-fix-step4-guard-hostile-paths.md`, verdict CONCERNS. The host requires no reviews (`reviewDecision` is null), so the "Tests & PR Approved?" column is satisfied by this report, as the decision rules allow. Its three findings are closed: PC-1 by the approved amendment of the first Performance criterion and the recorded measurement, PC-2 and PC-3 by naming task 286 in the gate, the QA report and the task document.

**Gate Status:** CONCERNS, quality score 80/100, `top_issues: []`
**Reason:** the replaced mechanism closes T285-QA-6 and the whole parent-walk class. One narrower false clean (CR-1: a directory over a gitlink that holds an untracked file) was reproduced and is advisory by the promotion rule (high severity, medium confidence). CR-1, CR-2 and CR-3 are owned by follow-up task 286.

**Judgement on CONCERNS:** not blocking. No open `top_issues`, no immediate recommendations, and each concern has a named owner.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** PASS (12 of 12)
**PR Status:** OPEN (PR #856, source: branch)
**PR Review Decision:** null (no reviews required on this host)
**Re-run scope:** full (no-prior-record) — 12 re-judged, 0 carried

### Acceptance Criteria

| Criterion | Status | Code evidence | Test evidence |
| --- | --- | --- | --- |
| #1 metacharacters refused, nothing executed | PASS | `skills/qa-fix/SKILL.md:878` | `tests/qa-fix-step4-guard.test.js:139`, `:152`, `:165` |
| #2 nested repo or symlinked directory refused, path named | PASS | `skills/qa-fix/SKILL.md:911` | `tests/qa-fix-step4-guard.test.js:206`, `:572`, `:597` |
| #3 tracked, deleted-tracked, intent-to-add admitted | PASS | `skills/qa-fix/SKILL.md:890` | `tests/qa-fix-step4-guard.test.js:478`, `:487`, `:496` |
| #4 loop doc no longer shows the bare command | PASS | `shared/resources/develop-pipeline-step-3-develop-loop.md:233` | documentation criterion |
| #5 whole-suite time measured once, with `uptime`, in the QA report | PASS | QA report 5, Performance section | measured criterion |
| #6 no new test over one second | PASS | QA report 5, Performance section | measured criterion |
| #7 backslash, single and double quote refused | PASS | `skills/qa-fix/SKILL.md:887` | `tests/qa-fix-step4-guard.test.js:176`, `:185`, `:194` |
| #8 reverting each refusal turns a named test red | PASS | QA reports 1, 2 and 4 (mutation lists) | `tests/qa-fix-step4-guard.test.js:314`, `:319`, `:324` and the direct mutants |
| #9 `bundle --check` and `quick_validate` pass | PASS (graded from CI reading 1) | `.github/workflows/validate.yml:128` | CI-state criterion |
| #10 `CI=true npm test` passes | PASS (graded from CI reading 1) | `.github/workflows/test.yml:58` | CI-state criterion |
| #11 `CHANGELOG.md` cites task 285 | PASS | `CHANGELOG.md:9` | `shared/resources/tests/changelog-cites.test.mjs` |
| #12 the two task 268 findings marked closed | PASS | task 268 document lines 334 and 335 | documentation criterion |

**Criterion #5 was amended at Step 5c.** The original bound (suite median within 10% of `develop`, five alternating pairs) was written for a 17-test file; the file now holds 37 tests and each case runs under bash and zsh, so the qa-fix test files alone went from 1.36 s to 5.02 s (+270%). The amendment carries `approved by Lorien Gamaroff (2026-11-07)`, and `criteria-drift.js` reports it `reworded` with `approved: true`. As amended, the criterion was met by one whole-suite run: 171 s, exit 0, load average 1.13 beside it.

**Criterion #6 failed its first pass (low severity) and was repaired in this run.** The first record was a single run at an earlier head with no command named. It was re-measured on PR head `89583494` with `CI=true command node --test --test-reporter=spec tests/qa-fix-step4-guard.test.js`: five runs, load recorded before each (2.04 to 2.14), slowest case 569, 572, 584, 564 and 633 ms, median 572 ms, bound 1000 ms. The figures were committed to QA report 5 (`d4a6ac93`) before this file was written. The repaired record was graded by the main context against the same rule rather than by a second AC agent, so the independent re-grade did not run.

### Advisory (not a gap)

- **#2**: CR-1 (a directory above a gitlink with an untracked file beneath reads clean), CR-2 and CR-3 are advisory and owned by task 286.

### Documentation

- qa-fix `SKILL.md` prose states what Step 4 refuses: PASS (`skills/qa-fix/SKILL.md:840`)
- Loop doc source and bundled copies updated: PASS (`shared/resources/develop-pipeline-step-3-develop-loop.md:233`)

**CI reading 1:** SUCCESS @ `03de471aff7e` (the pushed PR head: link-check, secret-scan, shellcheck, test, validate and the branch-name check all SUCCESS). Three docs-only commits sit locally on top of it and are pushed by Step 6a.
**CI-state criteria:** #9 → PASS, #10 → PASS (from CI reading 1); `AC_OVERALL` re-folded: PASS.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** PASS

- No hardcoded secrets introduced: PASS (`skills/qa-fix/SKILL.md:832`)
- No new unsafe patterns: PASS (`skills/qa-fix/SKILL.md:871`). The slot is substituted as text into a single-quoted heredoc. The residual (a path holding a newline plus a line equal to the delimiter) is documented in the prose at line 849.
- Security TODOs and FIXMEs: PASS
- Dependency risk: NOT_APPLICABLE (a fenced shell block in a Markdown step; no dependency change)

### Probe Results

**Candidates executed:** 34 — **reproduced:** 0 — **escaped:** 0
✅ **The boundary held** — every candidate returned its expected verdict.

The plan was run by `/finalise` from the security agent's `boundary: true` decision, over the 17 reviewed cases (hostile: command substitution, backtick, variable, backslash, quotes, a symlinked directory, a nested repository and others; legitimate: tracked, deleted-tracked and intent-to-add paths), each under bash and zsh. The security agent could not find the earlier cases file, so the main context supplied the QA-cycle cases and gave each a `spec_ref` into the task's success criteria. Record: `task.285.dod.1.security.run.json`; cases: `task.285.dod.1.security.cases.json`.

### Recommendations for the owner

These are not security findings and do not count against the verdict.

- **Spec challenge:** a path holding a newline whose line equals `QA_FIX_CHANGED_PATHS_END` ends the heredoc early. Allowed by the prose at `skills/qa-fix/SKILL.md:849`, which documents it as unsupported. A randomised delimiter or a pre-substitution rule would close it. It could be added to task 286.
- **Spec challenge:** a symlink to a file standing as the path is deliberately not refused, since git treats it as a plain file. If its target lies outside the repository, the target's untracked state is not judged. Low risk.
- Gate 5's CR-1, CR-2 and CR-3 are already advisory under task 286.

---

## Step 4: Compliance Review

**Overall Compliance Status:** NOT_APPLICABLE
No GDPR, PCI-DSS, WCAG or HIPAA surface: the change is a shell guard in a skill file, its test, and one loop-doc line.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** PASS

- CHANGELOG.md updated: PASS (`CHANGELOG.md:9`, under `[Unreleased]` > Fixed, cites `(task 285)`)
- Skill and loop-doc prose and bundled copies: PASS (`skills/qa-fix/SKILL.md:836`)
- README and architecture docs: NOT_APPLICABLE (no public API, configuration or command added)

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Gate: CONCERNS 80/100, no open `top_issues`; every concern owned by task 286
- Acceptance Criteria: ✅ 12 of 12
- PR Review: ✅ 5c report CONCERNS, all three findings closed (see Step 1)
- Documentation: ✅
- Security Review: ✅ 34 probes, 0 reproduced, 0 escaped
- Compliance Review: ⚠️ NOT_APPLICABLE
- CI reading 1: ✅ SUCCESS

**Deviations recorded, not hidden:**

1. Criterion #5 was amended mid-flight, with approval, because the original bound no longer described the work (see Step 2).
2. Criterion #6's first record failed; the repair and its grade were done by the main context, not a second AC agent.
3. The security agent could not find the earlier probe cases, so the main context supplied them. The agent's own 16 hand-written cases were not run, since their `expected` shapes were unverified.
4. Three docs-only commits are local and unpushed until Step 6a, so CI reading 1 was taken on the last pushed head and not on `HEAD`.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-07T06:22Z
**Total Duration:** 5 minutes
**CI reading 1:** SUCCESS @ `03de471aff7e` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with the DoD verification section
- ✅ Sprint Review summary created
- Outward side-effects (the PR canonical comment, the tracker comment and close, the board move) fire after this file is committed and pushed; their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here

**Next Steps:**

- Task is ready for Sprint Review
- Follow-up: task 286 owns CR-1, CR-2 and CR-3
