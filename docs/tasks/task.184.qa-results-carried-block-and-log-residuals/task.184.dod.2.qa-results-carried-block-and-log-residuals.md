# Definition of Done Verification

**Story/Task:** task.184.qa-results-carried-block-and-log-residuals
**Verification Started:** 2026-10-13T14:50Z
**Run:** 2 — after DoD run 1 (`task.184.dod.1`) found two gaps, closed in `5ab4839a` and `3e7abe6f`, and QA cycle 5 re-entered at 5a

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Report Found:** `task.184.qa.5.qa-results-carried-block-and-log-residuals.md`
**Gate File Found:** `task.184.gate.5.qa-results-carried-block-and-log-residuals.yml`

**Gate Status:** ✅ PASS
**Quality Score:** 100/100

**Phases (from QA):** 4/4 verified; 110 targeted tests pass; `npm run ci:fast` exit 0.

**NFR Validation (from QA):**

- Security: ✅ PASS (reasoned; no code since gate 4)
- Performance: ✅ PASS (idle re-measure — 9 of 10 runs under 2 s, median 1.14 s)
- Reliability: ✅ PASS
- Maintainability: ✅ PASS

**Immediate Actions from QA:** None
**Future Actions from QA:** 5 (gate 4's four cleanups, and the CHANGELOG drift test's branch coverage)

**Step 5c:** `task.184.pr-review.2` — ✅ APPROVE (PC-1, PC-2 low).

**Prior-run blocks:** DoD run 1's `## Definition of Done - Gaps Identified` section is in the document body; it is superseded by this run and verified afresh, not inherited.

