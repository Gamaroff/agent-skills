# Definition of Done Verification

**Story/Task:** task.320.task-319-leftover-findings
**Verification Started:** 2026-11-26T03:45Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review

**QA Reports:** `task.320.qa.1` … `task.320.qa.6` (6 cycles); gate files `task.320.gate.1` … `gate.6`.
**Gate Status:** WAIVED — `task.320.gate.6.task-319-leftover-findings.yml` (90)
**Waiver**: residual accepted at the loop-limit escalation — approved by Lorien Gamaroff (2026-11-26). Waived findings: T320-CR-601 (medium), T320-CR-602 (low), T320-CR-603 (low).
**PR review (5c):** `task.320.pr-review.2.task-319-leftover-findings.md` — CONCERNS, 0 open coverage findings; 5 doc-only findings fixed in the carry.
**PR:** #949 (source: branch)
**Record criteria preflight:** ok — criterion 11's record is in the committed QA reports.
**Re-run at head:** not-configured (no `finalise.rerunAtHead` list) — `<RERUN_AT_HEAD>` passed as `none`.

**Extraction route (recorded, not hidden):** `finalise-rerun-scope.js extract` and `agent-reply-block.js extract` both answered `transcript-unreadable` (the agents replied through a hand-back message, which leaves no final assistant text). The AC YAML and the probe plan were then taken out of each agent's hand-back message mechanically (`jq` over the transcript, then the fenced block cut with `awk`), never retyped.
- AC YAML hand-copied (unverified): transcript-unreadable — `merge` ran without `--sha256`.
- Probe plan hand-copied (unverified): transcript-unreadable — planned afresh (22 entries); the `reuse` check against dod.1's plan was not run.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL — 15 of 17 met
**PR Status:** OPEN (PR #949)
**PR Review Decision:** null (no review required) — satisfied by `task.320.pr-review.2.task-319-leftover-findings.md` (CONCERNS)
**Re-run scope:** scoped (prior-record) — 15 re-judged, 2 carried

### Acceptance Criteria

#### #1: A listed command past a fenced heading or beside a criteria-like heading is refused (T319-CR-1201)

**Status:** ❌ FAIL (severity high)

- Code evidence: `shared/resources/finalise-rerun-at-head.js:1004`
- Test evidence: `shared/resources/tests/finalise-rerun-at-head.test.mjs:1246`
- Note: the recorded inputs hold, but T320-CR-601 (bug 5, still open) is an input inside the criterion's wording: an HTML block, then a column-0 `<!--`, then a fence holding `## y`, then the listed command, with a closing comment later, answers `none-named` at exit 0 at head `650152741`. The criterion says such a document is refused. The answer fails open. Gate 6's waiver accepts the finding on the QA gate; it does not amend this criterion (`criteria-drift.js` is clean).

#### #2: A command hidden by a stray backtick and an unindented line is refused (T319-CR-1202)

**Status:** ✅ PASS — `finalise-rerun-at-head.js:1033`; `finalise-rerun-at-head.test.mjs:1354`

#### #3: An untracked file beside a submodule, differing only in case, answers dirty-tree (T319-CR-1203)

**Status:** ✅ PASS — `finalise-rerun-at-head.js:754`; `finalise-rerun-at-head.test.mjs:1382`

#### #4: push-held.sh says "could not be fetched" only when the commit is absent (T319-CR-1302)

**Status:** ✅ PASS — `push-held.sh:161`; `push-policy.test.mjs:1429`

#### #5: push-held.sh stopped past its bound answers pushed; killed inside it, failed (T319-CR-1303)

**Status:** ✅ PASS — `push-held.sh:101`; `push-policy.test.mjs:1322`

#### #6: tick-pr.sh start answers the same from a subdirectory (T319-CR-1304)

**Status:** ✅ PASS — `tick-pr.sh:120`; `tick-pr.test.mjs:647`

#### #7: The limit of T319-CR-1301 is stated in tick-pr.sh, develop-next SKILL.md and configuration.md

**Status:** ✅ PASS — `tick-pr.sh:102`, `skills/develop-next/SKILL.md:659`, `docs/reference/configuration.md:320`

#### #8: An escaped top-level ci, pipeline or finalise key is refused, alone and beside the plain key

**Status:** ✅ PASS — `ci-tree-equivalence.js:400`; `ci-tree-equivalence.test.mjs:1479`, `push-policy.test.mjs:395`, `finalise-rerun-at-head.test.mjs:847`

#### #9: A skipMarker edge control or format character is refused; spaces and CRLF are accepted

**Status:** ✅ PASS — `ci-tree-equivalence.js:622`; `push-policy.test.mjs:214`

#### #10: No new test in the four suites waits longer than 30 s

**Status:** ❌ FAIL (severity low)

- Evidence: `task.320.qa.6.task-319-leftover-findings.md:95`
- Note: five timed runs with their loads meet the bound (slowest new test, T319-CR-1303, max 13.6 s), but the command that produced the per-test durations is not named in any committed record, and the measured-criterion rule requires it.

#### #11: Every new test was red before its change; the red runs are in the QA report

**Status:** ✅ PASS — QA reports 1, 4, 5 and 6 record each red run

#### #12: Reverting any one remedy turns a named test red; the table is in the QA report

**Status:** ✅ PASS — QA reports 1–6 mutation tables

#### #13: npm test passes under CI=true; npm run bundle leaves no diff

**Status:** ✅ PASS — `task.320.qa.6.task-319-leftover-findings.md:200`, `:203` (on `7cae65a14`, tree-equivalent to head)

#### #14: npm run validate for skills/develop-next/ passes

**Status:** ✅ PASS — `task.320.qa.6.task-319-leftover-findings.md:201`

#### #15: CHANGELOG Unreleased cites (task 320) and names the two new refusals

**Status:** ✅ PASS — `CHANGELOG.md:16`

#### #16: The configuration reference says what ci.skipMarker drops and refuses

**Status:** ✅ PASS — `docs/reference/configuration.md:312`

#### #17: Each Deferred Work entry of task 319 names task 320

**Status:** ✅ PASS — `task.319.ci-runs-only-where-needed.md:483`–`489`

### Advisory (not a gap)

None.

### Documentation

- **Skill and reference files updated where behaviour changed**: ✅ PASS — `skills/develop-next/SKILL.md:659`

**Agent summary:** 15 of 17 criteria pass at head 650152741. #1 fails (high, fails open): T320-CR-601 hides a fenced `## ` line and the head answers none-named; the gate waiver does not amend the criterion. #10 fails (low): the timing command is not named.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ❌ FAIL — 8 probes reproduced

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/ci-tree-equivalence.js:69`

### No new unsafe patterns (eval / exec / shell.run)

**Status:** ✅ PASS
- Evidence: `shared/resources/finalise-rerun-at-head.js:86`
- Note: every `exec(` hit is a `RegExp.exec` or an `execFileSync` with an argv array and no shell.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS
- **dependency risk**: ⚠️ NOT_APPLICABLE — no package manifest changed

### Probe Results

**Candidates executed:** 194 — **reproduced:** 8

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed: an accepted hostile case counts as reproduced, a refused one as held. A clean count describes what the runner could see, not what a target does with a value it accepted.

- `19:hostile-explicit-key-with-a-comment` — expected **rejected**, got **accepted** (T320-CR-602; `spec_ref` `docs/reference/configuration.md:466`)
- `19:hostile-alias-key` — expected **rejected**, got **accepted** (T320-CR-602; `docs/reference/configuration.md:466`)
- `20:hostile-explicit-key-with-a-comment` — expected **rejected**, got **accepted** (T320-CR-602; `docs/reference/configuration.md:313`)
- `20:hostile-alias-key` — expected **rejected**, got **accepted** (T320-CR-602; `docs/reference/configuration.md:313`)
- `21:hostile-opener-inside-a-details-block` — expected **rejected**, got **accepted** (T320-CR-601; criterion #1, task doc line 426)
- `21:hostile-opener-inside-a-div-block` — expected **rejected**, got **accepted** (T320-CR-601; criterion #1)
- `21:legit-indented-closed-comment-with-a-fence-marker` — expected **accepted**, got **rejected** (T320-CR-603; criterion #1)
- `21:legit-closed-comment-in-a-list-item` — expected **accepted**, got **rejected** (T320-CR-603; criterion #1)

- Probe run by /finalise from the security agent's plan — 22 control(s), record `task.320.dod.2.security.run.json`
- **Spec check (item 3a):** every reproduced case carries a `spec_ref`, and no line it names allows what the case says must be refused. All 8 stay findings.
- **Deferral check (item 5a):** no `deferrals.json` beside the work item, so `no-match` for every case. The gate 6 waiver is not a deferral record; each probe stays a FAIL.
- **Grading (item 3):** the severity re-dispatch was not run. The run ends in gaps on AC #1 (high) whatever these grades are, so Step 8a cannot open. The probes are therefore ungraded; the QA gate graded the same defects T320-CR-601 medium, 602 and 603 low.

**Agent summary:** Secrets and unsafe-pattern checks pass. The boundary probe reproduced exactly the three residual findings the owner accepted at gate 6 (T320-CR-601, 602, 603); nothing new was found.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

**Agent summary:** Task 320 is an internal refactor of CI and finalise tooling scripts. It handles no personal, payment or health data and changes no UI, so GDPR, PCI-DSS, WCAG and HIPAA do not apply.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:16`
- Note: two `(task 320)` entries under `[Unreleased]` (Changed at :16, Fixed at :27).

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `docs/reference/configuration.md:320`

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE

**Agent summary:** CHANGELOG has two task 320 entries; configuration.md and two SKILL.md files document the changes; no README or architecture change is needed.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Gate: WAIVED (90/100) — residual T320-CR-601/602/603 accepted by the owner at the loop limit
- Acceptance Criteria: ⚠️ 15/17 (#1 and #10 fail)
- PR Review & Tests: ✅ 5c review CONCERNS with no open coverage finding (no host review required)
- CI reading 1: SUCCESS @ `6501527418374178fd677c78e15673830876b5bf` over 6 checks
- Documentation: ✅ PASS
- Security Review: ❌ FAIL — 8 of 194 probes reproduced, all of them the waived T320-CR-601/602/603 shapes
- Compliance Review: ⚠️ NOT_APPLICABLE

**Blocking Issues:**

1. **AC #1 (high):** T320-CR-601 (bug 5) is inside the criterion's wording. An HTML block, then a column-0 `<!--`, then a fence holding `## y`, then the listed command answers `none-named`, where the criterion requires a refusal. The gate 6 waiver accepted the finding on the QA gate, but it does not amend the criterion. To close it, either fix T320-CR-601 (a code change, which re-enters QA at 5a), or have the owner amend criterion #1 to carve the HTML-block case out to a named follow-up task (a document-only change, which resumes at Step 7).
2. **AC #10 (low):** the command that produced the per-test timings in `task.320.qa.6.task-319-leftover-findings.md:95` is not named. To close it, add the four-suite timing command beside that table.
3. **Security (follows from 1):** the probe reproduced T320-CR-601 (2 cases), T320-CR-602 (4 cases) and T320-CR-603 (2 cases). These are the waived residual. To close them, fix them or defer them to a named follow-up task through `deferrals.json`, with the owner's approval.

**Outcome:** The task does NOT meet the Definition of Done. Accepting the QA residual cleared the QA gate, but criterion #1 still names the case T320-CR-601 breaks, so the owner must decide between a fix and an amendment.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-11-26T03:56Z
**Total Duration:** 11 minutes
**CI reading 1:** SUCCESS @ `6501527418374178fd677c78e15673830876b5bf` (the decision reading)

**Blocking Issues Summary:**

1. AC #1: T320-CR-601 breaks the criterion as written (fix it, or the owner amends the criterion)
2. AC #10: the timing command is not named
3. Security: 8 probes reproduce the waived residual (T320-CR-601, 602, 603)

**Estimated Effort to Close Gaps:** Small, if the owner amends criterion #1 and defers the residual to a follow-up task (documents only). Medium, if T320-CR-601 is fixed in code (re-enters QA).

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted

**Next Steps:**

- The owner decides how criterion #1 is closed: fix T320-CR-601, or amend the criterion with a follow-up task
- A gap closed by changing code re-enters QA before this verification re-runs; a document-only fix re-runs it directly
- Re-run verification after the fixes
