# Definition of Done Verification

**Story/Task:** task.190.probe-engine-refuses-what-it-cannot-score
**Verification Started:** 2026-10-18T20:32Z

---

## Verification Results

_DoD results are appended below in 4 consolidated sections (Steps 2–4b), after the QA review (Step 1)._

---

## Step 1: QA Report Review ✅

**PR:** #685 (source: branch)
**QA Report Found:** `task.190.qa.1.probe-engine-refuses-what-it-cannot-score.md`
**Gate File Found:** `task.190.gate.1.probe-engine-refuses-what-it-cannot-score.yml`
**PR Review Report:** `task.190.pr-review.1.probe-engine-refuses-what-it-cannot-score.md` — APPROVE, 0 findings (Step 5c)

**Gate Status:** ✅ PASS
**Quality Score:** 100/100

**Success Criteria Coverage (from QA):** 9/9 PASS, each held by a committed test that a QA mutation turned red (QM1–QM5).

**NFR Validation (from QA):**

- Security: ✅ PASS (evidence reasoned; `validateCases` `boundary: internal`, entry check `boundary: false`)
- Performance: ✅ PASS
- Reliability: ✅ PASS
- Maintainability: ✅ PASS

**Immediate Actions from QA:** None (no blocking issues)
**Future Actions from QA:** 4 advisory code-review findings (CR-1..CR-4)
**Prior acceptance blocks in body:** none (`PRIOR_DOD=0`)

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #685)
**PR Review Decision:** null — the host requires no reviews; satisfied by `task.190.pr-review.1.probe-engine-refuses-what-it-cannot-score.md` (Step 5c `/review-pr`, verdict APPROVE, 0 findings)

### Acceptance Criteria

#### AC1: Unknown direction exits 2 `bad-cases`, names the case and accepted values, runs nothing, writes no record

**Status:** ✅ PASS

- Code evidence: `shared/resources/security-probe.mjs:490` (`validateCases`); refusal in `main` at `:3866-3867`, before `preflightRecord`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:5761` (also `:5711`, `:5835`) — per-PR `npm test`

#### AC2: A case `sink` outside `SINKS` is refused the same way

**Status:** ✅ PASS

- Code evidence: `shared/resources/security-probe.mjs:498`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:5787` (absent-sink control `:5724`)

#### AC3: A bundled `references/` copy run without `--repo-root` defaults to the git top level

**Status:** ✅ PASS

- Code evidence: `shared/resources/security-probe.mjs:440` (`defaultRepoRoot`)
- Test evidence: `shared/resources/tests/security-probe.test.mjs:5966`; `skills/review-security/tests/review-security.test.js:764`

#### AC4: A missing entry with `--record` exits 2 `entry-not-found`, writes no record

**Status:** ✅ PASS

- Code evidence: `shared/resources/security-probe.mjs:3874`
- Test evidence: `shared/resources/tests/security-probe.test.mjs:5850` — all six entry forms; `review-security.test.js:771-774`

#### AC5: Under `--json` both refusals print `{reason, …}` on stdout

**Status:** ✅ PASS

- Code evidence: `shared/resources/security-probe.mjs:3850` (`refuse`)
- Test evidence: `shared/resources/tests/security-probe.test.mjs:5787`, `:5850`

#### AC6: The record entry carries `declined_cases` with id, reason, detail

**Status:** ✅ PASS

- Code evidence: `shared/resources/security-probe.mjs:3303` (`toRecordEntry`)
- Test evidence: `shared/resources/tests/security-probe.test.mjs` — "toRecordEntry carries each declined case's id, reason and detail beside the count (obs #207)" (round-trip through disk); valid-file control asserts `declined_cases: []`

#### AC7: Performance — not applicable

**Status:** ✅ PASS

- Code evidence: task doc § 8 "Performance Tests: Not applicable"
- Test evidence: NOT_APPLICABLE — same cases run; one validation pass and one git call added

#### AC8: `npm test`, `bundle:check`, `prettier --check .` pass

**Status:** ✅ PASS

- Code evidence: `.github/workflows/test.yml:55` (format:check), `:58` (npm test); `validate.yml:128` (bundle --check)
- Test evidence: PR #685 checks test, validate, shellcheck, link-check, branch-policy all SUCCESS on `f2433d6f`

#### AC9: CHANGELOG states the exit-2 refusals and `declined_cases`

**Status:** ✅ PASS

- Code evidence: `CHANGELOG.md:149` (`[Unreleased]` › Fixed, task 190)
- Test evidence: `evals/shared/tests/changelog-entry-drift.test.mjs:237` (pins the entry from merge onward)

### Documentation

- **CHANGELOG.md [Unreleased] › Fixed entry for task 190**: ✅ PASS — `CHANGELOG.md:149`
- **Bundled copies regenerated (finalise, qa-story, qa-task, review-security)**: ✅ PASS — `skills/review-security/references/security-probe.mjs`; validate (bundle --check) green
- **README/skill docs for behaviour change**: ⚠️ NOT_APPLICABLE — shipped prompts already pass `--repo-root`

