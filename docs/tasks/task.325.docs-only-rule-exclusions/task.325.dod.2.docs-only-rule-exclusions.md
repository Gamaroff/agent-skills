# Definition of Done Verification

**Story/Task:** task.325.docs-only-rule-exclusions
**Verification Started:** 2026-11-26T18:11Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.325.qa.5.docs-only-rule-exclusions.md` (cycles 1–5)
**Gate File Found:** `task.325.gate.5.docs-only-rule-exclusions.yml`

**Gate Status:** ✅ PASS
**Quality Score:** 96/100 (unchanged since DoD run 1)

**Prior run:** `task.325.dod.1.docs-only-rule-exclusions.md` returned GAPS, on security only. Two `path`-sink corpus cases reproduced on `isDocsPath`: `path.encoded-traversal` and `path.symlink-escape`. They were sink mismatches for a name classifier. Task 329 (PR #956, merged) added the `git-name` sink. This branch merged develop at `6e0523417`. This run probes `isDocsPath` under that sink. The task document's run-1 gap section is superseded by this run.
**PR review (5c):** `task.325.pr-review.1.docs-only-rule-exclusions.md`, APPROVE.

**PR:** #954 (source: branch)
**Record criteria (Step 3a):** `ok`. Confirmed against the files this time: § 8's four mutations are each in `task.325.qa.1.docs-only-rule-exclusions.md:145-149` with the test they turned red. Those are: exclusion removed, order-dependent, usage errors removed (two lines), and negation moved into `glob-match.js`.
**Re-run at head:** `not-configured`.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #954)
**PR Review Decision:** null. The host requires no review. `task.325.pr-review.1.docs-only-rule-exclusions.md` reads APPROVE, which satisfies the column.
**Re-run scope:** scoped (prior-record) — 2 re-judged, 5 carried
**AC YAML:** hand-copied (unverified): `transcript-unreadable` ("the transcript holds no final assistant text"; the agent answered through its hand-back). The record `task.325.dod.2.ac.json` says `verified: false`. Before use, the merged result's `record.document` and `record.dod_n` were checked as this run's (task 325, run 2).

### Acceptance Criteria

#### #1: Every row of the § 8 table holds in a test

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `shared/resources/ci-tree-equivalence.js:188`
- Test evidence: `shared/resources/tests/ci-tree-equivalence.test.mjs:515`

#### #2: `git grep -nE 'matchesAnyGlob' -- shared/resources` shows no new caller

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `shared/resources/ci-tree-equivalence.js:200`
- Test evidence: `shared/resources/tests/ci-tree-equivalence.test.mjs:709`

#### #3: Not applicable: no bound is claimed

**Status:** ✅ PASS (re-judged: evidence-changed)

- Code evidence: `docs/tasks/task.325.docs-only-rule-exclusions/task.325.docs-only-rule-exclusions.md:274`
- Test evidence: not applicable (§ 8 Performance Tests: "Not applicable."; § 9 claims no bound). `criteria-drift.js`: clean.

#### #4: Every mutation in § 8 is recorded in the QA report with the test it turned red

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `task.325.qa.1.docs-only-rule-exclusions.md:143` (records at `:145-149`)
- Test evidence: not applicable (process criterion)

#### #5: `npm run test:remote` and `npm run bundle:check` pass

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `task.325.gate.5.docs-only-rule-exclusions.yml:62`
- Test evidence: `.github/workflows/test.yml:56`
- Note: the scope engine carried this criterion, although the develop merge moved the code. At this head, CI is SUCCESS on 6/6 checks (the same suite `ci:fast` runs). `npm run bundle:check` ran locally after the merge: 129 skills, 0 problems.

#### #6: The reference states the syntax, that an exclusion wins in any order, and the usage errors

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `docs/reference/configuration.md:308`
- Test evidence: not applicable (documentation)

#### #7: `CHANGELOG.md` `[Unreleased]` names both changes of § 5

**Status:** ✅ PASS (re-judged: evidence-changed)

- Code evidence: `CHANGELOG.md:19`, `:25`. They are still under `[Unreleased]` / `### Changed`. Task 329's entry, at `:9`, moved them.
- Test evidence: `evals/shared/tests/changelog-entry-drift.test.mjs:1`

### Advisory (not a gap)

- **#1**: the § 8 `[]` row says "accepted". readConfig already refuses an empty `patterns:`, so only the predicate answer is pinned. This fails closed.
- **#2**: the test file gains direct `matchesAnyGlob` calls. These are test pins, not readers of `ci.docsOnly.patterns`.
- **#7**: T325-CR-502 (low, deferred): "extglob" is wider than the three refused openers.
- **#5**: the scope carried a CI-state criterion across a code-moving merge (see #5's note). That is a candidate follow-up for `finalise-rerun-scope.js`.

### Documentation

