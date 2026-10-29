# Definition of Done Verification

**Story/Task:** task.238.qa-loop-acts-on-signals-it-has
**Verification Started:** 2026-10-28T08:57Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ⚠️

**QA Report Found:** `task.238.qa.10.qa-loop-acts-on-signals-it-has.md`
**Gate File Found:** `task.238.gate.10.qa-loop-acts-on-signals-it-has.yml` (judged head `885debef`)

**Gate Status:** ⚠️ CONCERNS — no open entry in `top_issues[]`
**Quality Score:** 90/100

**NFR Validation (from QA):**

- Security: ⚠️ CONCERNS (measured: 29 probes, 0 escaped). One reproduced low gap, CR10-1 (a second `findings:` list cut short reads `0`), deferred to task.240 (#771) by owner decision on 2026-10-28
- Performance: ✅ PASS
- Reliability: ✅ PASS
- Maintainability: ✅ PASS

**Immediate Actions from QA:** none
**Future Actions from QA:** CR10-1, CR10-2, CR9-4, CR9-5, plus items carried from gates 6–8

**Prior run:** DoD run 1 (`task.238.dod.1.qa-loop-acts-on-signals-it-has.md`) found 5 gaps against gate 3. They were fixed in `adff39e2`, and QA cycles 4–10 have run since. The body's run 1 gaps section is marked superseded. This run judges every criterion again.

**PR:** #770 (source: branch)
**PR review (5c):** ✅ APPROVE — `task.238.pr-review.4.qa-loop-acts-on-signals-it-has.md` (5 low conformance findings). The host requires no reviews (`reviewDecision` empty), so this report fills the "PR approved" column (obs #253).

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #770)
**PR Review Decision:** null (no review required) — 5c `/review-pr` APPROVE stands in (`task.238.pr-review.4`)

### Acceptance Criteria

| Criterion | Status | Code evidence | Test evidence (runs per PR) |
| --- | --- | --- | --- |
| SC-1 red log kept, removed only on exit 0 | ✅ PASS | `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1206` (+ step-3 :250/:264, develop-bug :198/:216, develop :628) | `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs:88`, :118–161 |
| SC-2 two red outcomes, never compared with base (amended) | ✅ PASS | `develop-pipeline-step-5-6-qa-loop.md:1245–1246` | `qa-loop-fast-gate-outcomes.test.mjs:289`, :312–362, :485 |
| SC-3 one-time CI read, GitHub + Bitbucket, head = HEAD | ✅ PASS | `skills/qa-task/SKILL.md:1204`, `skills/qa-story/SKILL.md:1900`, `shared/resources/qa-ci-read.sh` | `shared/resources/tests/qa-ci-read.test.mjs:190`, :218, :235, :371, :389 |
| SC-3a Bitbucket PR Existence Check never calls gh | ✅ PASS | `skills/qa-task/SKILL.md:130`, `skills/qa-story/SKILL.md:171` | `skills/qa-task/tests/qa-task.test.js:327`, :340; `qa-story.test.js:345`, :354 |
| SC-4 5c CONCERNS + open coverage → 5b | ✅ PASS | `develop-pipeline-step-5-6-qa-loop.md:1517`, block :1556–1594 | `evals/shared/tests/pr-review-loop-parity.test.mjs:676`, :788, :932 |
| SC-4a qa-fix ladder coverage row | ✅ PASS | `skills/qa-fix/SKILL.md:475`, :407 | `pr-review-loop-parity.test.mjs:1170` |
| SC-4b resume split | ✅ PASS | `shared/resources/develop-pipeline-resume-contract.md:555–557` | `pr-review-loop-parity.test.mjs:2017` |
| SC-5 no wait in CI-read blocks | ✅ PASS | `skills/qa-task/SKILL.md:1203`, `skills/qa-story/SKILL.md:1897–1901` | `qa-task.test.js:369`, `qa-story.test.js:381`, `qa-ci-read.test.mjs:425` |
| SC-6 classify never re-runs (amended) | ✅ PASS | `shared/resources/fast-gate-outcome.sh` (no git/worktree call) | `qa-loop-fast-gate-outcomes.test.mjs:271` |
| SC-7 `ci:fast` passes | ✅ PASS | `package.json:25` | `.github/workflows/test.yml:55` — `test` SUCCESS on `934ce5db` |
| SC-8 `bundle:check` passes | ✅ PASS | `package.json:66` | `.github/workflows/validate.yml:128`, :135–139 — `validate` SUCCESS on `934ce5db` |
| SC-9 `validate` passes for the five skills | ✅ PASS | `package.json:52` | `validate.yml:67` — SUCCESS on `934ce5db` |
| SC-10 every guard mutation-proved, recorded | ✅ PASS | commits `12dfb4b6`, `908d3713`, `8b7e8d1c`, `adff39e2`, `4ef29ed1`, `8345b798`, `ad6fef33`, `d51a9dca` | documentation criterion (commit-message text) |
| SC-11 CHANGELOG cites task 238, four behaviours | ✅ PASS | `CHANGELOG.md:9–31` | `evals/shared/tests/changelog-entry-drift.test.mjs` (after merge) |
| SC-12 no stale "CONCERNS → Step 7" restatement | ✅ PASS | `shared/resources/develop-pipeline-autonomous-defaults.md:34`, QA loop :1517, develop-task :239–241, develop-story :252–254 | documentation criterion (sweep re-run at `934ce5db`) |

- Note (SC-10): `92e33b0f` and `0df2880e` say only "each guard mutation-proven" and name no mutation. QA reports 9 and 10 record those mutations (qa.10: 3 of 3 cycle 9 guards red in a scratch worktree). Advisory, not a gap.
- Note (SC-4): CR10-1 (low, a second `findings:` list cut short reads `0`) is deferred to task.240. No criterion states the reader's fail-closed property.

### Documentation

- **CHANGELOG.md [Unreleased] entry for task 238**: ✅ PASS — `CHANGELOG.md:9`
- **Skill/README files updated where behaviour changed**: ✅ PASS — `skills/develop-task/README.md:121`

**Agent summary:** All 15 criteria (SC-1 to SC-12, SC-3a, SC-4a, SC-4b) pass with code evidence and per-PR test evidence; test.yml and validate.yml are green on `934ce5db`. The PR is open and needs no review.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ❌ FAIL on the raw record (1 probe reproduced). That probe is the owner-deferred CR10-1; see "Owner deferral" below.

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/qa-ci-read.sh:130`
- Note: No literal credentials in the added lines. The Bitbucket credential comes from `bitbucket-auth.sh`.

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: `shared/resources/qa-ci-read.sh:38`
- Note: No `eval`/`exec`. `--vcs` (:37), `--pr` (:38) and `fast-gate-outcome.sh --exit` (:36–40) are allow-listed before use, and the open-coverage reader maps any non-count value to `unreadable` (`develop-pipeline-step-5-6-qa-loop.md:1593`).

### General Security

- **security TODOs/FIXMEs**: ✅ PASS — none in the changed `.sh`/`.mjs`/`.js` files
- **dependency risk**: ⚠️ NOT_APPLICABLE — no `package.json` or lockfile change

### Probe Results

**Candidates executed:** 119 — **reproduced:** 1 — **escaped:** 0 — **refused:** 0

- `oc10-second-findings-cut-short` (control `open-coverage-cr10-1`, fence `develop-pipeline-step-5-6-qa-loop.md#Verdict branching`): input is a report whose first `findings:` list is terminated and whose second `findings:` list is cut short with no fence after it. Expected **rejected** (`OPEN_COVERAGE=unreadable`), got **accepted** (a count). Severity **low**, graded by the security agent in its plan: fail-closed in intent, a contrived shape, 0 of 185 tracked PR review reports have it.

Every other control held:

| Control | Cases |
| --- | --- |
| `qa-ci-read.sh --pr` | 8 |
| `qa-ci-read.sh --vcs` (first probe of this allow-list) | 9 |
| `fast-gate-outcome.sh --exit` | 13 |
| `fast-gate-outcome.sh --log` (failing-test paths, no base run) | 25 |
| Wrapper signal sentence | 7 |
| §5c open-coverage reader (sets from gates 5, 7, 8, 9 and 10) | 56 |

In the log-path cases, nothing ran outside the checkout (`RAN-OUTSIDE-BASE` absent in all 8 fixtures that plant it).

**Owner deferral (recorded, not a new finding):** this is the same case, under the same id, that QA gate 10 reproduced. The owner deferred it to task.240 (issue #771) on 2026-10-28, with the instruction "any new awk shape gap is recorded as deferred to T240, not fixed again". It is recorded in the task's Deferred Work (CR10-1) and in gate 10's `recommendations.future`. task.240 replaces the awk with a parser that refuses a duplicate key. The DoD treats the reproduction as covered by that decision. It does not fix it (Step 8a's fix-and-recheck would contradict the owner's decision), and it does not read it as a new gap.

- Probe run by /finalise from the security agent's plan — 11 control(s), record `docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.dod.2.security.run.json` (cases `task.238.dod.2.security.cases.{1..11}.json`)

**Agent summary:** A boundary deliverable. The fast-gate `..` escape from DoD run 1 is moot because its base-run code was deleted in QA cycle 6. Two paths were not probed because they make network calls: the Bitbucket curl path and the PR Existence Check lookup.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

- **GDPR / PCI-DSS / WCAG / HIPAA**: ⚠️ NOT_APPLICABLE. The diff has only `.md`/`.sh`/`.js`/`.mjs`/`.json`/`.yml` files: no schema, DTO, model, UI or payment code.

**Agent summary:** An internal agent-skills tooling refactor. It handles no personal, payment or health data and changes no UI.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:9`
- Note: `[Unreleased]` cites task 238 and names all four behaviours: gated log cleanup, red-gate classification, PR existence plus CI read, and coverage routing (SC-11).

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1517`
- Note: The SC-12 sweep was re-run and every hit carries the coverage condition. The plan's two exclusions stand, and catalog regeneration is not needed (no frontmatter hunk).

### README / architecture docs updated

**Status:** ✅ PASS
- Evidence: `skills/develop-task/README.md:121`
- Note: The develop-task and develop-story README diagrams show the coverage route. The root README and `docs/architecture/` are unaffected.

**Agent summary:** All three docs checks pass.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ⚠️ CONCERNS (90/100), no open entry. The only residue is CR10-1, owner-deferred to task.240
- Acceptance Criteria: ✅ 15/15 (SC-1 to SC-12, SC-3a, SC-4a, SC-4b)
- PR Review & Tests: ✅ 5c `/review-pr` APPROVE (`task.238.pr-review.4`); no host review required; test, validate, link-check, shellcheck and secret-scan green
- Documentation: ✅ CHANGELOG cites task 238 (SC-11), and the SC-12 sweep is clean
- Security Review: ✅ checklist PASS. Probe: 119 executed, 0 escaped, 1 reproduced, and that one is the owner-deferred CR10-1 (low)
- Compliance Review: ⚠️ NOT_APPLICABLE (internal tooling)
- CI reading 1: SUCCESS @ `934ce5db2a2d` over 6 checks (test, validate, link-check, shellcheck, secret-scan, branch policy)

**Outcome:** The task meets the Definition of Done. The one reproduced probe is the CR10-1 shape the owner deferred to task.240 (issue #771) before this run, so it is recorded as deferred work, not as a gap.

**Deviations recorded, not hidden:**

1. Read mechanically, the decision matrix makes a reproduced probe a Security FAIL. This run accepts on the owner's recorded deferral of exactly that case (same id, reproduced by gate 10 before this run). Step 8a's fix-and-recheck was not taken, because fixing the awk here would contradict that decision.
2. 5c's doc-only findings PC-4 and PC-5 were fixed in the task document and ride the acceptance commit. PC-1 and PC-2 (implementation report) are Step 8's. PC-3 (no task document for the structured pre-existing comparison) is recorded, not fixed.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-10-28T09:09Z
**Total Duration:** ~12 minutes
**CI reading 1:** SUCCESS @ `934ce5db2a2d` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated: `status: accepted`, DoD section, Change Log row (1.3)
- ✅ Task registry row ticked (`registry-tick.js`)
- ✅ Sprint Review summary created: `sprint-review-summary.md`
- ✅ Probe record `task.238.dod.2.security.run.json` and 11 cases files
- Outward side-effects — the PR canonical comment, the tracker comment and close/transition, the board move — fire **after** this file is committed and pushed (Step 7 publish boundary); their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here

**Next Steps:**

- Task is ready for Sprint Review and merge of PR #770
- task.240 (#771) carries CR10-1
