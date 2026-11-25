# Definition of Done Verification

**Story/Task:** task.319.ci-runs-only-where-needed
**Verification Started:** 2026-11-24T22:20Z

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Report Found:** `task.319.qa.8.ci-runs-only-where-needed.md`
**Gate File Found:** `task.319.gate.8.ci-runs-only-where-needed.yml`

**Gate Status:** ✅ PASS (100), `top_issues` empty, seven low findings in `recommendations.future`
**PR review:** `task.319.pr-review.2.ci-runs-only-where-needed.md` — APPROVE
**Record criteria:** #5 ok. #12 `no-location`: nothing to record, its evidence is the reference itself.
**Re-run at head:** `not-configured`

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL (12 of 13)
**PR:** #937 (source: branch)
**PR Status:** OPEN
**PR Review Decision:** null (the host requires no review; PR review 2 is APPROVE)
**Re-run scope:** full (no-prior-record) — 13 re-judged, 0 carried
**AC result:** extracted from the agent's transcript, 19632 bytes, sha256 `e8de1ff4eabc40f03c5d4c041dbdd02c7ac2703aa13e948d1ae997be8f0d6684`; record `task.319.dod.1.ac.json`

The agent read a local diff. GitHub refused the PR diff (HTTP 406, over 20000 lines), and the fallback the step gives, `git diff HEAD~1 HEAD`, is one docs commit here.

### Acceptance Criteria

| ID | Status | Code evidence | Test evidence |
| -- | ------ | ------------- | ------------- |
| #1 Every push site calls push-policy | ✅ PASS | `shared/resources/push-policy.sh:110` | `shared/resources/tests/push-policy.test.mjs:786` |
| #2 Five-cycle run pushes three times | ✅ PASS | `shared/resources/push-policy.sh:204` | `shared/resources/tests/push-policy.test.mjs:270` |
| #3 Pause hook leaves the remote unmoved | ✅ PASS | `shared/resources/develop-pipeline-on-precompact.sh:358` | `shared/resources/develop-pipeline-on-precompact.test.sh:837` |
| #4 Marker never on a commit with code | ✅ PASS | `shared/resources/push-policy.sh:162` | `shared/resources/tests/push-policy.test.mjs:477` |
| #5 A listed command is graded at the head | ✅ PASS | `skills/finalise/SKILL.md:599` | `shared/resources/tests/finalise-rerun-at-head.test.mjs:106` |
| #6 An `eslint:` entry is scored | ✅ PASS | `shared/resources/security-probe.mjs:878` | `shared/resources/tests/security-probe-eslint.test.mjs:111` |
| #7 Bitbucket poll writes the same line | ✅ PASS | `shared/resources/finalise-ci-poll.sh:165` | `shared/resources/tests/finalise-ci-poll.test.mjs:155` |
| #8 `tickVia: pr` ticks through a merged PR | ✅ PASS | `shared/resources/tick-pr.sh:253` | `shared/resources/tests/tick-pr.test.mjs:188` |
| #9 Push counts in the QA report | ✅ PASS | `task.319.qa.8.ci-runs-only-where-needed.md:103` | `shared/resources/tests/push-policy.test.mjs:283` |
| #10 Suite green, and every new test red before its change | ❌ FAIL (medium) | `task.319.qa.1.ci-runs-only-where-needed.md:98` | process criterion |
| #11 Bundle leaves no diff | ✅ PASS | `task.319.qa.8.ci-runs-only-where-needed.md:114` | process criterion |
| #12 Four keys in the reference | ✅ PASS | `docs/reference/configuration.md:313` | documentation criterion |
| #13 CHANGELOG names each part | ✅ PASS | `CHANGELOG.md:9` | `evals/shared/tests/changelog-entry-drift.test.mjs` |

**#10.** The suite half is met (QA 8 line 108; the hosted `test` job is green on the head). The other half is not: the tables of QA reports 1 to 7 are by behaviour, and 45 of the new tests have no row that names them as red. No cited code is wrong; the gap is the record.

### Advisory (not a gap)