**Agent summary:** All 9 success criteria pass; 6 functional criteria have code and per-PR tests, performance is explicitly N/A, CI is green on `f2433d6f`, and the CHANGELOG entry is pinned by the corpus guard.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/security-probe.mjs:440-518`
- Note: no secret/token literal in any added line; bundled copies differ only by the generated header.

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: `shared/resources/security-probe.mjs:448`
- Note: the one new spawn is `spawnSync("git", ["rev-parse", "--show-toplevel"])` — fixed argv, no shell, no caller value.

### Missing entry refused before any record is written

**Status:** ✅ PASS
- Evidence: `shared/resources/security-probe.mjs:3873-3880`
- Note: `boundary: false` — `existsSync` runs only after `resolveEntry` has decided containment; `resolveEntry` is unchanged.

### Cases intake validated in both CLI and library

**Status:** ✅ PASS
- Evidence: `shared/resources/security-probe.mjs:1414`
- Note: `runProbeSpec` declines `bad-cases` before any case runs; `main` refuses before `preflightRecord`; `declined_cases` changes no count.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS — none in added lines
- **dependency risk**: ⚠️ NOT_APPLICABLE — `package.json` unchanged; only new import is `DIRECTIONS`/`SINKS` from the sibling corpus

### Probe Results

⚠️ **Internal artefact — not probeable by the engine**: `shared/resources/security-probe.mjs#validateCases` — it reads the probe cases array this pipeline itself writes (the `<stem>.dod.N.security.cases.json` /finalise Step 3b.1 saves, or the cases a library caller builds). No corpus sink models a case array, and its null-means-valid return is the reverse of how the JS form scores a result, so a js-form probe would mis-score every case. A recorded decision, not the zero-guard: no corpus sink models this input. (Step 3c: the reason begins with `path#export`, and the entry is not in the prompt's disqualified-entries table — `SEC_OVERALL` stands.)

Advisory: CR-1 (a bundled copy's default root follows the caller's cwd or an inherited `GIT_DIR`) adds no reach beyond what `--repo-root` already gives.

**Agent summary:** The checklist passes: no secrets, no unsafe exec, no new dependencies, one fixed-argv git spawn. The boundary rule fired on `validateCases` and is recorded `internal`; the entry-exists check is `boundary: false`; `defaultRepoRoot` is not a predicate.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

### GDPR / PCI-DSS / WCAG / HIPAA

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: developer-tooling change to an internal CLI engine — no personal data, payments, UI or health data. The new record field holds probe case metadata, not personal data.

**Agent summary:** Task.190 changes only the internal security-probe engine, its tests and bundled copies; GDPR, PCI-DSS, WCAG and HIPAA do not apply.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:149`
- Note: `[Unreleased]` › Fixed names task 190; covers both exit-2 refusals, the git-top-level default root, `declined_cases` and a Breaking note.

### API/type-specific docs updated

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: no `SKILL.md` changed, so no catalog regeneration. Advisory: `shared/resources/probe-boundary-rule.md:156-166`'s decline-reason table does not list `bad-cases`; it was already incomplete before this PR (`bad-argv`, `bad-fake-gh`, `needs-fake-gh` missing).

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: README never mentions security-probe; no architecture doc for the engine.

**Agent summary:** CHANGELOG entry present and complete; README and architecture docs not applicable; one pre-existing advisory gap in the probe-boundary-rule decline table.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**CI reading 1:** SUCCESS @ `f2433d6f3d44e3706660074ce7bdb3a429aec290` over 5 checks (link-check, shellcheck, test, validate, branch-policy — all COMPLETED SUCCESS)

**Summary:**

- QA Report: ✅ PASS (Quality Score: 100/100, 1 cycle)
- Acceptance Criteria: ✅ 9/9 complete
- PR Review & Tests: ✅ Step 5c `/review-pr` APPROVE (host requires no reviews); 12 new tests, 182 + 55 passing
- CI: ✅ SUCCESS on the decision head
- Documentation: ✅ CHANGELOG entry
- Security Review: ✅ PASS (`validateCases` recorded `boundary: internal` with a valid reason)
- Compliance Review: ⚠️ NOT_APPLICABLE (counts as pass)

**Outcome:** Task meets all Definition of Done criteria and is ready for acceptance.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-10-18T20:40Z
**Total Duration:** ~8 minutes
**CI reading 1:** SUCCESS @ `f2433d6f` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section
- ✅ Sprint Review summary created
- Outward side-effects — the PR canonical comment, the tracker comment and close, the board move — fire **after** this file is committed and pushed (Step 7 publish boundary); their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here

**Next Steps:**

- Task is ready for merge
- No further action required
