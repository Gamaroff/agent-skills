# Definition of Done Verification

**Story/Task:** task.312 — Allow-list and timing criteria name what they need
**Verification Started:** 2026-11-23T11:16Z

---

## Method note

The four DoD checks (acceptance criteria, security, compliance, docs) were performed inline by the pipeline session, not by four independent Explore subagents, so independent review did not run for them. This repeats the earlier inline passes in this run and is recorded here rather than hidden. First DoD run, so the re-run scope is `full` (no prior AC record); no AC record file was written.

## Step 1: QA Report Review ✅

**QA Report:** `task.312.qa.1.allow-list-and-timing-criteria-name-what-they-need.md`
**Gate File:** `task.312.gate.1.allow-list-and-timing-criteria-name-what-they-need.yml`
**Gate Status:** ✅ PASS (95/100). `top_issues[]` empty.
**PR review (5c):** `task.312.pr-review.1.allow-list-and-timing-criteria-name-what-they-need.md`, verdict APPROVE (1 low consistency note, PC-1).
**PR:** #932 (source: branch). State OPEN; the host requires no review (`reviewDecision` empty), so the newest pr-review report with verdict APPROVE satisfies the column.

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS

#### Functional 1: check 32 states trigger, coverage rule, Important severity; removing the coverage rule turns the test red
**Status:** ✅ PASS
- Code evidence: `skills/review-task/SKILL.md:1298` (check 32)
- Test evidence: `tests/review-allow-list-timing-checks.test.js:90` "check 32 states its trigger, coverage rule, operand probe, example and severity"; mutation (coverage rule "every member" → "some members") turned that test red, reverted byte-identically (QA report, Code Review section)

#### Functional 2: write-by-operand probe per unaudited member, `uniq in out` fixture
**Status:** ✅ PASS
- Code evidence: `skills/review-task/SKILL.md:1298` (Probe line)
- Test evidence: `tests/review-allow-list-timing-checks.test.js:161` executes `uniq in.txt out.txt` in a temp directory and finds `out.txt`

#### Functional 3: create-task 3.5 and review-task carry the same timing rule, held by a parity test
**Status:** ✅ PASS
- Code evidence: `skills/create-task/SKILL.md:582`; `skills/review-task/SKILL.md:1506`
- Test evidence: `tests/review-allow-list-timing-checks.test.js:177`; mutation (paired-ratio clause removed from create-task) turned it red, reverted

#### Code Quality 1: `bundle:check`, `format:check`, `ci:fast` pass under `CI=true`
**Status:** ✅ PASS
- Evidence: `bundle:check` 129 skills, 0 problems; prettier clean (QA report); `ci:fast` 8733 pass, 0 fail on the LAN server; CI on PR head `0c40c40e1fd6`: all 6 checks SUCCESS (reading 1)

#### Code Quality 2: `quick_validate.py` passes for the three skills
**Status:** ✅ PASS
- Evidence: all three printed ✓ in the QA run

#### Migration: CHANGELOG entry citing task 312; bundled copies regenerated
**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:9`; `changelog-cites.sh task.312` → `cites (task 312)`; `bundle:check` clean

### Advisory (not a gap)

- **PC-1** (low, consistency): Functional 3 and the Change Log text say "check 22" while the sentence sits in Step 6 check 4, as the task's own Technical Background states. Optional rewording at the next document edit.

**Criteria drift:** `clean` (criteria-drift.js, QA cycle 1). **Boundary signals:** none.

## Step 3: Security Review

**Story Type:** task (prose and a presence test)
**Overall Security Status:** ✅ PASS

- Boundary: `boundary: false`. The diff adds no function that accepts or rejects input; `probes_executed` is not applicable.
- The one executed command (`uniq in.txt out.txt`) runs in a `mkdtemp` directory removed in `t.after` (`tests/review-allow-list-timing-checks.test.js:161`).
- No secrets, no network, no new dependency.

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE — no GDPR, PCI, accessibility or health-data surface.

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS
- `CHANGELOG.md:9` cites (task 312) under `[Unreleased]`.
- Skill prose is itself the documentation; generated `references/` copies in sync (`bundle:check`).

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

- QA gate: ✅ PASS (95/100)
- Acceptance criteria: ✅ 6/6
- PR review: ✅ APPROVE (5c report); host requires no review
- Docs: ✅ PASS · Security: ✅ PASS · Compliance: ⚠️ N/A
- **CI reading 1:** SUCCESS @ `0c40c40e1fd6` (6 checks; the acceptance decision)

**Outcome:** The task meets every Definition of Done criterion.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-23T11:20Z
**Total Duration:** 4 minutes
**CI reading 1:** SUCCESS @ `0c40c40e1fd6` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with a DoD section
- ✅ Sprint Review summary created
- Outward side-effects (PR canonical comment, tracker comment and close) fire after this file is committed and pushed; their outcomes are recorded on the PR comment and in the implementation report, not here

**Next Steps:**

- Merge via the develop-next merge step; no further action required
