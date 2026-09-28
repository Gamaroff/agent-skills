# Definition of Done Verification

**Story/Task:** task.150.create-task-authoring-evidence
**Verification Started:** 2026-09-28T20:40:28Z
**Run:** 3. It re-verifies after `task.150.dod.2` identified 2 gaps, which the operator closed in `48d023a1` + `ef3bf4ea`. Every criterion is verified afresh; nothing is inherited from runs 1 or 2.

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report:** `task.150.qa.5.create-task-authoring-evidence.md` · **Gate:** `task.150.gate.5.create-task-authoring-evidence.yml` (✅ PASS, 100/100)
**Step 5c PR review:** ⚠️ CONCERNS (`task.150.pr-review.1.create-task-authoring-evidence.md`). No finding is both high severity and high confidence
**NFR (gate 5):** Security ✅ PASS (measured, 22 probes) · Performance ✅ · Reliability ✅ · Maintainability ✅
**Since gate 5:** two operator-directed gap fixes. `4f48ebe3` closed dod.1's gaps. `48d023a1` + `ef3bf4ea` closed dod.2's: a raw-header title reader (`title-not-inline`) and a single-definition test for `CARD_TITLE_MAX`. `48d023a1` was pushed with `ci:fast` red (a comment-only `shared/resources` reference); `ef3bf4ea` fixed it, and `ci:fast` is 4399 pass / 0 fail. No QA cycle ran over these fixes, so this run's agents are their independent review.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (12/12)
**PR Status:** OPEN (PR #512) · **PR Review Decision:** none on GitHub; the Step 5c `/review-pr` verdict is ⚠️ CONCERNS, with no finding both high severity and high confidence

- AC1 ✅ `shared/resources/jira-sync.js:2023` / `card-preflight.test.mjs:676`. The run-2 gap is closed: `readCardTitle` reads the raw header, and `:805` covers 7 non-inline shapes
- AC2 ✅ `card-preflight-corpus.test.mjs:123` / `:131`. There are 43 legacy ids, and "long" is decided by `lib.checkCardTitle`
- AC3 ✅ `skills/create-task/SKILL.md:483` / `tests/create-task-authoring-evidence.test.js:122`
- AC4 ✅ `skills/create-task/scripts/lib.js:338` / `skills/create-task/tests/from-observation.test.js:182`. Real-engine round trips at `:373` and `:423`
- AC5 ✅ offline, confirmed by inspection and execution. The only subprocesses are a local CLI and `git grep`
- AC6 ✅ `card-preflight-corpus.test.mjs:208`: one walk, and one read per document
- AC7 ✅ mutation table (implementation report `:86-104`, plus the gap-fix proofs)
- AC8 ✅ **the run-2 gap is closed**: `card-preflight.test.mjs:851` pins a single tracked definition with `git grep` (the source plus the generated copies)
- AC9 ✅ the `test`, `validate`, `shellcheck` and `link-check` checks pass on `c454d8a8`. Locally, `bundle:check` reports 0 problems and `quick_validate` passes
- AC10 ✅ `CHANGELOG.md:137`, `:151` and `:158` (all five observation ids)
- AC11 ✅ `shared/resources/authoring-card-preflight.md:33`
- AC12 ✅ implementation report `:108`

**Agent summary:** 12/12 pass with code evidence and tests that run on every PR (52/52 locally). Both run-2 gaps are closed.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS, after the Step 8a fix (`ab057653`). The first reading was ❌ FAIL: 2 low-severity checks, shown below.

- **No hardcoded secrets**: ✅ PASS. `CARD_TITLE_MAX` is the only new literal assignment
- **No new unsafe patterns**: ✅ PASS. The only new process call is `execFileSync("git", argv)`, with no shell
- **Title boundary (preflight → `readCardTitle`)**: ❌ FAIL at first, low severity. 7/47 hostile documents passed with a 169-character title. There were three causes:
  - an indented `---` ended the header early, while the sync reads on to the column-0 fence;
  - an opening `--- # comment` or `----` was read as no header at all;
  - a quoted, explicit `? title` or `<<:` merge key was never measured.
  Fixed in `ab057653`; see the recheck below.
- **Corpus ratchet (the only blocking title gate)**: ❌ FAIL at first, low severity. 13/46 passed. The ratchet read the line-parsed title with no raw text, and counted only `title-too-long`. Fixed in `ab057653`.
- **`--from-observation` seed**: ✅ PASS, engages 27/27
- **`set-status` ambiguous-id / `--expect-status`**: ✅ PASS, engages 21/21
- **General**: no security TODOs. Dependency risk does not apply, because the package files are unchanged

### Probe Results

**First reading (the agent):** 141 candidates executed, 20 reproduced (7 preflight + 13 ratchet), all low severity. The failure mode was fail-open on an advisory, cosmetic card-title length bound.

**Step 8a recheck on `ab057653`:** the two title controls were re-run with the engine against the fixed tree. Each ran 32 cases: the 20 reproduced shapes, 3 earlier shapes and the 3 new ones added in the unit test (hostile), plus 9 legitimate headers. The rebuilt adapter and cases are kept at `.claude/state/t150-8a-probe-{adapter.mjs,cases.json}`.
- `preflightTitle`: engages, 32 executed, 0 reproduced, 0 over-blocked
- `corpusRatchetTitle`: engages, 32 executed, 0 reproduced, 0 over-blocked
- Record `task.150.dod.3.security.run.json`: `totals.executed` 112, `reproduced` 0, and all 4 controls engage. The superseded pre-fix title controls were removed from the record; their figures are stated above.

✅ **The boundary held** on the fix head: every candidate returned its expected verdict.

**Agent summary:** it was a boundary deliverable. The seed and `set-status` guards engage. The title check and the ratchet failed open on 20 shapes before the fix, and engage after it.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None. GDPR, PCI-DSS, WCAG and HIPAA are all not applicable: the change is internal developer tooling with no personal, payment or health data, and no UI. "Card" means a tracker card.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

- **CHANGELOG.md**: ✅ `CHANGELOG.md:137`. There are four task 150 entries under `[Unreleased]`
- **Skill and contract docs**: ✅ `skills/create-task/SKILL.md:178` (§ 1.1), `authoring-card-preflight.md:34` and `observation-log-contract.md:413-414`. `ab057653` extends the preflight contract with the added shapes
- **README / catalog**: ✅ `README.md:62` points to the regenerated `docs/reference/skill-catalog.md:109`

---

**Deviations recorded, not hidden:**

1. The security fix (`ab057653`) landed during `/finalise`, after the QA loop exited at 5c. It was verified inline rather than by a further QA cycle or an independent reviewer:
   - fast gate: 4402 tests, 4401 pass, 0 fail;
   - mutation proof: `card-preflight.test.mjs` "a header the sync and YAML could read differently…" goes red when `jira-sync.js` is reverted, and the `card-preflight-corpus.test.mjs` "non-inline shape" fixture goes red when the ratchet is given no raw text;
   - the section's reproduction re-run: `security-probe.mjs` against both title controls, 32 cases each, 0 reproduced.

   The other three DoD sections were not re-run. The fix touched only `shared/resources/jira-sync.js`, the two card-preflight test files, `authoring-card-preflight.md` and their 26 generated `references/` copies. All of these are inside the Files Summary, and those sections were evaluated against a tree those paths did not change in any way they read.
2. The fix-and-recheck preconditions all held. `finalise-fix-and-recheck.mjs` exited 0 before the commit, and again with `--git-base c454d8a8` after it. The record is at `.claude/state/finalise-fix-finding.json`.
3. The original probe adapter was deleted with the agent's scratch space, so the recheck ran a rebuilt adapter over a rebuilt case set: the 20 reproduced inputs, taken verbatim from the agent's YAML, plus 12 more. It did not rerun the agent's exact 93 title candidates. Both are kept at `.claude/state/t150-8a-probe-*`.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (gate 5, 100/100)
- Acceptance Criteria: ✅ 12/12
- PR Review & Tests: ⚠️ no GitHub review; this is a solo repository. The Step 5c `/review-pr` verdict is CONCERNS with no high+high finding; tests pass per PR
- Documentation: ✅ PASS
- Security Review: ✅ PASS after the Step 8a fix-and-recheck. The first reading was FAIL (20 low-severity reproductions)
- Compliance Review: ⚠️ NOT_APPLICABLE
- CI reading 1: SUCCESS @ `c454d8a8` (5 checks). CI reading 1 on the fix head: SUCCESS @ `ab057653` (5 checks: test, validate, shellcheck, link-check, branch check)

**Outcome:** The task meets the Definition of Done.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-09-28T21:00:37Z
**CI reading 1:** SUCCESS @ `ab057653` (the acceptance decision, taken on the fix head; Step 8a.3)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed. It is recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated: `status: accepted`, a Change Log row (1.2) and the DoD section
- ✅ Task registry row ticked
- ✅ Sprint Review summary created
- The outward side-effects fire **after** this file is committed and pushed: the PR canonical comment, the tracker comment and close, and the board move. Their outcomes are recorded on the PR comment and in the implementation report.

**Next Steps:**

- The task is ready for merge and Sprint Review
