# Definition of Done Verification

**Story/Task:** task.286 — qa-fix Step 4 guard looks beneath gitlinks
**Verification Started:** 2026-11-20T21:58Z

---

## Step 1: QA Report Review ✅

**QA Report:** `task.286.qa.1.qa-fix-step4-guard-looks-beneath-gitlinks.md`
**Gate File:** `task.286.gate.1.qa-fix-step4-guard-looks-beneath-gitlinks.yml`
**PR review:** `task.286.pr-review.1.qa-fix-step4-guard-looks-beneath-gitlinks.md` (APPROVE; PC-1 low, `pr_number` missing)
**PR:** #927 (source: branch)

**Gate Status:** ✅ PASS, quality 95/100, `top_issues: []`
**Immediate actions from QA:** none. **Future:** 2 low findings (nested gitlink not looked into, pre-existing; non-ASCII gitlink path over-refused, introduced here, safe side).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL
**PR Status:** OPEN (PR #927). **PR Review Decision:** none required on this host; the 5c pr-review report is APPROVE.
**Re-run scope:** full (no prior record) — 8 judged, 0 carried

| Criterion | Status | Code | Test |
| --- | --- | --- | --- |
| #1 gitlink with untracked file refused (bash, zsh) | ✅ PASS | `skills/qa-fix/SKILL.md:938` | `tests/qa-fix-step4-guard.test.js:633` |
| #2 clean checked-out gitlink admitted | ✅ PASS | `skills/qa-fix/SKILL.md:941` | `tests/qa-fix-step4-guard.test.js:506` |
| #3 CR-3 route decided and held | ✅ PASS | `skills/qa-fix/SKILL.md:894` | `tests/qa-fix-step4-guard.test.js:766` |
| #4 inside test works when `TOP` is `/` | ✅ PASS | `skills/qa-fix/SKILL.md:927` | `tests/qa-fix-step4-guard.test.js:924` |
| #5 "No performance criterion; the block runs once per fix cycle." | ❌ FAIL (low) | — | — |
| #6 each new clause has a mutant (process criterion) | ✅ PASS | QA report lines 145–149 | NOT_APPLICABLE: process criterion |
| #7 `validate` and `ci:fast` pass | ⏳ DEFERRED-CI | `package.json:25` | NOT_APPLICABLE: CI-state criterion |
| #8 CHANGELOG `[Unreleased]` cites (task 286) | ✅ PASS | `CHANGELOG.md:9` | NOT_APPLICABLE: documentation criterion |

**#5 detail.** It is a non-requirement: it states no bound and nothing a test could assert, and its checkbox is still `- [ ]` in the task (every other criterion is ticked). Under the AC rules a criterion with no bound and no test fails the behaviour path. The QA report's Performance section is PASS, so the code is not at fault; the document is. Closing it means ticking it or rewording it, which is the owner's decision (an unapproved reword reads as an amendment).

**Advisory (not a gap):** non-ASCII gitlink path is over-refused with the wrong reason (`skills/qa-fix/SKILL.md:940`); recorded in the gate's `recommendations.future`.

### Documentation

- Skill prose for the gitlink look, trailing-slash strip and CR-3 decision: ✅ PASS — `skills/qa-fix/SKILL.md:890`

---

## Step 3: Security Review

**Overall Security Status:** ✅ PASS (boundary held)

- No hardcoded secrets: ✅ — `skills/qa-fix/SKILL.md`
- No new unsafe patterns: ✅ — `skills/qa-fix/SKILL.md`
- Dependency risk: NOT_APPLICABLE (no `package.json` change)

### Probe Results

**Candidates executed:** 36 — **reproduced:** 0. ✅ **The boundary held** — every candidate returned its expected verdict.
**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed: an accepted hostile case counts as reproduced, a refused one as held; a write to an absolute path outside the sandbox (an injected `$(touch /abs/x)`) is not observed. A clean count describes what the runner could see, not what a target does with a value it accepted.

- Probe run by /finalise from the security agent's plan — 1 control, record `task.286.dod.2.security.run.json`. Plan extracted from the agent's transcript (238 bytes, sha256 `e45e8ee8…`); the committed cases file `task.286.dod.1.security.cases.json` was reused.
- Criteria signal: `boundary: true` (`fail-closed`, `is refused`).

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE — a skill file, its test and the changelog; no data, UI, payment or health data.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- CHANGELOG.md updated: ✅ — `CHANGELOG.md:9`
- Type-specific docs: ✅ — `skills/qa-fix/SKILL.md:887` (body-only change; skill catalog unaffected)
- README / architecture: NOT_APPLICABLE (no public interface changed)

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED — 1 GAP

**Summary:**

- QA Gate: ✅ PASS (95/100)
- Acceptance Criteria: ⚠️ 6 of 8 pass; #5 fails; #7 is deferred to CI
- Security: ✅ PASS (36 executed, 0 reproduced)
- Compliance: NOT_APPLICABLE
- Docs: ✅ PASS

**Outcome:**

- [ ] AC #5 ("No performance criterion; the block runs once per fix cycle.") is a non-requirement left unticked in the task's Success Criteria. The owner decides: tick it as N/A, or reword it; then re-run `/finalise`. No code change is needed.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED
**Completion Time:** 2026-11-20T21:59Z
**Total Duration:** 1 minute

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ Security run record `task.286.dod.2.security.run.json`, plan and AC record `task.286.dod.2.ac.json`

**Next Steps:**

- Owner resolves AC #5 (document-only), then re-run `/finalise`: it will re-judge #5 only, and grade #7 from CI.
