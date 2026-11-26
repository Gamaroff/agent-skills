# Definition of Done Verification

**Story/Task:** task.320.task-319-leftover-findings
**Verification Started:** 2026-11-25T20:46Z

---

## Verification Results

_DoD results are appended here in 4 consolidated sections after the parallel agents complete._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.320.qa.4.task-319-leftover-findings.md`
**Gate File Found:** `task.320.gate.4.task-319-leftover-findings.yml`

**Gate Status:** ✅ PASS
**Quality Score:** 100/100
**Gate head:** `c160ee638e2d`

**NFR Validation (from QA):** security, performance, reliability and maintainability PASS; 93 probes executed, 0 escaped.

**Immediate actions from QA:** none. **Future:** T320-CR-401 to T320-CR-404 (low, carried under the cosmetic-residue exit and listed in the task's Deferred Work), SEC-1b's one-second wait, `lockctl.sh`'s lock (both pre-existing).

**Record criteria:** criterion 11 names the QA report. The preflight read `location-uncommitted`, because QA report 4 has the PR review's staged edit (its population count), which rides the acceptance commit. The record the criterion asks for is committed at the PR head: each QA report holds its cycle's red runs under "Red before the change".

**Commands re-run at the head:** `not-configured` (no `finalise.rerunAtHead` in this project).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL
**PR Status:** OPEN (PR #949)
**PR Review Decision:** null (the host requires no review; the newest PR review report, `task.320.pr-review.1.task-319-leftover-findings.md`, is CONCERNS with its five findings fixed)
**Re-run scope:** full (no-prior-record) — 17 re-judged, 0 carried

**Source of the result:** the agent answered with a hand-back call, which `agent-reply-block.js` does not read (`transcript-unreadable` for the security agent). The text of that call was copied by script, unretyped, into a transcript the extractor accepts, and the extractor took the block from it: 18117 bytes, sha256 `7d907d39f404e92bf92b7ef9e9732643b13c9d8d528482e85abb9def00f66022`. The record's `verified: true` is about that copy.

### Acceptance Criteria

#### #1: Listed command past a fenced heading or beside a criteria-like heading is refused (T319-CR-1201)

**Status:** ✅ PASS — code `shared/resources/finalise-rerun-at-head.js:991`; test `shared/resources/tests/finalise-rerun-at-head.test.mjs:1208`

- Note: T320-CR-401 (low, deferred) is beyond the two recorded inputs.

#### #2: Command hidden by a stray backtick and an unindented line is refused (T319-CR-1202)

**Status:** ✅ PASS — code `shared/resources/finalise-rerun-at-head.js:1020`; test `shared/resources/tests/finalise-rerun-at-head.test.mjs:1282`

#### #3: Untracked file beside a submodule, differing only in case, answers dirty-tree (T319-CR-1203)

**Status:** ✅ PASS — code `shared/resources/finalise-rerun-at-head.js:756`; test `shared/resources/tests/finalise-rerun-at-head.test.mjs:1320`

- Note: on a disk that folds names the test returns early; CI's disk does not.

#### #4: push-held.sh says could not be fetched only when the commit is absent (T319-CR-1302)

**Status:** ✅ PASS — code `shared/resources/push-held.sh:162`; test `shared/resources/tests/push-policy.test.mjs:1405`

#### #5: push-held.sh stopped past its bound answers pushed; killed inside it, failed (T319-CR-1303)

**Status:** ✅ PASS — code `shared/resources/push-held.sh:101`; test `shared/resources/tests/push-policy.test.mjs:1298`

#### #6: tick-pr.sh start answers the same from a subdirectory (T319-CR-1304)

**Status:** ✅ PASS — code `shared/resources/tick-pr.sh:120`; test `shared/resources/tests/tick-pr.test.mjs:647`

#### #7: The limit of T319-CR-1301 is stated in the three documents

**Status:** ✅ PASS — `shared/resources/tick-pr.sh:102`, `skills/develop-next/SKILL.md:659`, `docs/reference/configuration.md:320` (documentation criterion)

#### #8: Escaped top-level ci, pipeline or finalise key is refused, alone and beside the plain key

**Status:** ✅ PASS by the agent — code `shared/resources/ci-tree-equivalence.js:400`; test `shared/resources/tests/ci-tree-equivalence.test.mjs:1479`

- Note: the agent probed 28 documents, and each was refused. The security probe below reached a file the agent did not try (a block scalar before the escaped key), where the key is accepted. The agent's verdict is kept as given; the security section carries the finding.

#### #9: skipMarker edge control or format character refused; spaces and CRLF accepted

**Status:** ✅ PASS — code `shared/resources/ci-tree-equivalence.js:592`; test `shared/resources/tests/push-policy.test.mjs:214`

#### #10: No new test in the four suites waits longer than 30 s

**Status:** ❌ FAIL (low) — `docs/tasks/task.320.task-319-leftover-findings/task.320.qa.4.task-319-leftover-findings.md:106`

- Note: re-measure. Every reading meets the bound, but QA report 4 records one run, and a wall-clock bound is graded on the median of at least five runs, each with its load recorded. The agent measured five on head `7f00b91ff` (234 tests, 0 fail each; load at start 1.89, 1.02, 1.46, 2.72, 1.94; runs 3 and 4 overlapped): longest median 13.5 s (SIGSTOP). Those figures are not yet in a committed record the criterion names.

#### #11: Every new test was red before its change; red runs in the QA report

**Status:** ✅ PASS — `docs/tasks/task.320.task-319-leftover-findings/task.320.qa.1.task-319-leftover-findings.md:103` (process criterion, 12 members, all PASS)

#### #12: Reverting any one remedy turns a named test red; table in the QA report

**Status:** ✅ PASS — `docs/tasks/task.320.task-319-leftover-findings/task.320.qa.1.task-319-leftover-findings.md:123` (process criterion; 12 members, all PASS; the agent ran 15 reverts, 15 red)

#### #13: npm test under CI=true; npm run bundle leaves no diff

**Status:** ✅ PASS — `docs/tasks/task.320.task-319-leftover-findings/task.320.qa.4.task-319-leftover-findings.md:102` and `:230`

#### #14: npm run validate for skills/develop-next/ passes

**Status:** ✅ PASS — `docs/tasks/task.320.task-319-leftover-findings/task.320.qa.4.task-319-leftover-findings.md:228`

#### #15: CHANGELOG cites (task 320) and names the two refusals

**Status:** ✅ PASS — `CHANGELOG.md:16`; test `evals/shared/tests/changelog-entry-drift.test.mjs:304` (post-merge guard)

#### #16: Configuration reference says what ci.skipMarker drops and refuses

**Status:** ✅ PASS — `docs/reference/configuration.md:312` (documentation criterion)

#### #17: Each Deferred Work entry of task 319 names task 320

**Status:** ✅ PASS — `docs/tasks/task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md:483` to `:489` (7 members)

### Advisory (not a gap)

None.

### Documentation

- **configuration.md: ci.skipMarker, pipeline, finalise.rerunAtHead, developNext.tickVia and near-miss keys**: ✅ PASS — `docs/reference/configuration.md:312` — one clause of the rerunAtHead row is too wide (T320-CR-403, low, deferred)
- **develop-next: the tick that still reads resume**: ✅ PASS — `skills/develop-next/SKILL.md:659`
- **finalise: the re-run's refusals**: ✅ PASS — `skills/finalise/SKILL.md:614`

**Agent summary:** 16 of 17 criteria pass; #10 (low) meets its 30 s bound, but the QA report records one run where five with loads are required; criteria drift clean

---

## Step 3: Security Review

**Story Type:** infrastructure
**Overall Security Status:** ❌ FAIL (five reproduced probes; 3 medium, 2 low)

### No secrets in version control

**Status:** ✅ PASS

- Evidence: `shared/resources/ci-tree-equivalence.js:109`

### TLS configured

**Status:** ⚠️ NOT_APPLICABLE — no TLS, server or endpoint change

### Logs don't contain PII

**Status:** ⚠️ NOT_APPLICABLE — no logging change

### No hardcoded secrets introduced

**Status:** ✅ PASS

- Evidence: `shared/resources/push-held.sh:157`

### No new unsafe patterns (eval, exec, shell.run)

**Status:** ✅ PASS

- Evidence: `shared/resources/finalise-rerun-at-head.js:657`

### General Security

- **security TODOs/FIXMEs**: ✅ PASS — `shared/resources/ci-tree-equivalence.js:556`
- **dependency risk**: ⚠️ NOT_APPLICABLE — no manifest or lockfile in the diff

### Probe Results

**Candidates executed:** 86 — **reproduced:** 5 (4 hostile inputs accepted, 1 legitimate document refused)

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed: an accepted hostile case counts as reproduced, a refused one as held. A clean count describes what the runner could see, not what a target does with a value it accepted.

- `note: |` then an escaped `ci` key with `docsOnly.enabled: false` (key `0:hostile-after-block-scalar`) — expected **rejected**, got **accepted**. **medium**: the owner's opt-out is dropped and the docs-only rule stays on.
- The same beside a plain `ci` block (`0:hostile-beside-after-block-scalar`) — expected **rejected**, got **accepted**. **medium**: the second block is dropped silently.
- `note: |` then an escaped `pipeline` key with `pushRecordCommits: eager` (`2:hostile-after-block-scalar`) — expected **rejected**, got **accepted**. **medium**: the stated `eager` becomes the default `batched`.
- `finalise` plain, `note: |`, then an escaped `finalise` key (`3:hostile-beside-after-block-scalar`) — expected **rejected**, got **accepted**. **low**: the list run is the plain block's.
- A fence marker inside a closed comment, before `- crit` (`4:legit-fence-marker-in-comment`) — expected **accepted** (`none-named`), got **rejected** (`scan-broken`). **low**: fails closed. Not so on `origin/develop`.

Severities are the grading agent's, unedited. Item 3a: each verdict matches the line its `spec_ref` names (`docs/reference/configuration.md:313` and `:314`, criterion 8), so none is a specification question. Item 5a: no `deferrals.json` and no `finalise.deferralApprover`, so none is deferred.

**The cause, run again by the orchestrator on this head and on `origin/develop`, with controls.** The four inputs share one cause: the parse stops at a block scalar, and the near-miss check reads parsed keys, so it never sees a key after it.

| Input | Here | `origin/develop` |
| --- | --- | --- |
| control: escaped `ci` alone | refused | accepted |
| control: plain `ci` after a block scalar | refused (row count) | refused |
| escaped `ci` after a block scalar, alone or beside | accepted | accepted |
| escaped `pipeline` after a block scalar | accepted | accepted |
| escaped `finalise` beside, after a block scalar | accepted | accepted |
| `CI` (no escape) after a block scalar | accepted | accepted |

The behaviour is older than this task, but criterion 8 and breaking change 1 promise the refusal without that exception, and the QA cycles did not probe it.

**A disclosed orchestrator error:** the first probe run used a stale plan. The extraction and the run were issued in one batch; the extraction answered `transcript-unreadable`, so the run read an older `probe-plan.json` (10 entries, 33 cases). Its record, cases file and output directory were removed and the run repeated on this plan. Nothing from the stale run is in this record.

**Plan:** 7 entries, 70 inline cases, extracted from the same kind of copied hand-back: 24955 bytes, sha256 `136b7232e5a0c5b09d43f7be1b78113aff8b6df64b4fb3e1e1e2696de4b6d0e5`.

- Probe run by /finalise from the security agent's plan — 7 control(s), record `task.320.dod.1.security.run.json`

### Recommendations for the owner

These are not security findings, and they do not count against the verdict above.

- **Spec challenge:** a criteria list item inside a code fence, then a listed command under another heading — allowed by `docs/reference/configuration.md:314`. Only an HTML comment is said to hold no criterion, so a fenced item places the criteria and the command is `none-named`.
- **Spec challenge:** a checkbox inside a comment, then a listed command under another heading — allowed by `docs/reference/configuration.md:314`. `readCriteriaEntries` reads a checkbox in a comment, so the new search never runs for it.
- **Spec challenge:** `ci.skipMarker` set to U+2800 (braille blank) — allowed by `docs/reference/configuration.md:312`. It is neither a control or format character nor a space, so a marker that shows as nothing is accepted.

**Agent summary:** Inspection clean; FAIL on reproduced probes. Not probed: `tick-pr` `landed()` (1304), `push-held`'s failed fetch (1302) and stopped push (1303), and the case-folded submodule directory (1203), which no committed fixture builds; their evidence is the suites.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

### GDPR: Data minimization, consent, right to delete, retention

**Status:** ⚠️ NOT_APPLICABLE — no personal data in scope

### PCI-DSS: No raw card data, tokenization, transaction audit trail

**Status:** ⚠️ NOT_APPLICABLE — no payment feature

### WCAG: ARIA labels, color contrast, keyboard navigation, alt text

**Status:** ⚠️ NOT_APPLICABLE — no UI change

### HIPAA: PHI encryption, PHI access audit log, BAA reference

**Status:** ⚠️ NOT_APPLICABLE — no health data

**Agent summary:** internal CLI tooling, tests and documents; no area applies. The committed change set was reviewed; the uncommitted records were not.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS

- Evidence: `CHANGELOG.md:16`
- Note: cites (task 320) in Changed and Fixed; both refusals are named. `changelog-cites.sh` answers `cites (task 320)`.

### API/type-specific docs updated

**Status:** ✅ PASS

- Evidence: `docs/reference/configuration.md:312`
- Note: T320-CR-403 (low, deferred) is not counted.

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE — neither document carries text the change makes stale

**Agent summary:** CHANGELOG, configuration reference, both skill bodies, the `tick-pr.sh` header and task 319's records reflect the change.

---

## Step 5: Acceptance Decision

**Decision:** ❌ IN PROGRESS. Two sections fail: acceptance criteria (#10) and security.

**QA Gate:** PASS (`c160ee638e2d`)
**CI reading 1:** SUCCESS @ `7f00b91ffbbefa701cf30eb70311aea6581c8163` (6 of 6 checks)
**Fix-and-recheck:** not available. Two sections fail, and three of the reproduced probes are medium; the path takes one section and low findings only.

**Outcome:**

- [ ] Criterion 8 and `configuration.md` 313, 314: an escaped (or otherwise near-miss) `ci`, `pipeline` or `finalise` key after a block scalar is accepted and its block dropped (3 medium, 1 low)
- [ ] A fence marker inside a closed comment makes a legitimate document `scan-broken` (low; not so on `origin/develop`)
- [ ] Criterion 10: one measured run in QA report 4; five runs, each with its load, are required (low)

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-11-25T21:07Z
**Total Duration:** 21 minutes

**Blocking Issues Summary:**

1. Security: escaped `ci`, `pipeline` or `finalise` after a block scalar is accepted (criterion 8, three medium, one low)
2. Security: a fence marker inside a closed comment is over-refused (low)
3. Acceptance criterion 10: the duration bound is recorded from one run, not five (low)

**Estimated Effort to Close Gaps:** Small (1-2 hours, one QA cycle included)

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted

**Next Steps:**

- Read near-miss keys from the source's top-level rows, as `ciBlockRows` does, not from the parse; add a case per block to the existing tests
- Make the fence split ignore a fence marker inside a comment
- Record five timed runs, each with its load, in the next QA report
- The first two change code, so they re-enter QA at 5a (`reenter-qa-after-finalise.sh`) before this verification re-runs
