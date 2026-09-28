# Definition of Done Verification

**Story/Task:** task.150.create-task-authoring-evidence
**Verification Started:** 2026-09-28T20:02:54Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.150.qa.5.create-task-authoring-evidence.md`
**Gate File Found:** `task.150.gate.5.create-task-authoring-evidence.yml`

**Gate Status:** ✅ PASS
**Quality Score:** 100/100
**QA history:** 5 cycles. Gates 1–3 were FAIL 70 (one HIGH each, in the `--from-observation` identity mechanism). The loop escalated at cycle 3 as not converging. The operator directed a root fix in `observation-log.js` and granted 2 cycles. Gate 4 was CONCERNS 90, and gate 5 is PASS 100.
**Step 5c PR review:** ⚠️ CONCERNS (`task.150.pr-review.1.create-task-authoring-evidence.md`). No high-severity, high-confidence finding. The follow-up is CR-1 (the literal `--expect-status open` in observe-work's review Step 6 template).

**NFR Validation (gate 5):** Security ✅ PASS (measured, 22 probes, 0 reproduced) · Performance ✅ PASS · Reliability ✅ PASS · Maintainability ✅ PASS

**Immediate Actions from QA:** none
**Future Actions from QA:** CR5-1 / 5c CR-1 (the observe-work template literal), CR5-2 (§ 1.1 padded-prefix match), the carried advisory items from cycles 1–2, and the `sync-jira-* --check-card` title check (Open Question 2)

---
## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL (11/12 PASS after judgement on AC8; AC6 FAIL)
**PR Status:** OPEN (PR #512)
**PR Review Decision:** none on GitHub. The Step 5c `/review-pr` verdict is ⚠️ CONCERNS (non-blocking by the pipeline's rule)

### Acceptance Criteria

- **AC1** over-bound title → one `title-too-long` naming the H1; exit 0, and 1 under `--strict`: ✅ PASS. Code `shared/resources/jira-sync.js:1959`. Test `shared/resources/tests/card-preflight.test.mjs:665`
- **AC2** legacy-title ratchet: ✅ PASS. `card-preflight-corpus.test.mjs:104`, `:112`
- **AC3** section-scoped rules: ✅ PASS. `skills/create-task/SKILL.md:483`, `tests/create-task-authoring-evidence.test.js:134`
- **AC4** the seed refuses non-open entries, gives `title: null` over the bound, and its park vectors are engine-accepted: ✅ PASS. `skills/create-task/scripts/lib.js:308`, `skills/create-task/tests/from-observation.test.js:182`
- **AC5** offline, with no network or `gh`: ✅ PASS (grep; the only child processes are local engine CLIs)
- **AC6** the corpus ratchet adds one frontmatter parse per document to a walk that already reads each file: ❌ **FAIL**. As built, the ratchet is a separate test with its own `taskCardDocuments()` walk and a second `readFileSync` per document (`card-preflight-corpus.test.mjs:113`, `:124`). It does not join the existing label-only walk (`:69-78`)
- **AC7** mutation table recorded: ✅ PASS (implementation report, Step 3 table)
- **AC8** `CARD_TITLE_MAX` defined once: ✅ PASS **by judgement**. The criterion's own verification, `git grep -n 'CARD_TITLE_MAX *=' -- shared skills`, returns only `shared/resources/jira-sync.js:1950` and its generated copies. The agent recorded FAIL because no *test* pins the rule, which the criterion does not require. That is carried as a follow-up, not as a gap
- **AC9** `ci:fast`, `bundle:check` and `validate` clean: ✅ PASS
- **AC10** CHANGELOG cites task 150 and the five obs ids: ✅ PASS. `CHANGELOG.md:137`
- **AC11** the preflight contract documents the finding: ✅ PASS. `shared/resources/authoring-card-preflight.md:33`
- **AC12** the task.123 hand run is recorded: ✅ PASS (implementation report, "Behavioural evidence")

**Agent summary:** 10 of 12 PASS with per-PR evidence, with 2 FAIL for want of a test. On the criteria as written, AC8 holds (its grep holds) and AC6 does not.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ❌ FAIL (one low-severity finding, reproduced by execution)

- **No hardcoded secrets introduced:** ✅ PASS
- **No new unsafe patterns:** ✅ PASS. The only `exec(` hits are `RegExp.prototype.exec`, and tests spawn `process.execPath` with argv and never through a shell
- **Title bound fails open on YAML block-scalar and BOM-prefixed frontmatter:** ❌ FAIL (low). `checkCardTitle` reads the title through the line-based `parseFrontmatter` (`shared/resources/jira-sync.js:230`). A folded (`>-`) or literal (`|`) title reads as its 2-character indicator, and a UTF-8 BOM before the fence yields no frontmatter at all. Either way a title over 100 characters raises no finding. The parser limitation predates this task, and the Jira summary path uses the same parser. `git grep '^title: *[>|]' -- docs` returns 0 hits.

### Probe Results

**Candidates executed:** 48 — **reproduced:** 3 (run record `docs/tasks/task.150.create-task-authoring-evidence/task.150.dod.security.run.json`)

- a folded-scalar title (199 characters after folding): expected **rejected**, got **accepted**
- a literal-scalar title (150 characters): expected **rejected**, got **accepted**
- a 368-character title behind a BOM: expected **rejected**, got **accepted**

Controls: `setStatusGuard` (16), `expectFlagScope` (10) and `seedSelection` (9) engage, with 0 reproduced and 0 overblocked. `preflightTitle` (13) is present-but-inert on the 3 inputs above.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE. The change is internal skill tooling, with no personal data, payment, UI or health surface. GDPR, PCI-DSS, WCAG and HIPAA are all not applicable.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS. The CHANGELOG has four task-150 entries (`CHANGELOG.md:137-167`). The skill and contract docs are updated for create-task, review-task, observe-work, the observation-log contract and the preflight contract. The skill catalog is regenerated. No README or architecture change is needed.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (gate 5, 100/100). Step 5c review: ⚠️ CONCERNS
- Acceptance Criteria: ⚠️ 11/12 (AC6 unmet)
- PR Review & Tests: ✅ CI reading 1: SUCCESS @ `62371a0e4ace` over 5 checks (link-check, shellcheck, test, validate, branch policy)
- Documentation: ✅ PASS
- Security Review: ❌ FAIL (low; 3 probes reproduced)
- Compliance Review: ⚠️ NOT_APPLICABLE

**Blocking Issues:**

1. AC6: the corpus ratchet is a second walk that reads each task document again, and it does not add one parse to the existing walk as the criterion states
2. Security: `checkCardTitle` fails open on a folded or literal block-scalar `title:` and on BOM-prefixed frontmatter

**Fix-and-recheck (Step 8a):** not applicable. Two sections are not PASS, and the AC finding carries no agent-assigned severity. Both conditions are refusals under `finalise-fix-and-recheck-preconditions.json`.

**Outcome:**

- [ ] AC6: fold the title ratchet into the corpus test's existing walk, reading and parsing each document once for both assertions, or share one cached walk between the two tests
- [ ] Security: make `checkCardTitle` see the title a card will publish. Strip a leading BOM before the frontmatter fence, and refuse (or flag) a block-scalar `title:` rather than measuring its indicator. Add the three probe inputs as tests

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-09-28T20:07:11Z
**CI reading 1:** SUCCESS @ `62371a0e4ace` over 5 checks (the decision reading; no acceptance commit was made, so there is no reading 2)

**Blocking Issues Summary:**

1. AC6: the ratchet re-walks and re-reads each document (criterion unmet as written)
2. Security (low): the title bound fails open on block-scalar and BOM-prefixed frontmatter (3 probes reproduced)

**Estimated Effort to Close Gaps:** Small (1–2 hours). One shared walk in the corpus test, a BOM strip and a block-scalar refusal in the title check, and tests for the three inputs.

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted (Step 8.5)

**Next Steps:**

- Close the two gaps, then re-run `/finalise`
- Follow-ups (not gaps): a single-definition test for `CARD_TITLE_MAX` (AC8), and the observe-work Step 6 template's literal `--expect-status open` (5c CR-1)
