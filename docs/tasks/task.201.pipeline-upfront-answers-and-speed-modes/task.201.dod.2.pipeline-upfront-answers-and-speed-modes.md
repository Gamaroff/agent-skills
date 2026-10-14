# Definition of Done Verification

**Story/Task:** task.201.pipeline-upfront-answers-and-speed-modes
**Verification Started:** 2026-10-11T04:57:51Z

Run 2 — after run 1 (`task.201.dod.1`) found one gap (AC10 unpinned) and the pipeline re-entered QA
at 5a. Every criterion is verified afresh; run 1's verdict is not inherited.

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report:** `task.201.qa.6.pipeline-upfront-answers-and-speed-modes.md`
**Gate File:** `task.201.gate.6.pipeline-upfront-answers-and-speed-modes.yml`
**Gate Status:** ✅ PASS — **Quality Score:** 100/100 (6 cycles; gate 5 FAIL on the AC10 scan, fixed in cycle 5)
**NFR (gate 6):** Security PASS (reasoned, no boundary in the cycle-6 change set), Performance PASS, Reliability PASS, Maintainability PASS
**Immediate actions:** none. **Future:** 2 low advisory findings on the AC10 scan population; test 3c temp dir; pre-existing develop-bug-step-0 block.
**PR review (5c):** `task.201.pr-review.2` — CONCERNS: PC-1 (medium/medium) the AC10 scan omits the hand-authored `develop-bug-step-0-resolve-bug.md`; PC-2/PC-3 low.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL — 11/12 PASS, AC10 FAIL
**PR Status:** OPEN (PR #632)
**PR Review Decision:** null — the host requires no reviews; satisfied by `task.201.pr-review.2` (CONCERNS)

| AC | Status | Code | Test (runs per PR) |
| --- | --- | --- | --- |
| AC1 No flags → unchanged | ✅ | `shared/resources/pipeline-answers.js:466` | `pipeline-answers.test.mjs:90` (2a) |
| AC2 `--defaults` → zero questions, sources shown | ✅ | `develop-pipeline-step-0-resolve-and-prepare.md:748` | `pipeline-answers.test.mjs:53` (1a); docs 2b |
| AC3 Contradicting flag asked | ✅ | `pipeline-answers.js:275` | `pipeline-answers.test.mjs:127` (3a–3e) |
| AC4 `--skip` outside allow-list refused | ✅ | `pipeline-answers.js:428` | `pipeline-answers.test.mjs:187` (4a) |
| AC5 Skip → WAIVED; DoD shows it | ✅ | `pipeline-answers.js:666` | `pipeline-answers.test.mjs:304` (6a–6e); docs 3a/3b |
| AC6 No floor step skippable | ✅ | `pipeline-answers.js:60` | `pipeline-answers.test.mjs:210` (4c) |
| AC7 Resume reuses persisted answers | ✅ | `develop-pipeline-step-0-resolve-and-prepare.md:299` | `pipeline-answers.test.mjs:344` (7a–7c); `advance-pipeline-lock.test.sh` |
| AC8 Step 2 skipped on a current review | ✅ | `review-report-freshness.js:443` | `review-report-freshness.test.mjs:909` (7a–7h) |
| AC9 ISO timestamp per step | ✅ | `implementation-report-template.md:67` | `pipeline-answers-docs.test.mjs:92` (1a/1b) |
| AC10 No consumer names; limits from `skills-config.yaml` | ❌ | `develop-pipeline-step-0-resolve-and-prepare.md:712` | see below |
| AC11 bundle clean; `npm run ci` green | ✅ | `package.json:24` | CI on `a1008634`: test, validate, shellcheck pass (box unticked in the document) |
| AC12 develop-next/batch no longer restate questions | ✅ | `skills/develop-next/SKILL.md:126` | `orchestrator-directive-branch-literal.test.mjs:142` |

**AC10 — three gaps:**

1. **Mis-cited holder.** The task's criterion row and the generic test's header cite "`pipeline-answers-docs.test.mjs` 4a/4g" for the limits half. Docs 4a asserts the Step 2 blob hash, and that file has no 4g. The engine half is really `pipeline-answers.test.mjs` 4a (`:187`) and 4g (`:239`).
2. **The config read is unpinned.** No test asserts that §0d reads `develop.defaultMode` / `develop.skippable` through `read_nested_config_key` (`step-0:712-713`) and passes them as `--policy-mode` / `--policy-skippable` (`:720`). A literal in their place would stay green.
3. **One changed shipped file is unscanned.** The name scan's population omits the hand-authored `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`, which task.201 changed (0 hits today).

**Documentation:** CHANGELOG `[Unreleased]` cites task.201 (`CHANGELOG.md:9`) ✅; configuration reference ✅; workflows doc ✅; skill files ✅.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

- **No hardcoded secrets introduced:** ✅ — grep over the 10 changed JS/MJS/SH files, no hit
- **No new unsafe patterns:** ✅ — the only spawn is `execFileSync('git', ['hash-object', doc])` (`record-reviewed-blob.js:102`), with argv and no shell
- **Branch-name answers validated before reaching git:** ✅ — `pipeline-answers.js:276`, `:537`
- **Probe record and cases file beside the task:** ✅ — `task.201.dod.2.security.run.json`, `task.201.dod.2.security.cases.json`

### General Security

- **security TODOs/FIXMEs:** ✅ none
- **dependency risk:** ⚠️ NOT_APPLICABLE — no package changes

### Probe Results

**Candidates executed:** 72 (from `task.201.dod.2.security.run.json` `totals.executed`) — **reproduced:** 0

✅ **The boundary held.** Every candidate returned its expected verdict (`pipeline-answers.js#isRefName`, shell-exec sink: 61 hostile, 11 legitimate).

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None. This is developer pipeline tooling: no PII, payments, UI or PHI.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- **CHANGELOG.md updated:** ✅ `CHANGELOG.md:9` (three Added entries, one Changed)
- **API/type-specific docs updated:** ✅ `docs/reference/configuration.md:259`, `docs/operations/workflows.md:64`
- **README / architecture docs:** ⚠️ NOT_APPLICABLE

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (gate 6, 100/100)
- Acceptance Criteria: ⚠️ 11/12 (AC10)
- PR Review & Tests: ✅ pr-review.2 CONCERNS (host requires no reviews)
- CI reading 1: SUCCESS @ `a10086347444bb911c04d7973dafd3bf84d29ec9` (5 checks)
- Documentation: ✅ PASS
- Security Review: ✅ PASS (72 probes, 0 reproduced)
- Compliance Review: ⚠️ NOT_APPLICABLE

**Fix-and-recheck (8a):** refused. `finalise-fix-and-recheck.mjs` failed `severity-low` (the AC agent gave no severity), `inside-files-summary` and `mutation-proved`. The fix is a test change, so it re-enters QA at 5a.

**Outcome:**

- [ ] AC10 — the criterion row cites `pipeline-answers-docs.test.mjs` 4a/4g for the limits half; the holders are `pipeline-answers.test.mjs` 4a/4g
- [ ] AC10 — no test pins §0d reading `develop.defaultMode`/`develop.skippable` via `read_nested_config_key` and passing them as `--policy-*`
- [ ] AC10 — the consumer-name scan omits the hand-authored `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-10-11T05:01:07Z
**CI reading 1:** SUCCESS @ `a10086347444bb911c04d7973dafd3bf84d29ec9` (the decision reading — Step 6)

**Blocking Issues Summary:**

1. AC10 limits half is mis-cited and the §0d config read is unpinned
2. AC10 names half omits one hand-authored file from the scan population

**Estimated Effort to Close Gaps:** Small (one docs-test case, one population entry, one citation fix)

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted

**Next Steps:**

- Fix the three AC10 items. That is a test change, so the work re-enters QA at 5a before this verification re-runs.
