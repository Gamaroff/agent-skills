# Definition of Done Verification

**Story/Task:** task.319 — Pipelines spend a CI run only where a run can answer something
**Verification Started:** 2026-11-25T05:18Z

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Report Found:** `task.319.qa.9.ci-runs-only-where-needed.md`
**Gate File Found:** `task.319.gate.9.ci-runs-only-where-needed.yml`

**Gate Status:** ✅ PASS (100), `top_issues` empty
**PR review:** `task.319.pr-review.3.ci-runs-only-where-needed.md` — APPROVE
**Record criteria:** #5 ok. #12 `no-location`: nothing to record, its evidence is the reference itself.
**Re-run at head:** `not-configured`

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (13 of 13)
**PR:** #937 (source: branch)
**PR Status:** OPEN
**PR Review Decision:** null (the host requires no review; PR review 3 is APPROVE)
**Re-run scope:** scoped (prior-record) — 7 re-judged, 6 carried
**AC result:** extracted from the agent's transcript, 24083 bytes, sha256 `8568d6ebaf4bc192af6f38ec2151decd84069ff1ddb8ae79ec1003f8cbb4ee5f`; record `task.319.dod.2.ac.json`

The agent read a local diff without the generated copies. GitHub refuses the PR diff (HTTP 406, over 20000 lines).

### Acceptance Criteria

| ID | Status | Code evidence | Test evidence |
| -- | ------ | ------------- | ------------- |
| #1 Every push site calls push-policy | ✅ PASS | `shared/resources/push-policy.sh:110` | `shared/resources/tests/push-policy.test.mjs:827` |
| #2 Five-cycle run pushes three times | ✅ PASS | `shared/resources/push-policy.sh:204` | `shared/resources/tests/push-policy.test.mjs:311` |
| #3 Pause hook leaves the remote unmoved | ✅ PASS (carried from the prior run) | `shared/resources/develop-pipeline-on-precompact.sh:358` | `shared/resources/develop-pipeline-on-precompact.test.sh:837` |
| #4 Marker never on a commit with code | ✅ PASS | `shared/resources/push-policy.sh:162` | `shared/resources/tests/push-policy.test.mjs:518` |
| #5 A listed command is graded at the head | ✅ PASS (carried from the prior run) | `skills/finalise/SKILL.md:599` | `shared/resources/tests/finalise-rerun-at-head.test.mjs:106` |
| #6 An `eslint:` entry is scored | ✅ PASS (carried from the prior run) | `shared/resources/security-probe.mjs:878` | `shared/resources/tests/security-probe-eslint.test.mjs:111` |
| #7 Bitbucket poll writes the same line | ✅ PASS (carried from the prior run) | `shared/resources/finalise-ci-poll.sh:165` | `shared/resources/tests/finalise-ci-poll.test.mjs:155` |
| #8 `tickVia: pr` ticks through a merged PR | ✅ PASS (carried from the prior run) | `shared/resources/tick-pr.sh:253` | `shared/resources/tests/tick-pr.test.mjs:188` |
| #9 Push counts in the QA report | ✅ PASS | `task.319.qa.9.ci-runs-only-where-needed.md:100` | `shared/resources/tests/push-policy.test.mjs:324` |
| #10 Suite green, and every new test red before its change | ✅ PASS | `task.319.qa.9.ci-runs-only-where-needed.md:107` | process criterion |
| #11 Bundle leaves no diff | ✅ PASS (carried from the prior run) | `task.319.qa.8.ci-runs-only-where-needed.md:114` | process criterion |
| #12 Four keys in the reference | ✅ PASS | `docs/reference/configuration.md:313` | documentation criterion |
| #13 CHANGELOG names each part | ✅ PASS | `CHANGELOG.md:9` | `evals/shared/tests/changelog-entry-drift.test.mjs` |

**#10.** The gap of run 1 is closed: all 45 members it named have a red run in `task.319.qa.9.red-first.txt` or in the tables of QA report 9. The agent reproduced six of them in a scratch copy. Rows 132 and 133 of that report, and part of row 131, are in the acceptance commit.

**#1.** A known limit, not a gap: the scan accepts a `push-policy` mention in a comment near a push (`develop-pipeline-on-precompact.sh:441`). Scenario 17j holds that behaviour.

### Advisory (not a gap)

None.

### Documentation

- **Configuration reference covers the new keys and the push rule**: ✅ PASS — `docs/reference/configuration.md:474`
- **Pipeline READMEs restate the pushes as push-policy decides them**: ✅ PASS — `skills/develop-task/README.md:332`
- **Pipeline artifacts reference and docs-only runbook**: ✅ PASS — `docs/runbooks/ci-docs-only-skip.md:148`

