# Definition of Done Verification

**Bug:** bug.19.registry-tick-malformed-row-reported-as-no-row (general bug — `docs/bugs/bug.19.registry-tick-malformed-row-reported-as-no-row/`)
**Verification Started:** 2026-10-14
**PR:** [#652](https://github.com/Gamaroff/agent-skills/pull/652) → `develop`, head `2187e98f69c8` (source `branch`). PR #651, the first fix, merged as `97e56a7a`. This run verifies #651 plus #652 together.
**Mode:** `/finalise --bug` — fix-evidence DoD for a bug report. A bug has no acceptance criteria, carries no Change Log (`document-change-log.md` §Exclusions), and closes through its own lifecycle in `develop-bug` Step 7 Part B; the story/task-shaped steps are skipped by the mode, not by judgement (see the skip table in `SKILL.md` § "What bug mode runs and skips"). Every check below was verified against disk in this run, not inherited.

---

## Step 1: QA Report Review

**QA Reports:** no `bug.19.qa.*.md`, no gate, no implementation report: the bug was fixed on plain branches, not through `/develop-bug`. The QA record is the bug file's `#### QA Verification`. Iteration 1 is `✅ Fixed` on `97e56a7a`, then `Reopened` by DoD run 1 (4 gaps). Iteration 2 closes those gaps, and its QA Verification is filled by this run. The PR review is `bug.19.pr-review.1.…md` on #652, verdict ⚠️ CONCERNS: 2 medium code findings and 2 conformance findings, all four fixed in `2187e98f`.

---

## Step 2: Fix Evidence (the bug's "acceptance criteria")

**Overall:** ✅ PASS

#### Expected behaviour — "A row the parser rejects is reported as a rejected row — a distinct reason carrying the parser's own reason and line — never as `no-row`; a plain-title + document-column registry parses."

**Status:** ✅ PASS
- Code evidence: `shared/resources/registry-tick.js:324-336` (`row-malformed`, #651); `skills/develop-next/scripts/select-next.mjs:970` (`resolveDocCell`), `:1002-1015` (`registryDir`), `:1017` (`outsideRepo`), `:1227-1230` (document column read), `:1241-1246` (title-link containment)
- Test evidence: `shared/resources/tests/registry-tick.test.mjs:1124,1149,1177,1191`; `evals/develop-next/unit/select-next.test.mjs:3078-3172` (#651), `:3216,3228,3248,3264,3285` (#652). Both globs are in `package.json` `test`; `test.yml` runs `npm test` on every pull request
- Executed evidence: `npm test` 5446 pass / 0 fail at `2187e98f`; PR #652 CI `test` pass (4m6s)

#### Regression test fails without the fix, passes with it

**Status:** ✅ PASS
- Iteration 1: four mutations, plus a re-run on `97e56a7a`. Iteration 2: three `resolveDocCell` mutations. Review fixes: CR-2 and CR-1, one mutation each. Every one turned its test red and was restored. All are recorded in the bug file's Fix Implementation and QA Verification sections

#### The guard's stated scope matches its scanned scope

**Status:** ⚠️ NOT_APPLICABLE
- No test that scans a set of files was added. `DOC_CELL_REFUSED` is a fixed table of cases.

#### Bundled copies match the source

**Status:** ✅ PASS
- `bundle_skill.py --check` at `2187e98f`: 129 skills, 0 problems. #652 touches no `shared/resources/` file.

#### Suite + lint green

**Status:** ✅ PASS
- PR #652 CI 5/5 SUCCESS at `2187e98f` (`test` runs `format:check` and `npm test`)

### Documentation

- **Bug report fix record**: ✅ PASS — Iterations 1 and 2 each have Investigation, Fix Implementation and QA Verification. Iteration 2's QA Verification reads `✅ Fixed`, written by this run
- **Status History**: ✅ PASS — every transition recorded
- **Change Log**: ⚠️ NOT_APPLICABLE — bug reports carry `## Status History`, never a Change Log; count of `## Change Log` in the bug file = 0. ✅ as required.
- **Review report**: ✅ PASS — `bug.19.pr-review.1.registry-tick-malformed-row-reported-as-no-row.md` (⚠️ CONCERNS; every finding fixed in `2187e98f`). No `/review-bug` report exists
- **Implementation report**: ⚠️ NOT_APPLICABLE — the fix was not made through `/develop-bug`
- **Behaviour docs**: ✅ PASS — `roadmap-selection.md:115-125`, `finalise/SKILL.md:1253,2332`, `develop-next/SKILL.md:629`, `develop-batch/SKILL.md:615`
- **CHANGELOG.md**: ✅ PASS — `[Unreleased]` → Fixed, `(bug 19)` at `CHANGELOG.md:229`

---

## Step 3: Security Review

**Story Type:** bug — Node CLI selector (`select-next.mjs`) + `registry-tick.js`
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `skills/develop-next/scripts/select-next.mjs:970`. The changed files contain no secret assignments

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: `skills/develop-next/scripts/select-next.mjs:970`. No `eval`/`exec`/`spawn`. `resolveDocCell` refuses before any path is opened. `registry-tick.js`'s new branches only report or decline

### General Security

- **security TODOs/FIXMEs**: ✅ PASS — none
- **dependency risk**: ⚠️ NOT_APPLICABLE — no `package.json` change

### Probe Results

**Candidates executed:** 18 — **reproduced:** 0

✅ **The boundary held** — every candidate returned its expected verdict (11 hostile refused, 7 legitimate resolved).

- Entry: `skills/develop-next/scripts/select-next.mjs#resolveDocCell`, `--args-json '["docs/tasks/task-registry.md"]'`, cases `bug.19.dod.2.security.cases.json`, record `bug.19.dod.2.security.run.json` (`totals: {executed: 18, reproduced: 0}`)
- Probe run by /finalise — the security agent could not execute it (its JS entry form writes a `mkdtemp` sandbox, and the agent is read-only). Its `probe mode executed no candidates` check was dropped once the record was in, per finalise Step 3b
- Mutation check: with the absolute-path refusal removed, the same cases reproduce 3 (`present-but-inert`). The probe can see a regression

**Agent summary:** boundary identified (`resolveDocCell`, plus title-link containment in `parseRegistry`); static checks pass; the probe, run by /finalise from the agent's command, held.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** none — internal registry tooling; no personal data, payments, UI or health data

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS (see Step 2 → Documentation). `CHANGELOG.md` `[Unreleased]` → Fixed cites `(bug 19)` and covers #651 and #652. The bug registry row flips to `closed` in Part B.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

- QA record: ✅ Iteration 2 `#### QA Verification`: `✅ Fixed` at `2187e98f`
- Fix evidence: ✅ 4/4 applicable checks
- PR review: ✅ no host review is required (`reviewDecision` null). The co-located `bug.19.pr-review.1.…md` reads ⚠️ CONCERNS, an accepted verdict, and every finding is fixed in `2187e98f`
- Documentation: ✅
- Security: ✅ (probe 18/0)
- Compliance: ⚠️ N/A
- **CI rollup on `2187e98f69c8`:** validate, link-check, shellcheck, test (4m6s), branch guard: all SUCCESS → `SUCCESS` over 5 checks

**Outcome:** the fix meets every applicable Definition of Done criterion on a CI-green head. Accepted. DoD run 1's four gaps are closed (see `bug.19.dod.1.…md`).

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-10-14T05:34Z
**CI reading 1:** SUCCESS @ `2187e98f69c8` over 5 checks (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ This DoD summary (committed and pushed at 6a)
- ✅ Bug report: Status History row `DoD verified — bug.19.dod.2.registry-tick-malformed-row-reported-as-no-row.md` (6a); Resolution Summary + `status: closed` are written by develop-bug Step 7 Part B, after this skill returns
- Outward side-effects — the PR canonical comment, the tracker comment and close, the board move — fire **after** this file is committed and pushed (Step 7 publish boundary); their outcomes are recorded on the PR canonical comment and in the implementation report, not here
- — Sprint Review summary: not generated — a bug fix is reported through its Resolution Summary and the registry, not a sprint-review artifact (bug mode skip)
- — Change Log row: not written — forbidden for a bug report (bug mode skip)
- — Task registry tick: `not-a-task` (a bug run; the bug registry / parent Bug Reports table is written in Part B)

**Next Steps:**

- develop-bug Step 7 Part B: Resolution Summary, `status: closed`, final Status History row, parent linkage / registry row
