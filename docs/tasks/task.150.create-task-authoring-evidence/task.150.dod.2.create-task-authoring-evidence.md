# Definition of Done Verification

**Story/Task:** task.150.create-task-authoring-evidence
**Verification Started:** 2026-09-28T20:17:38Z
**Run:** 2. It re-verifies after `task.150.dod.1` identified 2 gaps, which the operator closed in `4f48ebe3`. Every criterion is verified afresh; nothing is inherited from run 1.

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report:** `task.150.qa.5.create-task-authoring-evidence.md` · **Gate:** `task.150.gate.5.create-task-authoring-evidence.yml` (✅ PASS, 100/100)
**Step 5c PR review:** ⚠️ CONCERNS (`task.150.pr-review.1.create-task-authoring-evidence.md`). No finding is both high severity and high confidence
**NFR (gate 5):** Security ✅ PASS (measured, 22 probes) · Performance ✅ · Reliability ✅ · Maintainability ✅
**Since gate 5:** the `dod.1` gap fix `4f48ebe3` (the corpus test's single walk; the block-scalar and BOM title findings), verified by `ci:fast` (4397 pass / 0 fail) and 4 mutation proofs. No QA cycle ran over it, so this run's agents are its independent review.

---
## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL (11/12; AC8 FAIL)
**PR Status:** OPEN (PR #512) · **PR Review Decision:** none on GitHub; the Step 5c `/review-pr` verdict is ⚠️ CONCERNS

- AC1 ✅ `shared/resources/jira-sync.js:1969` / `card-preflight.test.mjs:676` (plus the run-2 block-scalar :762/:770 and BOM :778 tests)
- AC2 ✅ corpus ratchet `card-preflight-corpus.test.mjs:124` / `:131`
- AC3 ✅ `skills/create-task/SKILL.md:483` / `tests/create-task-authoring-evidence.test.js:122`
- AC4 ✅ `skills/create-task/scripts/lib.js:338` / `skills/create-task/tests/from-observation.test.js:182`, with engine round trips at :373 and :423
- AC5 ✅ offline (grep; only local child processes)
- AC6 ✅ **the run-1 gap is closed**: `corpus()` is memoised, and `card-preflight-corpus.test.mjs:208` asserts one walk and one read per document
- AC7 ✅ mutation table (implementation report :86-104, plus the gap-fix proofs)
- AC8 ❌ **FAIL**: `CARD_TITLE_MAX` is defined once today (`git grep -n 'CARD_TITLE_MAX *=' -- shared skills` returns only `shared/resources/jira-sync.js:1950` and its generated copies), but no test pins the single definition. Run 1 passed this by judgement. This run applies the citation rule, and it fails
- AC9 ✅ `ci:fast` 4397/0; `validate` and `bundle:check` pass on the PR
- AC10 ✅ `CHANGELOG.md:137-163` · AC11 ✅ `shared/resources/authoring-card-preflight.md:33` · AC12 ✅ (implementation report :106-108)

---

## Step 3: Security Review

**Overall Security Status:** ❌ FAIL (low; 7 probes reproduced)

- No hardcoded secrets ✅ · No new unsafe patterns ✅ · Security TODOs ✅ · Dependency risk N/A

### Probe Results

**Candidates executed:** 84 — **reproduced:** 7 (run record `docs/tasks/task.150.create-task-authoring-evidence/task.150.dod.2.security.run.json`)

`seedFromObservations` (28 cases), the `set-status --expect-status` / `ambiguous-id` guard (16) and the rule that only `set-status` accepts `--expect-status` (13) all engage, with 0 reproduced. The title check closes run 1's three inputs, but fails open on 7 of 19 hostile shapes, because the line-based `parseFrontmatter` measures something other than the YAML title:

- `title: >- # name`, a block scalar with a trailing comment
- `title: !!str >-`, a tagged block scalar
- `title: &t >-`, an anchored block scalar
- `title: Short start` followed by an indented continuation (a multi-line plain scalar)
- `title:` with the value on the next line
- `title: "Short start` followed by a continuation (a multi-line double-quoted scalar)
- an indented `title: short` inside another block scalar, overwriting the real title

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE. There is no personal data, payment, UI or health surface.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS. The CHANGELOG covers all four changes, including the run-2 title codes. The skill, contract and preflight docs and the catalog are current.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

- QA gate: ✅ PASS 100 · 5c: ⚠️ CONCERNS · CI reading 1: ✅ SUCCESS @ `4f48ebe33dca` over 5 checks
- Acceptance Criteria: ⚠️ 11/12 (AC8) · Security: ❌ FAIL (low) · Compliance: N/A · Docs: ✅

**Fix-and-recheck (Step 8a):** not applicable, because two sections are not PASS.

**Outcome:**

- [ ] AC8: add a test that pins a single definition of `CARD_TITLE_MAX` (a tracked-tree scan with a non-vacuity floor; the criterion is a source-structure property)
- [ ] Security: stop measuring the title the line parser returns. Read the raw column-0 `title:` line and flag any title that is not a single-line inline scalar (block, tag, anchor, multi-line, next-line, duplicate key) as `title-not-inline`, with the seven probe inputs as tests

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-09-28T20:25:36Z
**CI reading 1:** SUCCESS @ `4f48ebe33dca` over 5 checks (no acceptance commit was made, so there is no reading 2)

**Blocking Issues Summary:**

1. AC8: no test pins the single definition of `CARD_TITLE_MAX`
2. Security (low): the title check still fails open on 7 YAML shapes the line-based parser misreads

**Estimated Effort to Close Gaps:** Small (about 1 hour)

**Artifacts Generated:**

- ✅ Gap report updated in the task document (run 2)
- ✅ PR comment posted
