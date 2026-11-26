# Definition of Done Verification

**Story/Task:** task.325.docs-only-rule-exclusions
**Verification Started:** 2026-11-26T12:58Z

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Reports:** `task.325.qa.1` – `task.325.qa.5.docs-only-rule-exclusions.md`
**Gate File:** `task.325.gate.5.docs-only-rule-exclusions.yml`

**Gate Status:** ✅ PASS
**Quality Score:** 96/100
**Head judged:** `3a2d45cd9`. The PR head `e950beb7f` adds only docs on top of it.

**Immediate Actions from QA:** none.
**Future Actions from QA:** 4 items:
- T325-CR-501 (low): bracketed-literal refusal advice. Route 2b.
- T325-CR-502 (low): the CHANGELOG says "extglob". Route 2b.
- Pre-existing: `isDocsPath` accepts percent-encoded and symlinked names.
- Pre-existing: Step 4b zero-blocks-executed on `skills/finalise/SKILL.md`.

**PR review (Step 5c):** `task.325.pr-review.1.docs-only-rule-exclusions.md`, ✅ APPROVE. Two LOW conformance findings (PC-1, PC-2), both fixed in the task document.

**PR:** #954 (source: branch)

**Record criteria:** `ok`. Criterion #4's record is confirmed in `task.325.qa.1` lines 143–149.
**Re-run at head:** `not-configured`. `finalise.rerunAtHead` is unset.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #954)
**PR Review Decision:** null. The host requires no review. The newest co-located `task.325.pr-review.1.docs-only-rule-exclusions.md` reads APPROVE, so it satisfies the column.
**Re-run scope:** full (no-prior-record). 7 re-judged, 0 carried.
**AC YAML:** hand-copied, unverified. The transcript was unreadable: "the transcript holds no final assistant text". `AC_SHA256` is empty.

### Acceptance Criteria

#### #1: Every row of the § 8 table holds in a test

**Status:** ✅ PASS

- Code evidence: `shared/resources/ci-tree-equivalence.js:188`
- Test evidence: `shared/resources/tests/ci-tree-equivalence.test.mjs:515`
- Note: all 8 rows are covered (push-policy `:152`, readConfig `:585`/`:587`, `[]` `:553`, no-`!` `:541`, glob-match `:709`). The suites run per PR.

#### #2: `git grep matchesAnyGlob -- shared/resources` shows no new caller

**Status:** ✅ PASS

- Code evidence: `shared/resources/ci-tree-equivalence.js:200`
- Test evidence: `shared/resources/tests/ci-tree-equivalence.test.mjs:709`

#### #3: Not applicable: no bound is claimed

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.325.docs-only-rule-exclusions/task.325.docs-only-rule-exclusions.md:274`
- Test evidence: `NOT_APPLICABLE: no performance bound is claimed`

#### #4: Every mutation in § 8 is recorded in the QA report with the test it turned red

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.325.docs-only-rule-exclusions/task.325.qa.1.docs-only-rule-exclusions.md:143`
- Test evidence: `NOT_APPLICABLE: process criterion`. All four mutations are at qa.1:145–149.

#### #5: `npm run test:remote` and `npm run bundle:check` pass

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.325.docs-only-rule-exclusions/task.325.gate.5.docs-only-rule-exclusions.yml:62`
- Test evidence: `.github/workflows/test.yml:56`
- Note: ci:fast at `3a2d45cd9` ran 8906 tests with 0 failed. The head is tree-equivalent. bundle:check at HEAD reports 0 problems.

#### #6: The reference states the syntax, the any-order rule, and the usage errors

**Status:** ✅ PASS

- Code evidence: `docs/reference/configuration.md:308`
- Test evidence: `NOT_APPLICABLE: documentation criterion`

#### #7: `CHANGELOG.md` `[Unreleased]` names both changes of § 5

**Status:** ✅ PASS

- Code evidence: `CHANGELOG.md:9`
- Test evidence: `evals/shared/tests/changelog-entry-drift.test.mjs:1`

### Advisory (not a gap)

- **#1**: the § 8 `[]` row says "accepted". readConfig already refuses an empty `patterns:`. Only the predicate answer is pinned. This fails closed.
- **#2**: the test file gains direct `matchesAnyGlob` calls. These are pins, not readers of `ci.docsOnly.patterns`.
- **#7**: T325-CR-502 (low, deferred): "extglob" is wider than the three refused openers.

### Documentation

- **Reference and runbook describe the exclusion**: ✅ PASS, `docs/reference/configuration.md:308`

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ❌ FAIL

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/ci-tree-equivalence.js:181`