- **#1**: the scan accepts any `push-policy --site` text near a push, a comment included (`develop-pipeline-on-precompact.sh:442`). Scenario 17j holds that behaviour. Gate 8 carries a similar limit.
- **#5**: T319-CR-1201 and T319-CR-1202, under Deferred Work, describe criteria in which a listed command is not found.

### Evidence collected for #10 after the agent reported

Run in a scratch worktree at `4005bbc73`, removed afterwards. It is not yet in a QA report, which is where the criterion asks for it.

**A. The new tests against the source before this task.** Every changed file that is not a test, under `shared/`, `skills/` and `docs/reference/`, at the merge base `a511895a0` (91 restored, 22 removed), then `node --test <file>`.

| Test file | Red | Green, of the tests this task adds or changes |
| --------- | --- | --------------------------------------------- |
| `push-policy.test.mjs` | 40 | 1: "eager: the same loop pushes after every commit" (`eager` is the old behaviour; see B) |
| `tick-pr.test.mjs` | 25 | 0 |
| `finalise-ci-poll.test.mjs` | 9 | 0 |
| `ci-tree-equivalence.test.mjs` | 9 | 0 |
| `finalise-rerun-scope.test.mjs` | 3 | 0 |
| `criteria-section.test.mjs` | 1 | 0 |
| `finalise-bug-mode.test.mjs`, `finalise-publish-boundary.test.mjs` | 1 each | 0 |
| `finalise-rerun-at-head.test.mjs`, `security-probe-eslint.test.mjs`, `finalise-rerun-scope-blocks.test.mjs` | whole file, at load | not told apart; see B |

**B. The files that failed at load, test by test, on the head with one thing replaced.**

| Replaced | Result |
| -------- | ------ |
| `finalise-rerun-at-head.js` by a stub with its names and no behaviour | `finalise-rerun-at-head.test.mjs`: 41 red, 0 green. `finalise-rerun-scope-blocks.test.mjs`: "Step 3a end to end …" red in both shells |
| `security-probe.mjs` at the merge base, plus an empty `checkEslintRuntime` | `security-probe-eslint.test.mjs`: 13 red, 1 green |
| `probe-boundary-rule.md` at the merge base | the remaining one, "every document that lists the engine's entry forms …": red |
| the `DOD_N` number check of the Step 3a re-run block removed | "Step 3a's re-run block refuses a DOD_N …": red in both shells |
| the record preflight call moved after the re-run | "Step 3a runs the named commands before …": red |
| the `eager` line of `push-policy.sh` removed | "eager: the same loop …": red |

"Step 8a grades the re-run on the fix head again …" (QA report 3 line 133), the pre-compact scenario 17j (QA report 1 line 103) and the `pr-read.test.sh` section (QA report 3 line 132) were already recorded.

### Documentation

- **Skill READMEs and SKILL files for the push rule**: ✅ PASS — `skills/develop-task/README.md:332`
- **Configuration reference, when the pipelines push**: ✅ PASS for presence — `docs/reference/configuration.md:476` (one wrong statement in it: Step 4b)
- **Probe and review documents name the `eslint:` entry**: ✅ PASS — `skills/review-security/SKILL.md:159`

---

## Step 3: Security Review

**Story Type:** infrastructure
**Overall Security Status:** ❌ FAIL (one reproduced probe, low)

| Check | Status | Evidence |
| ----- | ------ | -------- |
| No secrets in version control | ✅ PASS | `shared/resources/pr-read.sh:58` |
| TLS configured | ✅ PASS | `shared/resources/ci-tree-equivalence.js:100` |
| Logs do not contain PII | ⚠️ NOT_APPLICABLE | no logging changed |
| No hardcoded secrets introduced | ✅ PASS | `shared/resources/tick-pr.sh:281` |
| No new unsafe patterns | ✅ PASS | `shared/resources/finalise-rerun-at-head.js:391` |
| Security TODOs or FIXMEs (general) | ✅ PASS | none in the added lines |
| Dependency risk (general) | ⚠️ NOT_APPLICABLE | `package.json` is not in the diff |

### Probe Results

**Candidates executed:** 168 — **reproduced:** 1 — escapes: 0 — refusals: 0

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed: an accepted hostile case counts as reproduced, a refused one as held.