**PR:** #644 (source: branch)

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL (agent) — 10/11; AC5 FAIL "re-measure" (see Step 5)
**PR Status:** OPEN (PR #644)
**PR Review Decision:** null (single-maintainer repo) — satisfied by `task.184.pr-review.2.qa-results-carried-block-and-log-residuals.md` (✅ APPROVE)

### Acceptance Criteria

#### AC1: CR-1 nested shape keeps [a], [b] once across three writes, `replaced`

**Status:** ✅ PASS

- Code evidence: `shared/resources/qa-results.js:304`
- Test evidence: `shared/resources/tests/qa-results.test.mjs:1271` (R5, per PR via `npm test`)

#### AC2: CR-2 both variants refused `unbounded`, `structural-line:`, byte-identical

**Status:** ✅ PASS

- Code evidence: `shared/resources/qa-results.js:667`
- Test evidence: `shared/resources/tests/qa-results.test.mjs:1287` (R6, per PR)

#### AC3: CR3-2 shape refused with the exact detail; G1 REL-004 still `replaced`

**Status:** ✅ PASS

- Code evidence: `shared/resources/qa-results.js:668`
- Test evidence: `shared/resources/tests/qa-results.test.mjs:1211` (R3) and `:335` (G1), per PR

#### AC4: CR6-1 refused `carried-tail:- [b](./b.md)`, byte-identical; R4 unchanged

**Status:** ✅ PASS

- Code evidence: `shared/resources/qa-results.js:796`
- Test evidence: `shared/resources/tests/qa-results.test.mjs:1310` (R7, per PR)

#### AC5: Engine, wiring and corpus suites under 2 s, `uptime` beside the figure, re-measured at finalise

**Status:** ❌ FAIL (agent) — measured criterion
- Code evidence: `task.184.qa-results-carried-block-and-log-residuals.md:448` — the figure was taken on `5ab4839a`, not the PR head `17abc500`, and one of ten runs (4.13 s) missed the bound
- Test evidence: `NOT_APPLICABLE: measured criterion`
- Note: re-measure — see Step 5

#### AC6: No network access (one `require(`, of `./change-log.js`)

**Status:** ✅ PASS

- Code evidence: `shared/resources/qa-results.js:89`; `grep -c 'require('` → 1
- Test evidence: `NOT_APPLICABLE: documentation criterion`

#### AC7: Corpus write survey 0 / 0 / 0

**Status:** ✅ PASS

- Test evidence: `tests/qa-results-corpus.test.js:238` (per PR)

#### AC8: R5, R6, R7 each mutation-proved, each result recorded

**Status:** ✅ PASS

- Code evidence: implementation report `:82`–`:85` (M1, M2a, M2b, M3)
- Test evidence: `NOT_APPLICABLE: documentation criterion`

#### AC9: `ci:fast`, `bundle:check`, `validate` qa-task / qa-story clean

**Status:** ✅ PASS

- Evidence: `test` and `validate` lanes green on `17abc500` (runs 38414848196, 38414848186)

#### AC10: CHANGELOG `[Unreleased]` cites `(task 184)`; task 183 says "directly under a sub-label"

**Status:** ✅ PASS

- Code evidence: `CHANGELOG.md:118` (under `[Unreleased]` → `### Fixed`); `CHANGELOG.md:944`
- Test evidence: `evals/shared/tests/changelog-entry-drift.test.mjs:237` (post-merge guard)

#### AC11: Seven task.183 passages amended, one task.183 Change Log row

**Status:** ✅ PASS

- Code evidence: `task.183…md:472` (row) and the seven mapped passages
- Test evidence: `NOT_APPLICABLE: documentation criterion`

### Documentation

- **CHANGELOG entry under [Unreleased] → Fixed**: ✅ PASS — `CHANGELOG.md:118`
- **QA skills' Step 12 hint and prose name `carried-tail:`**: ✅ PASS — `skills/qa-task/SKILL.md:1508`
- **Detail vocabulary comment**: ✅ PASS — `shared/resources/qa-results.js:36`
- **Bundled copies regenerated**: ✅ PASS — `bundle_skill.py --check` green on `17abc500`
- **task.183 wording corrected**: ✅ PASS

**Agent summary:** 10 of 11 criteria pass with per-PR evidence; AC5 needs a measurement on the head commit.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/qa-results.js:89`

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: `shared/resources/qa-results.js:585` (RegExp `.exec`, not a shell); no code changed since gate 4 (`9c5547be`)

### General Security

- **security TODOs/FIXMEs**: ✅ PASS
- **dependency risk**: ⚠️ NOT_APPLICABLE — no `package.json` change

### Probe Results

⚠️ **Internal artefact — not probeable by the engine**: `shared/resources/qa-results.js#upsertQaResults` judges a work-item document and the `## QA Testing Results` section Step 12 renders, both artefacts this pipeline writes; `markdown-structure` models the implementation report only, and the disqualified-entries table lists only `report-lint.js#lintReport`. A recorded decision, not the zero-guard. Matches DoD run 1 and QA gates 1–5.

**Agent summary:** Pure Markdown section writer; no secrets, no shell or eval, no dependency change; code unchanged since gate 4.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

**Agent summary:** Internal engine refactor; no personal data, payment, UI or health data surface.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:118` — under `## [Unreleased]` → `### Fixed`; run 1's placement gap is fixed

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `skills/qa-task/SKILL.md:1508`, `:1526`; `skills/qa-story/SKILL.md:2018`, `:2036`

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE

**Agent summary:** CHANGELOG entry now under `[Unreleased]`; both QA skills document `carried-tail:`.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED — with one recorded human override (AC5)

**Summary:**

- QA Report: ✅ PASS (Quality Score: 100/100, gate 5)
- Acceptance Criteria: ✅ 10/11 by evidence; AC5 by recorded override (below)
- PR Review & Tests: ✅ `task.184.pr-review.2` APPROVE (reviewDecision null — single-maintainer repo); CI green on `17abc500`
- Documentation: ✅ PASS
- Security Review: ✅ PASS (`boundary: internal`, reason holds)
- Compliance Review: ⚠️ NOT_APPLICABLE

**AC5 — human override (operator decision, 2026-10-13).** The AC agent failed AC5 with `re-measure`: the
recorded timings were taken on `5ab4839a`, not the PR head, and one of ten runs (4.13 s) missed the bound.
Re-measured on head `17abc500` (ten runs, `time -p`, `uptime` load beside each), every run took 5.38–5.98 s.
That is not the code. The host CPU is pinned at its 800 MHz minimum on every core even under load
(`/proc/cpuinfo` during a run; `scaling_max_freq` 4.8 GHz; `package_throttle_count` 177,490). A plain
`3e8`-iteration loop took 14.74 s. Measured back to back under the same throttling, head and `5ab4839a` are
equal: 5.53/5.64/5.56 s against 5.92/5.56/5.88 s. The code on `17abc500` is byte-identical to `5ab4839a`
(`git diff 5ab4839a 17abc500 -- shared/ skills/ tests/` is empty). That commit ran 1.08–1.62 s (median 1.14 s,
nine of ten under 2 s) at 12:42Z, before the throttling began. Literal compliance with "measured on the head
commit" is also structurally impossible for a committed record, because committing the record moves the
head. The operator accepted AC5 on this evidence.

**Outcome:** Story meets the Definition of Done, with the AC5 override above recorded as a deviation.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-10-13T16:17Z
**Total Duration:** ~1 h 35 m (including two waits for an idle host)
**CI reading 1:** SUCCESS @ `17abc5003ce2` over 5 checks (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with the DoD verification section; run 1's gaps section marked historical
- ✅ Sprint Review summary created
- Outward side-effects — the PR canonical comment, the tracker comment and close, the board move — fire **after** this file is committed and pushed (Step 7 publish boundary); their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here

**Next Steps:**

- Task is ready for merge
- Follow-up: the measured-criterion rule cannot be met literally by a committed record (see AC5)