### No new unsafe patterns (eval/exec/shell.run)

**Status:** ✅ PASS
- Evidence: `shared/resources/ci-tree-equivalence.js:188`

### General Security

- **security TODOs/FIXMEs**: ✅ PASS
- **dependency risk**: ⚠️ NOT_APPLICABLE. No `package.json` in the diff.

### Probe Results

**Candidates executed:** 29. **Reproduced:** 2.

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process). An accepted hostile case counts as reproduced and a refused one as held. A clean count describes what the runner could see, not what a target does with a value it accepted.

- `..%2f..%2fetc%2fpasswd`: expected **rejected**, got **accepted**. Corpus case `0:path.encoded-traversal`, severity **low**, pre-existing: origin/develop accepts it too. `isDocsPath` is a string predicate over git-form names. It never decodes. **Deferral matcher:** `no-match`, because there is no `deferrals.json` beside the work item.
- `uploads/link-to-etc/passwd`: expected **rejected**, got **accepted**. Corpus case `0:path.symlink-escape`, severity **low**, pre-existing. `isDocsPath` never resolves the filesystem. **Deferral matcher:** `no-match`, because there is no `deferrals.json` beside the work item.

The 15 inline cases (controls 2–4) all held. Each carries a `spec_ref`. Item 3a exempts the two reproductions, because they are corpus cases.

- The probe was run by /finalise from the security agent's plan: 4 controls, record `docs/tasks/task.325.docs-only-rule-exclusions/task.325.dod.1.security.run.json`.
- The plan was hand-copied, unverified, because the transcript was unreadable: "the transcript holds no final assistant text".

**Fix-and-recheck:** refused (`finalise-fix-and-recheck.mjs` exit 1) on three preconditions:
- `inside-files-summary`: no code fix exists.
- `mutation-proved`
- `no-other-finding-open`: two probes are open.

**Agent summary:** this is a boundary deliverable. The checklist passes. Two corpus path-sink cases reproduce. Both are pre-existing, and both are sink mismatches for a name classifier.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** none. The change is internal CI tooling, with no user data, payments, UI or PHI.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:9`

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `docs/reference/configuration.md:308`

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED: GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (96/100)
- Acceptance Criteria: ✅ 7/7
- PR Review & Tests: ✅ pr-review.1 APPROVE. CI reading 1: SUCCESS @ `e950beb7f` (6 of 6 checks)
- Documentation: ✅ PASS
- Security Review: ❌ FAIL. 2 reproduced probes, not deferred.
- Compliance Review: ⚠️ NOT_APPLICABLE

**CI reading 1:** SUCCESS @ `e950beb7f0435580aeb7c9a386b0e3f0c2702441`

**Blocking Issues:**

1. Security probe `0:path.encoded-traversal` reproduced on `isDocsPath`. It is low and pre-existing, with no owner deferral (`no-match`).
2. Security probe `0:path.symlink-escape` reproduced on `isDocsPath`. It is low and pre-existing, with no owner deferral (`no-match`).

**Outcome:** the task does not meet the Definition of Done. The work itself passes. The only gap is two corpus probes that `develop` already fails and that the owner has not deferred.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-11-26T13:04Z
**Total Duration:** 6 minutes

**Blocking Issues Summary:**

1. Security probe `0:path.encoded-traversal`: no owner deferral
2. Security probe `0:path.symlink-escape`: no owner deferral

**Estimated Effort to Close Gaps:** Small. The owner writes `deferrals.json`, naming a follow-up task, and re-runs `/finalise`.

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ PR comment posted

**Next Steps:**

- The owner either defers both cases to a follow-up task in `deferrals.json` beside the task, or fixes the corpus/sink fit.
- Re-run `/finalise`. This is a document-only change, so it does not re-enter QA. dod.2 can reuse `task.325.dod.1.security.plan.json`.