- `ci.skipMarker: "a<U+0085>b"` (`6:hostile-c1-control`, `ci-tree-equivalence.js#parseConfig`) — expected **rejected**, got **accepted**. Checked against its `spec_ref`, `docs/reference/configuration.md:312`: "one printable line". U+0085 is a C1 control, so the case matches its line and is a finding. `skipMarkerOf` refuses U+0000 to U+001F and U+007F only (`ci-tree-equivalence.js`). Grade: **low**, from the security agent's own summary (the project's own committed configuration; the key is off by default). The grading re-dispatch was not run: with three sections open the fix-and-recheck step cannot apply, so the grade decides nothing.
- Deferral: no `deferrals.json` beside the work item, so no match.

Probe run by /finalise from the security agent's plan — 9 controls, record `task.319.dod.1.security.run.json`. Plan extracted from the agent's transcript, 43595 bytes, sha256 `3f2eba65fd8e26b38711f5487c332bce4f2b029d9556bc49e032abd45ab205d3`.

No entry form reaches: `push-policy --mark` answering `marked`, the delta comparison, `tick-pr` start, open, finish and a real merge, the poll's Bitbucket arm, and `--reduce-bitbucket`. They rest on their committed suites.

### Recommendations for the owner

These are not security findings, and they do not count against the verdict above.

- **Spec challenge:** `ci.skipMarker` holding U+202E — allowed by `docs/reference/configuration.md:312`. "One printable line" does not say whether a format character counts. It can reorder how a commit subject displays.
- **Spec challenge:** a second `pipeline` block spelled with an escape (`"pipelin\x65"`) — `docs/reference/configuration.md:313`. It is not refused, unlike a second `finalise` block. The plain block wins, so only push timing is affected.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None. GDPR, PCI-DSS, WCAG and HIPAA each read NOT_APPLICABLE: no personal data, payment, interface or health surface in the diff.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ❌ FAIL (low)

- **CHANGELOG.md updated**: ✅ PASS — `CHANGELOG.md:9`, six entries under `[Unreleased]` cite task 319
- **API/type-specific docs updated**: ❌ FAIL (low) — `docs/reference/configuration.md:478-480`. It says a HALT's push keeps commits local "only" where a push would do harm, or when it does not finish in 60 seconds. `push-held.sh` allows 50 seconds at `--site halt`, and also keeps commits local when origin or the lock cannot be read, the push is rejected, something is staged, or the checkout is not on the run's branch. Checked against the script; the sentence came in with QA fix cycle 4, and gates 5 to 8 did not report it.
- **README / architecture docs updated**: ⚠️ NOT_APPLICABLE

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**CI reading 1:** SUCCESS @ `4005bbc730becf23fcdeeb2e4ab69c0dc0244139` (8 checks, every conclusion SUCCESS)

**Summary:**

- QA gate 8: ✅ PASS (100)
- Acceptance Criteria: ❌ 12 of 13 (#10)
- PR review: ✅ APPROVE
- Documentation: ❌ one wrong sentence (low)
- Security: ❌ one reproduced probe (low)
- Compliance: ⚠️ not applicable

**Fix-and-recheck:** does not apply. It needs exactly one failing section, and three fail.

**Blocking Issues:**

1. Criterion #10: no red-first record for 45 new tests in a QA report. The evidence now exists (Step 2) and needs to be in one.
2. Security: `ci.skipMarker` accepts the C1 control characters.
3. Docs: the HALT sentence of `docs/reference/configuration.md` states the wrong bound and the wrong list.

**Outcome:** Task does NOT meet the Definition of Done. Gap 2 is a code change, so it goes back through QA at 5a before this verification runs again.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-11-24T22:34Z
**Total Duration:** 14 minutes
**CI reading 1:** SUCCESS @ `4005bbc730becf23fcdeeb2e4ab69c0dc0244139`

**Estimated Effort to Close Gaps:** Small

**Artifacts Generated:**

- ✅ Gap report added to the task document
- The PR comment is posted after this file is committed; its outcome is in the implementation report

**Next Steps:**

- Fix the three gaps in one commit, with a test for the C1 characters
- Resume: the code change re-enters QA at 5a, then this verification runs again
