# Definition of Done Verification

**Story/Task:** task.250.security-probe-scratch-out-of-tree
**Verification Started:** 2026-11-03

---

## Verification Results

_DoD results are appended below in four consolidated sections, after the parallel agents complete._

---

## Step 1: QA Report Review ⚠️

**QA Reports Found:** `task.250.qa.1` to `task.250.qa.5` (`.security-probe-scratch-out-of-tree.md`)
**Gate File (latest):** `task.250.gate.5.security-probe-scratch-out-of-tree.yml`
**PR:** #813 (source: branch)

**Gate Status:** ⚠️ CONCERNS
**Quality Score:** 90/100

**How the QA loop ended:**
- After 5 gates, the loop hit its limit and escalated to a person.
- On 2026-11-03 the user accepted the residual. TASK-250-CR5-1 (medium) and TASK-250-CR5-2 (low) are recorded as known limits of the heuristic static guard.
- Neither shape is in the file today. The runtime half (the `fenceRoot` refusal and the watched run) is unaffected.
- The decision is in the implementation report: Decisions Log, "Escalation resolved — 2026-11-03".
- Step 5c `/review-pr` returned APPROVE: `task.250.pr-review.1.security-probe-scratch-out-of-tree.md`. It raised two low findings, both carried.

**NFR Validation (gate 5):**
- Security: ✅ PASS
- Performance: ✅ PASS
- Reliability: ⚠️ CONCERNS (CR5-1, CR5-2, both accepted as known limits)
- Maintainability: ✅ PASS

**Immediate Actions from QA:** CR5-1 and CR5-2, both resolved by the person's acceptance (the gate's own stated condition: "or the residual accepted by a person").

**Future Actions from QA:**
- CR5-3: reword the tripwire comment. Done in `6092c804`.
- The 5 pre-existing create-before-`try` sites (`provenance: pre-existing`).

---

## Measurement — criterion #4 (suite runtime ≤ +10%)

Taken during this DoD run, because QA report 1's median was measured on `1a4750a2` and the test file has changed since. The method is the criterion's own: `uptime; command node --test shared/resources/tests/security-probe.test.mjs`, run on one machine with no other suite running. Base and head runs were interleaved, three each, and the base ran in a detached worktree. All six runs exited 0.

| Run | Base `77c32356` (merge-base with develop) | Head `7f24cc0b` (PR head code; `38aa837b` changes only the implementation report) |
| --- | --- | --- |
| 1 | 31.39 s (load average: 2.86, 2.70, 2.37) | 31.21 s (load average: 2.98, 2.75, 2.40) |
| 2 | 31.20 s (load average: 3.09, 2.81, 2.43) | 31.14 s (load average: 3.18, 2.86, 2.46) |
| 3 | 31.35 s (load average: 4.22, 3.14, 2.57) | 31.18 s (load average: 3.76, 3.14, 2.59) |
| **Median** | **31.35 s** | **31.18 s** |

