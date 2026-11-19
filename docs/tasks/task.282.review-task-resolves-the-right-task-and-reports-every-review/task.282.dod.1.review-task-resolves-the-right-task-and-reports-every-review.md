# Definition of Done Verification

**Story/Task:** review-task resolves the right task and reports every review
**Verification Started:** 2026-11-19T06:54Z

---

## Verification Results

_DoD results will be appended here in consolidated sections after parallel agent completion._

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL (all criteria met except #5, which is DEFERRED-CI until Step 6 reads CI)
**PR Status:** OPEN (PR #921)
**PR Review Decision:** null
**Re-run scope:** full (no-prior-record) — 7 re-judged, 0 carried

### Acceptance Criteria

#### #1: A second review's verdict is posted, shown by a named test in the QA report.

**Status:** ✅ PASS

- Code evidence: `shared/resources/tracker-comment.js:145`
- Test evidence: `shared/resources/tests/tracker-comment.test.mjs:2216`
- Note: Test 'review-task-N is keyed per review' asserts review-N (N>=2) reads 'posted' against a review-1 marker, for the task, story and bug families. It is named in QA report 3 and cycle 1, and has mutation proofs. It lives in shared/resources/tests/*.test.mjs, which test:suite globs, and .github/workflows/test.yml runs on every pull_request.

#### #2: A bare task number resolves to the task, shown by the fixture session in the QA report.

**Status:** ✅ PASS

- Code evidence: `shared/resources/resolve-bare-task.sh:1`
- Test evidence: `shared/resources/tests/resolve-bare-task.test.mjs:68`
- Note: Fixture tests cover the working tree, a linked worktree, a branch-only task, none, usage, the digit cap, the delivered block from a consumer checkout (line 212), and two documents claiming one number. The QA 3 table records 10 tests, 10 pass. The file is in the shared/resources/tests/*.test.mjs glob, which runs per PR.

#### #3: CI=true npm test wall time within 10% of develop, median of five alternating runs, uptime recorded.

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.282.review-task-resolves-the-right-task-and-reports-every-review/task.282.qa.3.review-task-resolves-the-right-task-and-reports-every-review.md:100`
- Test evidence: `NOT_APPLICABLE: measured criterion`
- Note: Bound is 10%. Five alternating pairs were run (QA 3 lines 88-100) with the load before each run recorded. Median wall is develop 807 s against branch 841 s (+4.2%); test duration median is +2.8%; all ten runs exit 0. The command is `CI=true npm run test:remote -- --run test`. Measured on M=2a1b21536. I ran `finalise-delta.js docs-only --base 2a1b21536 --head HEAD`: reason tree-equivalent, exit 0, only the QA 3 report changed. So measured on 2a1b21536, tree-equivalent to head. The recomputed medians match: develop 742/791/807/868/1271 gives 807; branch 735/737/841/944/1014 gives 841.

#### #4: Each code change has a mutation proof; prose-only edits no test can fail on are named unprovable.

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.282.review-task-resolves-the-right-task-and-reports-every-review/task.282.qa.3.review-task-resolves-the-right-task-and-reports-every-review.md:106`
- Test evidence: `NOT_APPLICABLE: process criterion`
- Note: Every code member has a committed mutation line that names the test that went red. The Step 2 skip rule, the REVIEW_N guards and the comment-only header are named unprovable in the QA 3 section 'Unprovable edits', as the amended criterion allows. criteria-drift.js exit 0: #4 is reworded and approved by Lorien Gamaroff, so the amendment rule is satisfied. Regenerated skills/*/references copies are byte copies held by bundle:check. tracker-comment-contract.md is documentation.

#### #5: bundle --check reports 0 problems; CI=true npm test passes.

**Status:** ⏳ DEFERRED-CI — graded at Step 6 from CI reading 1

- Code evidence: `.github/workflows/test.yml:1`
- Test evidence: `NOT_APPLICABLE: CI-state criterion`
- Note: Asks that the bundle check and the full test suite are green on the PR head. QA 3 records bundle:check at 129 skills with 0 problems, and tests at 8611 pass, 0 fail. The grade comes from /finalise Step 6 reading CI.

#### #6: comment-slot-coverage.test.mjs passes with the new stage form.

**Status:** ✅ PASS

- Code evidence: `shared/resources/tests/comment-slot-coverage.test.mjs:85`
- Test evidence: `shared/resources/tests/comment-slot-coverage.test.mjs:185`
- Note: The test derives its suffix regex from CYCLE_SCOPED_STAGES, which now includes the review stages, and asserts no cycle-scoped call site passes a bare stage. It goes red under the call-site and stage-list mutations (QA 1 and QA 3). It runs per PR through the shared/resources/tests/*.test.mjs glob and .github/workflows/test.yml on pull_request.

#### #7: An existing review marker on a live issue still reads already for review 1 (fixture).

**Status:** ✅ PASS

- Code evidence: `shared/resources/tracker-comment.js:145`
- Test evidence: `shared/resources/tests/tracker-comment.test.mjs:2245`
- Note: The fixture seeds a bare marker for each of the task, story and bug families. Both the bare stage and the review-N-1 form read 'already', and N=2 posts. This is the same test as #1, run per PR through the shared/resources/tests/*.test.mjs glob.

### Advisory (not a gap)

- **#3**: Load varied from 0.3 to 24 across the runs on the shared server, and pair 3 develop (1271 s) and pair 1 branch (1014 s) are outliers. The median handles both, and QA 3 says so.
- **#4**: QA 3 CR-1 (low, advisory, unverified anchor) records that nothing ties skills carrying the bare-number block to shipping resolve-bare-task.sh. It is not a criterion failure.

### Documentation

- **Documentation for a refactoring/task type: README and skill files updated where behaviour changed**: ✅ PASS — `shared/resources/tracker-comment-contract.md:1` — The diff updates the tracker comment contract, the step-0 and step-2 pipeline docs, and the review-task, review-story and review-bug SKILL.md files. CHANGELOG is agent 4's check and was not read here.

**Agent summary:** #1, #2, #3, #4, #6 and #7 PASS (#3 measured on 2a1b21536, tree-equivalent to head; #4 has every code member mutation-proven and the prose edits named unprovable); #5 is DEFERRED-CI, so overall stays PARTIAL until CI is read.

**CI-state criteria:** #5 → PASS (CI reading 1: SUCCESS @ `d8a36f3cf66068fbae9ec4b8bf3c313b41988653`) — AC_OVERALL re-folded: PASS

---


## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/resolve-bare-task.sh:1`
- Note: Read the whole script. It has no credentials, tokens or string-literal secrets, and the only literals are usage messages and path fragments.

### No new unsafe patterns (eval/exec/shell.run)

**Status:** ✅ PASS
- Evidence: `shared/resources/resolve-bare-task.sh:35`
- Note: No eval or exec. `$n` is checked as all digits at lines 35-40 and capped at 9 digits at lines 48-51 before it reaches the glob at line 66 or the grep at line 108. The expansions are quoted, and `$n` cannot contain regex metacharacters.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS — `shared/resources/resolve-bare-task.sh:1` — the whole script was read; it has no security TODO/FIXME markers.
- **dependency risk**: ⚠️ NOT_APPLICABLE — the PR diff shows no package.json change.

### Probe Results

**Candidates executed:** 22 — **reproduced:** 0

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed: an accepted hostile case counts as reproduced, a refused one as held. A clean count describes what the runner could see, not what a target does with a value it accepted.

✅ **The boundary held** — every candidate returned its expected verdict.

- Probe run by /finalise from the security agent's plan — 1 control(s), record `docs/tasks/task.282.review-task-resolves-the-right-task-and-reports-every-review/task.282.dod.1.security.run.json`
- The plan is 11 hostile inline cases against `shell-argv:shared/resources/resolve-bare-task.sh`, each run under bash and zsh (22 executions): non-digit, `#243`, glob `2*`, regex `1.5`, command substitution, trailing newline, leading space, negative, non-ASCII digit, 64-bit wrap-around (`18446744073709551617`) and a ten-digit value. All were refused. The record, the cases file and the reusable plan sit beside this file.
- **Boundary decision:** the security agent recorded `boundary: true` on a judgement call. `probe-boundary-signals.mjs` on the task document read `boundary: false` (no matched phrasing), but the script's own header says it refuses a non-digit or over-long argument and never reads a guess, which is the script-header signal in Step 1b that the document classifier does not read.
- **Coverage gap, stated:** the plan has hostile cases only. The legitimate cases (a task found in the working tree, in a linked worktree, on a branch, or none) need a committed fixture-setup that builds a scratch repository, and none exists. Over-blocking is therefore covered by the task's own fixture tests (`shared/resources/tests/resolve-bare-task.test.mjs`, 10 tests, run per PR), not by this probe run. QA cycle 2 ran a 32-case set whose fixture-setup was not committed (`.claude/state/` is gitignored), so that run cannot be reproduced from the repository.

**Agent summary:** The checklist passes and the boundary held under 22 executions with 0 reproduced and 0 escapes. The probe plan covers the hostile direction only; the legitimate direction rests on the committed fixture tests.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

### GDPR: Applicability determination

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: Task 282 changes review-task/develop-task Input Resolution and the tracker-comment stage key (tracker-comment.js, stakeholder-summary.js). No personal data, user accounts, consent flows or retention fields are added.

### PCI-DSS: Applicability determination

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: No payment, billing or card-data features. The change is limited to skill resolution logic and a tracker-comment marker.

### WCAG: Applicability determination

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: No UI, screens, components or forms. The changes are to markdown skill files and Node scripts.

### HIPAA: Applicability determination

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: No PHI or healthcare data is involved.

**Agent summary:** Internal skill-library change (review-task/develop-task input resolution, tracker-comment stage key) with no user data, payments, UI or PHI, so no compliance area applies.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:9`
- Note: [Unreleased] > Added has the entry "review-task resolves the right task and reports every review (task 282)". It cites (task 282) and covers both behaviour changes: review-number-keyed stages, and the task-id-first bare-number resolution.

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `shared/resources/tracker-comment-contract.md:99`
- Note: Task/skill type. The contract row for review-story, review-task and review-bug documents the `{stage}-{N}` markers, the bare marker for round 1 (FIRST_ROUND_IS_BARE_STAGES) and task.282. The diff also updates the review-task, review-story and review-bug SKILL.md bodies, the step-0 and step-2 pipeline resources, and adds resolve-bare-task.sh. The generated skills/*/references copies are in the diff beside their sources. None of the three SKILL.md hunks touches frontmatter, so no skill-catalog change is needed.

### README / architecture docs updated

**Status:** ✅ PASS
- Evidence: `README.md:99`
- Note: README.md:99 describes the review-story, review-task and review-bug stage markers and matches the contract row. The task-id-first bare-number resolution is documented in the skill bodies and in the CHANGELOG entry; the README has no line on it, so none is required.

**Agent summary:** CHANGELOG.md:9 cites (task 282); the contract, the skill bodies and README.md:99 describe the new behaviour; no frontmatter change, so no catalog regeneration is needed.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (Quality Score: 96/100, cycle 3) — `task.282.gate.3.review-task-resolves-the-right-task-and-reports-every-review.yml`
- Acceptance Criteria: ✅ 7/7 complete (#5 graded from CI reading 1)
- PR Review & Tests: ✅ the host requires no review (`pr_review_decision` null); the newest `task.282.pr-review.1.review-task-resolves-the-right-task-and-reports-every-review.md` reads CONCERNS with no open coverage finding, and its findings were fixed or documented
- CI: ✅ SUCCESS on `d8a36f3cf66068fbae9ec4b8bf3c313b41988653` (six checks: test, validate, link-check, secret-scan, shellcheck, branch-source)
- Documentation: ✅ CHANGELOG, contract, skill bodies and pipeline documents
- Security Review: ✅ checklist passed, 22 probe executions, 0 reproduced
- Compliance Review: ⚠️ not applicable

**Decisions recorded at this run:**

- **Criterion #4 amended with the owner's approval.** The first AC pass failed #3 and #4 as written (the wall-time median was on an earlier commit; the Step 2 skip rule is prose no test can fail on). The owner chose to record and amend: #4 now reads "each code change has a mutation proof; prose-only edits are named as unprovable", with `approved by Lorien Gamaroff` in the criterion and a Change Log row. `criteria-drift.js` reads it as reworded and approved.
- **Wall time re-measured on the final head** rather than argued from a delta: five alternating develop and branch pairs on the LAN server, median wall 807 s against 841 s (+4.2%), median test duration +2.8%, all ten runs exit 0, load beside each run.
- **Three mutation proofs added at the DoD** for members QA cycle 1 had not recorded (`CYCLE_SCOPED_LEAD_STAGES`, the review-story call site, the review-bug call site). Each went red on revert and the file was restored and `cmp`-checked.
- **Security boundary decision.** The agent recorded `boundary: true` on the script-header signal although the document classifier read `false`. The probe plan holds hostile cases only; the legitimate direction rests on the committed fixture tests (no fixture-setup is committed for the probe engine).
- **Registry tick:** `ticked` and staged (task 282 row `planned` → `accepted`).

**Outcome:** Task meets all Definition of Done criteria and is ready for acceptance.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-19T09:47Z
**Total Duration:** 173 minutes
**CI reading 1:** SUCCESS @ `d8a36f3cf66068fbae9ec4b8bf3c313b41988653` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section
- ✅ Sprint Review summary created
- Outward side-effects — the PR canonical comment, the tracker comment and close/transition, the board move — fire **after** this file is committed and pushed (Step 7 publish boundary); their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here

**Next Steps:**

- Task is ready for Sprint Review
- No further action required
