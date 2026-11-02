# Definition of Done Verification

**Story/Task:** task.246 — Wireframe mapping setup offer and first-run candidates
**Verification Started:** 2026-10-30

---

## Verification Results

_DoD results are appended below in four consolidated sections after the parallel agents complete._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.246.qa.4.wireframe-mapping-setup-offer.md`
**Gate File Found:** `task.246.gate.4.wireframe-mapping-setup-offer.yml`
**PR:** #793 (source: branch)

**Gate Status:** ✅ PASS
**Quality Score:** 100/100
**QA cycles:** 4 (gate.1–gate.4); bugs 1–5 all closed

**Success Criteria Coverage (from QA):** all functional and code-quality criteria PASS (qa.4 § Success Criteria Verification)

**NFR Validation (from QA):**

- Security: ✅ PASS (`configure` value guard probed in cycle 3: 17 executed, 0 escaped)
- Performance: ✅ PASS
- Reliability: ✅ PASS
- Maintainability: ✅ PASS

**Immediate Actions from QA:** None
**Future Actions from QA:** TASK-246-CR4-1 (carried to gate 4 `recommendations.future` by the cosmetic-residue exit); path containment for map and catalogue paths (pre-existing)

**PR conformance review (5c):** `task.246.pr-review.1.wireframe-mapping-setup-offer.md` — APPROVE, 0 findings

**Prior DoD blocks in the document body:** none

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL (15 of 18 PASS)
**PR Status:** OPEN (PR #793)
**PR Review Decision:** null. The host requires no reviews; the 5c `/review-pr` report `task.246.pr-review.1.wireframe-mapping-setup-offer.md` stands in, verdict APPROVE.
**Re-run scope:** full (no-prior-record) — 18 re-judged, 0 carried

### Acceptance Criteria

| Criterion | Status | Code evidence | Test evidence |
| --- | --- | --- | --- |
| #1 `resolve`/`ensure`/`record` return declined and write nothing | ✅ PASS | `shared/resources/wireframe-map.js:154` | `shared/resources/tests/wireframe-map.test.mjs:1106` |
| #2 `detect` with no `ui:` → `unset` plus a proposal | ✅ PASS | `shared/resources/wireframe-map.js:1224` | `shared/resources/tests/wireframe-map.test.mjs:1155` |
| #3 `detect` writes no file in any state | ✅ PASS | `shared/resources/wireframe-map.js:1224` | `shared/resources/tests/wireframe-map.test.mjs:1584` |
| #4 `configure` appends a block, refuses `exists` | ✅ PASS | `shared/resources/wireframe-map.js:1397` | `shared/resources/tests/wireframe-map.test.mjs:1662` |
| #5 `configure --decline` → `declined` | ✅ PASS | `shared/resources/wireframe-map.js:1484` | `shared/resources/tests/wireframe-map.test.mjs:1952` |
| #6 partial block: `detect` partial, `configure` inserts the missing keys | ✅ PASS | `shared/resources/wireframe-map.js:1442` | `shared/resources/tests/wireframe-map.test.mjs:1729` |
| #7 catalogue candidates on an empty map | ✅ PASS | `shared/resources/wireframe-map.js:570` | `shared/resources/tests/wireframe-map.test.mjs:2057` |
| #8 near-miss candidates keep their earlier shape | ✅ PASS | `shared/resources/wireframe-map.js:872` | `shared/resources/tests/wireframe-map.test.mjs:2130` |
| #9 create-story / create-task step 3 run `detect` | ✅ PASS | `skills/create-story/SKILL.md:763` | `evals/shared/tests/wireframe-mapping-hooks.test.mjs:67` |
| #10 procedure defines "sets `ui.wireframeMap`" | ✅ PASS | `shared/resources/wireframe-component-mapping.md:9` | `evals/shared/tests/wireframe-mapping-hooks.test.mjs:102` |
| #11 no develop step calls `detect`/`configure`, held over `skills/develop-*/SKILL.md` | ❌ FAIL | `evals/shared/tests/wireframe-mapping-hooks.test.mjs:127` | same |
| #12 `detect` reads only its bounded set | ❌ FAIL | `shared/resources/wireframe-map.js:1013` | `shared/resources/tests/wireframe-map.test.mjs:1607` |
| #13 every new branch tested, each fix mutation-proven | ❌ FAIL | implementation report `:124` | `shared/resources/tests/wireframe-map.test.mjs:1381` |
| #14 `ci:fast`, `bundle:check`, `prettier --check` | ✅ PASS | `.github/workflows/test.yml:55` | `.github/workflows/validate.yml:128` |
| #15 `npm run validate` on create-story and create-task | ✅ PASS | `.github/workflows/validate.yml:73` | `.github/workflows/validate.yml:68` |
| #16 CHANGELOG `[Unreleased]` entries | ✅ PASS | `CHANGELOG.md:9` | `evals/shared/tests/changelog-entry-drift.test.mjs` (post-merge guard) |
| #17 `configuration.md` documents the decline and the offer | ✅ PASS | `docs/reference/configuration.md:336` | `evals/shared/tests/wireframe-mapping-hooks.test.mjs:518` |
| #18 "Writing map rows by hand" section exists and is linked | ✅ PASS | `shared/resources/wireframe-component-mapping.md:183` | NOT_APPLICABLE: documentation criterion |

**The three failures, each verified against the code by the orchestrator:**

- **#11**: The criterion says the test runs over `skills/develop-*/SKILL.md`, which matches five skills. The test hard-codes three: develop-story, develop-task and develop-bug (`wireframe-mapping-hooks.test.mjs:129`). `skills/develop-next/SKILL.md` and `skills/develop-batch/SKILL.md` are unchecked. Neither calls `detect` or `configure` today.
- **#12**: `WORKSPACES = ["packages", "libs"]` (`wireframe-map.js:1013`), but no test names `libs/`. Removing `libs`, or letting the scan reach two levels down, turns nothing red.
- **#13**: The implementation report says the cycle-3 fill-before-insert order "was not separately mutated". The fix has a test, but no recorded mutation proof.

### Advisory (not a gap)

- **#13**: CR4-1 (`wireframe-map.js:1457`) is a QA-verified low. It is carried in gate 4 `recommendations.future`.
- **#12**: `barrelExports` (`wireframe-map.js:671-672`) follows `export * from` targets transitively, so `detect` reads more than the criterion's list. Those are modules the chosen barrel names.

### Documentation

- **Authoring skill files updated (create-story 5.4.6, create-task 2.6)**: ✅ PASS — `skills/create-task/SKILL.md:512`
- **Shared procedure: step 0 setup and the row-writing guide**: ✅ PASS — `shared/resources/wireframe-component-mapping.md:71`
- **Configuration reference: the offer and the decline**: ✅ PASS — `docs/reference/configuration.md:347`

**Agent summary:** 15 of 18 criteria pass, all with per-PR test lanes. #11, #12 and #13 fail on test coverage.

---

## Step 3: Security Review

**Story Type:** task (local CLI config writer)
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/wireframe-map.js:130`

