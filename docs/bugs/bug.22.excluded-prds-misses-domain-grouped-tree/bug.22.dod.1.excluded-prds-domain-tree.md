# Definition of Done Verification

**Bug:** bug.22.excluded-prds-misses-domain-grouped-tree (general bug — `docs/bugs/bug.22.excluded-prds-misses-domain-grouped-tree`)
**Verification Started:** 2026-11-14T07:33Z (the push that opened this run; the exact start was not recorded)
**PR:** [#904](https://github.com/Gamaroff/agent-skills/pull/904) → `develop`, head `49488869ff5a`
**Mode:** `/finalise --bug` — fix-evidence DoD for a bug report. A bug has no acceptance criteria, carries no Change Log (`document-change-log.md` §Exclusions), and closes through its own lifecycle in `develop-bug` Step 7 Part B; the story/task-shaped steps are skipped by the mode, not by judgement (see the skip table in `SKILL.md` § "What bug mode runs and skips"). Every check below was verified against disk in this run, not inherited. **The four DoD checks were run inline by the orchestrating session, not by four parallel Explore subagents: independent review did not run.**

---

## Step 1: QA Report Review

**QA Reports:** none — a bug directory carries no gate file; the develop-bug verify loop is the QA record: 1 cycle in `bug.22.implementation.1.excluded-prds-domain-tree.md` §Verify Cycle 1, PASS, with the bug file's `#### QA Verification` on Iteration 1 reading `✅ Fixed`. Lite mode (Minor / Medium): signals 1 (regression test) and 2 (suite) ran; the diff code review did not.

---

## Step 2: Fix Evidence (the bug's "acceptance criteria")

**Overall:** ✅ PASS

#### Expected behaviour — "an `excludedPrds` entry naming a PRD folder (`prd.1.multi-game-web-portal`) excludes that PRD's stories"

**Status:** ✅ PASS
- Code evidence: `skills/qa-next/scripts/uat-status.mjs:245` `isExcluded` matches the first segment or any segment `isPrdFolder` (`:232`) recognises through `doc-id.parse` / `parseLegacy`; called from `scanStories` at `:266`.
- Test evidence: `evals/qa-next/unit/uat-status.test.mjs:2924`, which runs in the `npm test` suite (`evals/qa-next/unit/*.test.mjs` is in `test:suite`), so it runs per PR.
- Executed evidence: `node --test evals/qa-next/unit/uat-status.test.mjs tests/doc-id-chokepoint.test.js` — 99 pass, 0 fail; `npm run test:remote` (`ci:fast`) rc=0.

#### Regression test fails without the fix, passes with it

**Status:** ✅ PASS
- Before the fix the new test failed on the PRD-folder assertion (`1.1.1` still listed). With the match reverted to first-segment only (`i === 0 && isPrdFolder(seg) !== null`) it failed again on the same assertion; restoring the fix turned it green. Recorded in the bug's Fix Implementation and Verify Cycle 1.

#### The guard's stated scope matches its scanned scope

**Status:** ⚠️ NOT_APPLICABLE
- The fix adds no guard or scanning test. The doc-id chokepoint test (`tests/doc-id-chokepoint.test.js`) was re-run and passes: the fix reads ids through `doc-id.js` and adds no id regex.

#### Bundled copies match the source

**Status:** ⚠️ NOT_APPLICABLE
- No `shared/resources/` file changed; `uat-status.mjs` is a source file, not a bundled copy. `bundle:check` reads `SUCCESS` in the PR's `validate` lane.

#### Suite + lint green

**Status:** ✅ PASS
- `npm run test:remote` (`ci:fast`: `format:check` + `npm test`) rc=0 on `6e7c64e8`; the head `49488869` adds one CHANGELOG entry, and Prettier checks it clean.

### Documentation

- **Bug report fix record**: ✅ PASS — Investigation and Fix Implementation and QA Verification filled for Iteration 1; no template placeholder remains in the Developer Fix Cycle.
- **Status History**: ✅ PASS — 5 rows, every transition recorded (this run's `DoD verified` row follows at 6a).
- **Change Log**: ⚠️ NOT_APPLICABLE — bug reports carry `## Status History`, never a Change Log; count of `## Change Log` in the bug file = 0. ✅ as required.
- **Review report**: ✅ PASS — `bug.22.review.1.fix-readiness.md` (READY TO FIX 9/10).
- **Implementation report**: ✅ PASS — `bug.22.implementation.1.excluded-prds-domain-tree.md`; Pipeline Progress through Step 5–6; Verify Cycle 1 entry; lints clean.
- **Behaviour docs**: ✅ PASS — `skills/qa-next/README.md` step 2 ("list superseded PRD directories under `excludedPrds`") and `SKILL.md:65` already state the behaviour the fix delivers; neither restates the first-segment rule, so neither changes.

---

## Step 3: Security Review

**Story Type:** bug — a path-segment match in a local Node CLI that reads the owner's own `uat-surfaces.json`
**Overall Security Status:** ⚠️ NOT_APPLICABLE

`boundary: false` — the deliverable is an include/exclude filter over the owner's own story tree, not a predicate, validator or allow/deny list that guards an input from an untrusted source, so probe mode did not fire. No credentials, no shell, no network, no file writes in the changed code; `isExcluded` only compares strings.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** none — no user data, no UI, no persistence, no third-party service

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS (see Step 2 → Documentation). `changelog.enforce` is on; `changelog-cites.sh bug.22` answers `not-applicable: bug.22 is not a task — 6d cites tasks only`, and a `(bug 22)` entry was added under `## [Unreleased]` → `### Fixed` regardless (commit `49488869`), as bug 21 and bug 19 have. `docs/bugs/bug-registry.md` row 22 flips to `closed` in Part B.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

- QA record: ✅ verify loop PASS (cycle 1 of 5)
- Fix evidence: ✅ 3/3 applicable criteria (2 not applicable)
- PR review: — no human review (autonomous run; the merge gate is `npm run ci` on the PR branch plus the CI rollup)
- Documentation: ✅
- Security: ⚠️ N/A
- Compliance: ⚠️ N/A
- **CI rollup on `49488869ff5a`:** SUCCESS over 6 checks — `PR into main comes from an allowed branch`, `link-check`, `secret-scan`, `shellcheck`, `test`, `validate` all SUCCESS, read on the PR head `49488869ff5a`.

**Outcome:** the fix meets every applicable Definition of Done criterion on a CI-green head. Accepted.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-14T07:40Z
**CI reading 1:** SUCCESS @ `49488869ff5a` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ This DoD summary (committed and pushed at 6a)
- ✅ Bug report: Status History row `DoD verified — bug.22.dod.1.excluded-prds-domain-tree.md` (6a); Resolution Summary + `status: closed` are written by develop-bug Step 7 Part B, after this skill returns
- Outward side-effects — the PR canonical comment, the tracker comment and close, the board move — fire **after** this file is committed and pushed (Step 7 publish boundary); their outcomes are recorded on the PR canonical comment and in the implementation report, not here
- — Sprint Review summary: not generated — a bug fix is reported through its Resolution Summary and the registry, not a sprint-review artifact (bug mode skip)
- — Change Log row: not written — forbidden for a bug report (bug mode skip)
- — Task registry tick: `not-a-task` (a bug run; the bug registry row is written in Part B)

**Next Steps:**

- develop-bug Step 7 Part B: Resolution Summary, `status: closed`, final Status History row, registry row