**Agent summary:** 13 of 13 criteria PASS: 7 re-judged and 6 carried; the red-first record in QA 9 closes all 45 reported members of #10.

---

## Step 3: Security Review

**Story Type:** infrastructure
**Overall Security Status:** ✅ PASS

| Check | Status | Evidence |
| ----- | ------ | -------- |
| No secrets in version control | ✅ PASS | `shared/resources/pr-read.sh:122` |
| TLS configured | ✅ PASS | `shared/resources/pr-read.sh:58` |
| Logs do not contain PII | ⚠️ NOT_APPLICABLE | no logging changed |
| No hardcoded secrets introduced | ✅ PASS | `shared/resources/tick-pr.sh:281` |
| No new unsafe patterns | ✅ PASS | `shared/resources/finalise-rerun-at-head.js:391` |
| Security TODOs or FIXMEs (general) | ✅ PASS | none in the added lines |
| Dependency risk (general) | ⚠️ NOT_APPLICABLE | `package.json` is not in the diff |

### Probe Results

**Candidates executed:** 201 — **reproduced:** 0 — escapes: 0 — refusals: 0

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process) is not observed: an accepted hostile case counts as reproduced, a refused one as held. A clean count describes what the runner could see, not what a target does with a value it accepted.

✅ **The boundary held** — every candidate returned its expected verdict. The U+0085 case of run 1 is refused.

- Probe run by /finalise from the security agent's plan — 10 controls, record `task.319.dod.2.security.run.json`. Plan extracted from the agent's transcript, 11054 bytes, sha256 `fa86dde098aa6b8aabde1d2b2d42d8f656c3c28d1c9f60e10b95bc32abc16c6c`. Run 1's plan was not reused whole (`engine-changed`); its nine cases files were, with unchanged hashes, and a tenth control covers the new marker rule.

Four `spec_ref` lines in the first cases file are two lines out (`configuration.md:482`, `:503` and `:504`, now `:484`, `:505` and `:506`). Nothing reproduced there, so no verdict rests on them.

No entry form reaches: `push-policy --mark` answering `marked`, the delta comparison, a real `tick-pr` merge, and the poll's Bitbucket arm. They rest on their committed suites.

### Recommendations for the owner

These are not security findings, and they do not count against the verdict above.

- **Spec challenge:** a second `pipeline` block spelled with an escape (`"pipelin\x65"`) — allowed by `docs/reference/configuration.md:313`. It is not refused, unlike a second `finalise` block. The plain block wins, so only push timing is affected.

**Agent summary:** the checklist passes by inspection. `skipMarkerOf` trims the value first, so a byte-order mark or tab at its very edge is stripped, not refused; the applied marker then holds none, and line 312 does not mention it.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None. GDPR, PCI-DSS, WCAG and HIPAA each read NOT_APPLICABLE: no personal data, payment, interface or health surface in the diff.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- **CHANGELOG.md updated**: ✅ PASS — `CHANGELOG.md:9`, each part named under `[Unreleased]`
- **API/type-specific docs updated**: ✅ PASS — `docs/reference/configuration.md:479`. The HALT sentence run 1 failed agrees with `push-held.sh`, and the `ci.skipMarker` row with `ci-tree-equivalence.js`.
- **README / architecture docs updated**: ⚠️ NOT_APPLICABLE

Advisory, not a gap: "`eager` restores a push after every commit" leaves out the `qa-review-fix` site, which is held in both modes. That is the behaviour before this task, as line 313 says.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**CI reading 1:** SUCCESS @ `109a5f998d2385f8f0b84b488a18a718973728a3` (6 checks, every conclusion SUCCESS)

**Summary:**

- QA gate 9: ✅ PASS (100)
- Acceptance Criteria: ✅ 13 of 13
- PR review 3: ✅ APPROVE
- Documentation: ✅ PASS
- Security: ✅ PASS, 201 probes executed, 0 reproduced
- Compliance: ⚠️ not applicable

**Outcome:** The task meets the Definition of Done. The three gaps of run 1 are closed. Seven low findings stay under Deferred Work.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED

**Completion Time:** 2026-11-25T05:28Z
**Total Duration:** 10 minutes
**CI reading 1:** SUCCESS @ `109a5f998d2385f8f0b84b488a18a718973728a3` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section
- ✅ Sprint Review summary created
- Outward side-effects — the PR canonical comment, the tracker comment and close/transition, the board move — fire **after** this file is committed and pushed (Step 7 publish boundary); their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here

**Next Steps:**

- The task is ready for Sprint Review
- The pull request waits for the owner's merge
