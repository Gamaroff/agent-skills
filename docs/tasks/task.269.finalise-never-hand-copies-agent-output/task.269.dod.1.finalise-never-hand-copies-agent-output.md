# Definition of Done Verification

**Story/Task:** task.269 finalise never hand-copies agent output
**Verification Started:** 2026-11-07T16:01Z

---

## Verification Results

## Step 1: QA Report Review

**QA reports:** `task.269.qa.1`, `qa.2`, `qa.3`. **Gates:** `gate.1` FAIL (70), `gate.2` CONCERNS (90), `gate.3` **PASS (100)**, head `a9845bc0`. No waiver. The 5c PR review (`task.269.pr-review.1`) is APPROVE with one low cosmetic finding, since fixed (`pr_number: 857`).

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL (8 of 10 pass; #6 and #7 fail on their record)
**PR Status:** OPEN (PR #857, source: branch)
**PR Review Decision:** none required by the host; satisfied by `task.269.pr-review.1.finalise-never-hand-copies-agent-output.md` (APPROVE), cited by path.
**Re-run scope:** full (no-prior-record) — 10 re-judged, 0 carried
**AC YAML:** extracted from the agent's transcript, 10310 bytes, sha256 `72c9e41129f32a197bbe9a7d5051435b8d5fc5ce231773431ffe6314982cad99`, verified by `merge --sha256` (record `task.269.dod.1.ac.json`, `result.verified: true`).

| AC | Status | Code evidence | Test evidence |
| --- | --- | --- | --- |
| #1 byte-identical cases file | ✅ PASS | `security-probe-plan.mjs:464` | `security-probe-plan-cases-file.test.mjs:75` |
| #2 AC record bytes/sha, modified block refused | ✅ PASS | `finalise-rerun-scope.js:1073` | `finalise-rerun-scope.test.mjs:1851` |
| #3 escaped plan refused, control accepted | ✅ PASS | `security-probe-plan.mjs:378` | `security-probe-plan-cases-file.test.mjs:132` |
| #4 reuse path | ✅ PASS | `security-probe-plan.mjs:596` | `security-probe-plan-cases-file.test.mjs:200` |
| #5 cases_file confinement | ✅ PASS | `security-probe-plan.mjs:175` | `security-probe-plan-cases-file.test.mjs:95` |
| #6 no new case over one second | ❌ FAIL (low) | record at `qa.1:60` | one load figure, earlier head; **measured since, see Step 5** |
| #7 mutation proof per new refusal | ❌ FAIL (medium) | 6 of ~14 refusals recorded | **recorded since, see Step 5** |
| #8 bundle check, `npm test` | ✅ PASS | agent ran both: 129 skills 0 problems; 8001 tests, 0 fail | `package.json:26` |
| #9 `quick_validate.py skills/finalise` | ✅ PASS | agent ran it on HEAD | — |
| #10 inline cases still run | ✅ PASS | `security-probe-plan.mjs:466` | `read-only-agent-writes.test.mjs:156` |

### Documentation

- README or skill files updated: ✅ PASS — `skills/finalise/SKILL.md:664`, `CHANGELOG.md:9` cites task 269.

**Agent summary:** 8 of 10 pass; #6 failed on a thin timing record and #7 on missing mutation proofs for most new refusals.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

- No hardcoded secrets introduced: ✅ PASS — `agent-reply-block.js:1`
- No new unsafe patterns (eval/exec/shell): ✅ PASS — `finalise-rerun-scope.js:246` (argv-array spawns only)
- Transcript lookup, agent id and block handling: ✅ PASS — `agent-reply-block.js:56` (id is `^[A-Za-z0-9]+$`, checked before the filename is built)
- Dependency risk: ⚠️ NOT_APPLICABLE (no `package.json` change)

### Probe Results

**Candidates executed:** 10 — **reproduced:** 0. ✅ **The boundary held.** `casesFileAccepted` was probed with climb, deep climb, climb behind a descent, absolute, absolute-inside, empty, directory, NUL byte, and two legitimate names (flat, nested).

Probe run by /finalise from the security agent's plan — 1 control, record `task.269.dod.1.security.run.json`. The plan was extracted from the agent's transcript (5159 bytes, sha256 `ddde933c7ec876e05e71e19da9b0f140abb8cb23338c17ddf0abd10c6f57a289`), not retyped. Not a reuse: first run, no `dod.0`.

### Recommendations for the owner

These are not security findings and do not count against the verdict.

- **Spec challenge:** a `cases_file` name that is a regular file in the work-item directory but is not named like a cases file (for example the task `.md`) is accepted, since the spec at `task.269.finalise-never-hand-copies-agent-output.md:59` asks only for a committed file in that directory. `cases_sha256` and the JSON-array check limit it. The owner may want to require the `*.security.cases.json` name pattern.

**Agent summary:** checklist passes with citations; the symlink refusal is covered by unit tests only, since the probe engine cannot create a symlink.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE (internal tooling: no personal data, payments, UI or PHI).

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- CHANGELOG.md updated: ✅ PASS — `CHANGELOG.md:9`, cites (task 269)
- API/type-specific docs updated: ✅ PASS — `skills/finalise/SKILL.md`; no catalog change (no frontmatter touched)
- README / architecture docs: ⚠️ NOT_APPLICABLE

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED — GAPS IDENTIFIED (run 1)

The Acceptance Criteria section is the only FAIL; QA gate PASS, security PASS, compliance and docs pass. CI was not sampled: the decision is already IN PROGRESS on the AC column.

**Outcome:**

- [ ] AC #6: no new test case takes over one second; five runs with `/proc/loadavg` beside each, on the PR head (the recorded run has one load figure and an earlier head)
- [ ] AC #7: a mutation proof for each new refusal; recorded for 6 of about 14

**Closed after the agents ran, before this run ended.** Both were record gaps, not behaviour gaps, so the evidence was produced rather than argued: five timed runs (slowest 410.7 ms, load 2.20 to 2.22) and thirteen new revert-and-red proofs, written into the `qa.3` report's addendum. One proof (M1a) found a real test gap: the absolute-name guard in `resolveCasesFile` was untested, because the later containment check hid it. An assertion was added; the guard now has a proof. These need a re-run of this verification to be graded. The one test assertion is a code change, so it goes through a further QA cycle (gate 4) first.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED
**Completion Time:** 2026-11-07T16:16Z
**Total Duration:** 15 minutes

**Blocking Issues Summary:**

1. AC #6: timing record thin (closed in the `qa.3` addendum, awaiting a graded re-run)
2. AC #7: mutation proofs for 8 of 14 refusals missing (closed in the `qa.3` addendum, awaiting a graded re-run)

**Estimated Effort to Close Gaps:** Small (evidence already produced; one QA cycle and a scoped re-run)

**Next Steps:**

- QA cycle 4 on the files changed since gate 3, then 5c
- Re-run `/finalise`: the re-run is scoped, so only #6 and #7 are re-judged