**Result:** −0.5%, within the +10% bound.

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL, pending #7 (DEFERRED-CI, graded at Step 6)
**PR Status:** OPEN (PR #813)
**PR Review Decision:** null. The repository requires no reviewers. The Step 5c report `task.250.pr-review.1.security-probe-scratch-out-of-tree.md` is APPROVE.
**Re-run scope:** full (no-prior-record). 9 criteria re-judged, 0 carried.

### Acceptance Criteria

#### #1: No test creates a file, directory or symlink under `REPO_ROOT`

**Status:** ✅ PASS
- Code evidence: `shared/resources/tests/security-probe.test.mjs:4545`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:8338`
- Note: All 13 sites build their roots with `fenceRoot` under `tmpdir()`, and the guard runs on every PR. The watched run saw 0 create events after the change, against 61 before (QA report 1). The before/after snapshot of untracked files was identical on 2026-11-03. The user accepted CR5-1 and CR5-2 as known limits of the static guard.

#### #2: Every pre-existing test keeps its name and assertions

**Status:** ✅ PASS
- Code evidence: `task.250.qa.1.security-probe-scratch-out-of-tree.md:75`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:2034`
- Note: No `test(` line was removed. The 3 removed assertions came back re-rooted, and one was strengthened (`is outside`).

#### #3: The three containment tests fail when their root is wrong

**Status:** ✅ PASS
- Code evidence: `task.250.qa.1.security-probe-scratch-out-of-tree.md:88`
- Test evidence: `NOT_APPLICABLE: process criterion`
- Note: Premise controls are in QA report 1, lines 92–94. The mutation proofs are at lines 168–170.

#### #4: Suite runtime grows at most 10%

**Status:** ✅ PASS
- Code evidence: `task.250.dod.1.security-probe-scratch-out-of-tree.md:53`
- Test evidence: `NOT_APPLICABLE: measured criterion`
- Note: −0.5% (base 31.35 s, head 31.18 s), re-measured during this run. See the Measurement section above. The first pass failed #4 because the earlier figure was from `1a4750a2`.

#### #5: No temp roots left behind

**Status:** ✅ PASS
- Code evidence: `shared/resources/tests/security-probe.test.mjs:4565`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:8386`

#### #6: One root builder

**Status:** ✅ PASS
- Code evidence: `shared/resources/tests/security-probe.test.mjs:4541`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:8386`

#### #7: `format:check` and `npm test` pass

**Status:** ⏳ DEFERRED-CI. Graded at Step 6 from CI reading 1.
- Code evidence: `.github/workflows/test.yml:55`
- Test evidence: `NOT_APPLICABLE: CI-state criterion`

#### #8: Guard red before the change and on a one-site mutation

**Status:** ✅ PASS
- Code evidence: `task.250.qa.1.security-probe-scratch-out-of-tree.md:68`
- Test evidence: `NOT_APPLICABLE: process criterion`

#### #9: CHANGELOG `[Unreleased]` cites task 250

**Status:** ✅ PASS
- Code evidence: `CHANGELOG.md:17`
- Test evidence: `evals/shared/tests/changelog-entry-drift.test.mjs:1`

### Advisory (not a gap)

None.

### Documentation

- **README or skill files updated where behaviour changed**: ⚠️ NOT_APPLICABLE. The change is test-only (task §5).
- **Dead `.gitignore` `.t140-*` rule removed**: ✅ PASS (`.gitignore:80`)

**Agent summary:** 8 of 9 criteria pass, and #7 is deferred to the CI reading. Criterion notes are condensed here. The verdicts and citations are verbatim in `task.250.dod.1.ac.json`.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: Test-only change. A grep of the added lines for `password =`, `api_key =` and `secret =` literals found 0 matches.

### No new unsafe patterns

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: Test-only change. A grep of the added lines for `eval(`, `exec(`, `execSync`, `execFileSync`, `spawnSync` and `shell.run(` found 0 matches. The engine `shared/resources/security-probe.mjs` is not in the diff.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS. 0 added lines match `(TODO|FIXME|HACK).*security`.
- **dependency risk**: ⚠️ NOT_APPLICABLE. `package.json` is not in the diff.

### Probe Results

_Probe mode did not fire — the deliverable is not a boundary._

The agent re-derived this decision itself, not taking the gate's word for it. `probe-boundary-signals.mjs --doc` returned `boundary: false` (no criterion matched).

Two code-level signals do match literally, and the agent disclosed both:
- The "refuses" wording in the task.250 section comment.
- The named allow-lists `T250_ALLOWED` and `T250_MASKED`.

Neither makes the deliverable a boundary. Each has a fixed input:
- `fenceRoot`'s refusal is a fail-loud assertion on its own `realpath(mkdtemp(tmpdir()))` result.
- `t250InTreeWrites`, `t250CodeOnly` and `t250Args` scan this test file's own source.

None is exported, and no caller, user or agent under test chooses its input. `internal` does not apply either: the input is test source, not a pipeline artefact.

**Agent summary:** `boundary: false`, recorded as a deliberate skip. No secrets, no unsafe exec/eval, and no dependency change in the added lines.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

- GDPR, PCI-DSS, WCAG and HIPAA are all NOT_APPLICABLE. The change is test infrastructure only:
  - `security-probe.test.mjs`
  - `.gitignore`
  - `CHANGELOG.md`
  - the task registry
  - the task's own docs

  It handles no personal data, payments, UI or health data.

**Agent summary:** No compliance area applies to this test-only change.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:17`
- Note: The entry is under `[Unreleased]` → Fixed and cites task 250.

### API/type-specific docs updated

**Status:** ⚠️ NOT_APPLICABLE
- Note: The change touches only a test file and `.gitignore`. No SKILL.md or shared-resource doc changed, so the catalog needs no regeneration.

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE
- Note: No public API, configuration key, CLI or user-facing feature changed (task §5: Breaking Changes, None).

**Agent summary:** The CHANGELOG cites task 250. The other doc checks do not apply.

---

**CI-state criteria:** #7 → PASS (CI reading 1: SUCCESS @ `38aa837b`, 6 checks). AC_OVERALL re-folded: PASS.

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ⚠️ CONCERNS (90/100). The user accepted the residual on 2026-11-03, which is the gate's own condition ("or the residual accepted by a person").
- Acceptance Criteria: ✅ 9/9.
- PR Review & Tests: ✅ No reviewers are required (`reviewDecision` null). The Step 5c report `task.250.pr-review.1.security-probe-scratch-out-of-tree.md` is APPROVE, and the suite is 277/277.
- CI: ✅ CI reading 1: SUCCESS @ `38aa837ba0fb` across 6 checks: allowed-branch, link-check, secret-scan, shellcheck, test, validate.
- Documentation: ✅ PASS.
- Security Review: ✅ PASS (boundary: false).
- Compliance Review: ⚠️ NOT_APPLICABLE.

**Outcome:** The task meets every Definition of Done criterion.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-03
**Total Duration:** one session (resumed after the QA escalation)
**CI reading 1:** SUCCESS @ `38aa837ba0fb` (the acceptance decision, Step 6)
**CI reading 2:** Taken on the acceptance commit after this file is committed and pushed. It is recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary).

**Artifacts Generated:**

- ✅ Task document updated: `status: accepted`, DoD section, Change Log row 1.2
- ✅ Task registry row ticked (`planned` → `accepted`) and staged
- ✅ Sprint Review summary created
- Outward side-effects fire **after** this file is committed and pushed: the PR canonical comment, the tracker comment and close, and the board move. Their outcomes are recorded on the PR canonical comment and in the implementation report, not here.

**Next Steps:**

- The task is ready for Sprint Review and merge.
- Follow-ups, outside this task:
  - A parser-backed guard (`acorn`), which closes CR5-1 and CR5-2.
  - The 5 pre-existing create-before-`try` sites.