- **Reference documentation for the changed `ci.docsOnly.patterns` behaviour**: ✅ PASS — `docs/reference/configuration.md:308`

**Agent summary:** 7/7 criteria PASS. #3 and #7 were re-judged at `6e0523417`, and five were carried.

**CI reading 1:** SUCCESS @ `6e0523417f034f69476ba7488cc3249da9033cb5`. 6 checks, the head's own CI (no tree-equivalence), waited 360 s.
**CI-state criteria:** none deferred (`resolve-ci`: `none-deferred`). AC_OVERALL: PASS.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/ci-tree-equivalence.js:188`. A grep of the added lines of `.claude/state/pr-diff-954.diff` for credential literals found none.

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: `shared/resources/ci-tree-equivalence.js:603`. No `eval(`, `exec(`, `execSync`, `spawn` or `shell.run(` appears on an added code line.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS
- **dependency risk**: ⚠️ NOT_APPLICABLE. No `package.json` in the diff.

### Probe Results

**Candidates executed:** 40. **Reproduced:** 0.

**Not observed by this run:** what a target does with an accepted value (a remote shell, a spawned process). An accepted hostile case counts as reproduced, and a refused one as held. A clean count describes what the runner could see, not what a target does with a value it accepted.

✅ **The boundary held.** Every candidate returned its expected verdict.

- **Sink:** `isDocsPath` moved from `path` to `git-name`, by the security prompt's routing rule: it only compares git-printed names against patterns, and never opens or decodes them. The corpus control takes args `[["**"]]`. Run 1's argument `["**","!secret/**"]` is dropped, so the exclusion is covered by the three inline controls instead. `parseConfig` is labelled `git-name` too. With a cases file, the sink label does not change how the entry is called.
- **Plan:** hand-copied (unverified): `transcript-unreadable`. The three inline-case controls reference DoD run 1's committed cases files (`task.325.dod.1.security.cases.{2,3,4}.json`) by name. They are not retyped: their case ids are the ones the security agent listed (4, 3 and 11 cases), and the runner copied their bytes into `task.325.dod.2.security.cases.{2,3,4}.json`.
- **Calibration:** the `git-name` cases are known to reproduce. Task 329's mutation test (`security-probe.test.mjs`, "each isDocsPath refusal removed reproduces exactly its git-name cases") passes against this branch's `isDocsPath` at the merged head (re-run here: 1 test, 1 pass), so a removed refusal line turns its cases red.
- The probe was run by /finalise from the security agent's plan: 4 controls, record `docs/tasks/task.325.docs-only-rule-exclusions/task.325.dod.2.security.run.json` (executed 40, reproduced 0, escaped 0).

**Agent summary:** this is a boundary deliverable (`isDocsPath`, `parseConfig`). The checklist is clean. The sink changed to `git-name`, and run 1's two `path`-sink reproductions do not apply to a name classifier.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** none. GDPR, PCI-DSS, WCAG and HIPAA are all NOT_APPLICABLE.

**Agent summary:** this is an internal CI tooling change. It has no personal data, payments, UI or PHI.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:20` (and `:26`), both cite `(task 325)`

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `docs/reference/configuration.md:308`, `docs/runbooks/ci-docs-only-skip.md:200`

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE. The README links to the configuration reference, which is updated, and `docs/architecture/` holds no `docsOnly` content.

**Agent summary:** the CHANGELOG, the configuration reference and the runbook are updated. The SKILL.md edits are body-only, so the catalog needs no regeneration.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (Quality Score: 96/100, gate 5)
- Acceptance Criteria: ✅ 7/7 complete
- PR Review & Tests: ✅ the host requires no review. pr-review.1 reads APPROVE. CI SUCCESS @ `6e0523417` (6/6 checks)
- Documentation: ✅ PASS
- Security Review: ✅ PASS. 40 candidates executed under `git-name`, 0 reproduced
- Compliance Review: ⚠️ NOT_APPLICABLE

**Outcome:** the task meets all Definition of Done criteria and is ready for acceptance. Run 1's only gap was a sink mismatch, and task 329 closed it.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-26T18:15Z
**Total Duration:** 4 minutes
**CI reading 1:** SUCCESS @ `6e0523417f034f69476ba7488cc3249da9033cb5` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed. It is recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary).

**Artifacts Generated:**

- ✅ Task document updated: DoD verification section added, run 1's gap section marked superseded, `status: accepted`, § 9 criteria ticked
- ✅ Task registry row ticked
- ✅ Sprint Review summary created
- Outward side-effects (the PR canonical comment, the tracker comment and close, the board move) fire **after** this file is committed and pushed, at the Step 7 publish boundary. Their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here.

**Next Steps:**

- The task is ready for Sprint Review
- Follow-up: the scope engine carried CI-state criterion #5 across a code-moving merge