### No new unsafe patterns (eval / exec / child_process)

**Status:** ✅ PASS
- Evidence: `shared/resources/wireframe-map.js:1428`
- Note: the only `exec(` calls are `RegExp#exec`; nothing uses `eval`, `child_process` or `spawn`.

### Input validation on configure values

**Status:** ✅ PASS
- Evidence: `shared/resources/wireframe-map.js:1334-1350`

### General Security

- **security TODOs/FIXMEs**: ✅ PASS — none in the added lines
- **dependency risk**: ⚠️ NOT_APPLICABLE — `package.json` is unchanged

### Probe Results

**Candidates executed:** 146 — **reproduced:** 0

✅ **The boundary held.** Every candidate returned its expected verdict. Escapes 0, refusals 0.

- `/finalise` ran the probe from the security agent's plan: 10 controls, recorded in `task.246.dod.1.security.run.json`, with cases in `task.246.dod.1.security.cases.*.json`. The controls:
  - the configure value guard on each of `--map`, `--barrel`, `--catalogue`, `--import`, `--section` and `--exclude`
  - the `--map` decline-word refusal
  - `detect`'s decline reading
  - `configure`'s refusal to overwrite a decline
  - `ensure`'s write-nothing behaviour on a decline

**Agent summary:** the checklist passes. The boundary rule fired on four controls in `wireframe-map.js`, probed as ten `cli:` entries with inline cases. Path containment of the configured paths predates this PR and is not part of its contract.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

**Agent summary:** This is an internal developer-tooling change. It has no personal, payment, health or UI-rendering surface, so GDPR, PCI-DSS, WCAG and HIPAA do not apply.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:9`
- Note: there are three `(task 246)` entries under `[Unreleased]`, at :9, :23 and :35.

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `shared/resources/wireframe-component-mapping.md:183`
- Note: only the `SKILL.md` bodies changed, so the skill catalog needs no regeneration.

### README / architecture docs updated

**Status:** ✅ PASS
- Evidence: `docs/reference/configuration.md:347`

**Agent summary:** the CHANGELOG, skill and shared-resource docs, and the configuration reference are all updated.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (Quality Score: 100/100, gate.4)
- PR conformance review: ✅ APPROVE (`task.246.pr-review.1.wireframe-mapping-setup-offer.md`)
- Acceptance Criteria: ⚠️ 15/18 (#11, #12, #13 fail)
- Security Review: ✅ PASS (146 probes executed, 0 reproduced)
- Compliance Review: ⚠️ NOT_APPLICABLE
- Documentation: ✅ PASS
- **CI reading 1:** SUCCESS @ `12d6bf03f177` (6 checks)

**Blocking Issues:**

1. #11: `wireframe-mapping-hooks.test.mjs` "no develop pipeline step calls detect or configure" checks 3 of the 5 `skills/develop-*/SKILL.md` files the criterion names. develop-next and develop-batch are unchecked.
2. #12: no test holds the `libs/*` workspace bound of `detect`.
3. #13: the cycle-3 fill-before-insert order fix has no mutation proof.

**Fix-and-recheck (Step 8a):** not taken. Two of its preconditions fail:
- the gaps are three findings, not one;
- inspection found them, not execution, and none carries a severity, so the evaluator's `severity-low` precondition cannot hold.

**Outcome:** The task does NOT meet the Definition of Done. All three gaps are test-only: two need a new or widened test, and one needs a recorded mutation proof. They change code outside the work item's directory, so the fix re-enters QA at 5a before `/finalise` re-runs.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-10-30
**CI reading 1:** SUCCESS @ `12d6bf03f177` (the decision reading — Step 6)

**Blocking Issues Summary:**

1. #11: the hooks test skips `skills/develop-next/SKILL.md` and `skills/develop-batch/SKILL.md`.
2. #12: no test covers the `libs/*` workspace scan.
3. #13: the cycle-3 fill-before-insert order fix is not mutation-proven.

**Estimated Effort to Close Gaps:** Small (under an hour; test-only)

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted

**Next Steps:**

- Close the three gaps: widen the hooks test to every `skills/develop-*/SKILL.md`, add a `libs/*` case to the bounded-set test, and mutation-prove the fill-before-insert order.
- A gap closed by changing code re-enters QA before this verification re-runs. A document-only fix (documentation under `ci.docsOnly.patterns`, such as a CHANGELOG entry) re-runs it directly.
- Re-run verification once the fixes are in.
