# Definition of Done Verification

**Story/Task:** task.331.ac-merge-refuses-another-documents-result
**Verification Started:** 2026-11-27T17:52Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.331.qa.4.ac-merge-refuses-another-documents-result.md`
**Gate File Found:** `task.331.gate.4.ac-merge-refuses-another-documents-result.yml`
**Gate Status:** ✅ PASS
**Quality Score:** 95/100
**PR:** #962 (source: branch)
**PR review:** `task.331.pr-review.2.ac-merge-refuses-another-documents-result.md` — APPROVE (the host requires no review; `reviewDecision` is null)

**Prior DoD run:** `task.331.dod.1.ac-merge-refuses-another-documents-result.md` — GAPS (AC #7: the Step 3c `result-document-mismatch` arm was untested). Closed by commit `e22028a2c` and verified by QA cycle 4 and the 5c review.

**Record criteria:** `ok` — 1 record criterion (#5), its record is in `task.331.qa.1.*.md` (confirmed in run 1, unchanged).
**Re-run at head:** `not-configured`.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ PARTIAL at Step 3c (#6 deferred to CI) — re-folded at Step 6, see below
**PR Status:** OPEN (PR #962)
**PR Review Decision:** null — satisfied by `task.331.pr-review.2.*.md` (APPROVE)
**Re-run scope:** scoped (prior-record) — 4 re-judged, 4 carried
**AC YAML:** extracted from the agent's transcript (handback), 6255 bytes, sha256 `7dd0e2beb3e75bfbf10973fd1a6ba30c01c5952c866a6f3de17f282959b7b9d7`, verified by `merge`

### Acceptance Criteria

#### #1: Every row of the § 8 table holds in a finalise-rerun-scope test

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `shared/resources/finalise-rerun-scope.js:1242`
- Test evidence: `shared/resources/tests/finalise-rerun-scope.test.mjs:2328`

#### #2: Step 3c merge and Step 6 action 2a blocks, run substituted, read stem-keyed paths

**Status:** ✅ PASS

- Code evidence: `skills/finalise/SKILL.md:1063`
- Test evidence: `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs:273`; `shared/resources/tests/finalise-deferred-ci.test.mjs:453`
- Note: re-checked at head 7af1c0a27; the only change to the eval file since run 1 is the added #7 test.

#### #3: SKILL.md names every AC result and merged path with the stem

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `skills/finalise/SKILL.md:1024`
- Test evidence: `not applicable — documentation criterion`

#### #4: Performance — not applicable, no bound is claimed

**Status:** ✅ PASS

- Code evidence: `task.331.ac-merge-refuses-another-documents-result.md:333`
- Test evidence: `not applicable — no bound is claimed (§ 8 Performance Tests, :312)`
- Note: `criteria-drift.js` answered `clean`.

#### #5: Every § 8 mutation recorded in the QA report with the test it turned red

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `task.331.qa.1.ac-merge-refuses-another-documents-result.md`
- Test evidence: `not applicable — process criterion`

#### #6: `npm run test:remote` and `npm run bundle:check` pass

**Status:** ⏳ DEFERRED-CI — graded at Step 6 from CI reading 1

- Code evidence: `.github/workflows/test.yml:58`
- Test evidence: `not applicable — CI-state criterion`

#### #7: Step 3c's `case` has a `result-document-mismatch` arm that HALTs and names the remedy

**Status:** ✅ PASS (the run-1 gap)

- Code evidence: `skills/finalise/SKILL.md:1074`
- Test evidence: `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs:362`
- Note: the test runs under bash and zsh, writes a result naming `task.8.other`, runs the substituted Step 3c fence, and asserts exit 1, the engine message, the arm's own remedy text, no `merge answered` (so not the `*)` arm), and no record written. Mutation proof in QA 4: deleting the arm turned both variants red (12/14); restored 14/14. Runs per PR via `npm test` (`test.yml:58`, zsh installed at `:46`).

#### #8: `CHANGELOG.md` `[Unreleased]` names both changes of § 5

**Status:** ✅ PASS (carried from the prior run)

- Code evidence: `CHANGELOG.md`
- Test evidence: `not applicable — documentation criterion`

### Advisory (not a gap)

None.

### Documentation

- **Skill file updated where behaviour changed**: ✅ PASS — `skills/finalise/SKILL.md:1074`

**Agent summary:** Re-judged #2, #4 and #7 pass; #7's arm is now reached by a per-PR bash/zsh eval test with a recorded mutation proof. #6 deferred to CI; carried #1, #3, #5 and #8 stay PASS.

**CI-state criteria:** #6 → PASS (CI reading 1: SUCCESS @ `7af1c0a2705e`) — AC_OVERALL re-folded: PASS

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/finalise-rerun-scope.js:734`

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: `shared/resources/finalise-rerun-scope.js:751`
- Note: `sameDocument` uses only `path.resolve` and `fs.realpathSync` and fails closed. The only change since run 1 is test-only.

### boundary: internal reason valid against the disqualified-entries table

**Status:** ✅ PASS
- Evidence: `task.331.gate.4.ac-merge-refuses-another-documents-result.yml:31`

### General Security

- **security TODOs/FIXMEs**: ✅ PASS
- **dependency risk**: ⚠️ NOT_APPLICABLE — `package.json` not in the diff

### Probe Results

⚠️ **Internal artefact — not probeable by the engine**: `shared/resources/finalise-rerun-scope.js#main` — the merge subcommand's refusals (`result-document-mismatch` and `scope-document-mismatch`, decided by the module-private `sameDocument` and `storyFileOf`) read only this pipeline's own artefacts: the AC agent YAML that /finalise extracts from its own subagent transcript, the scope JSON that Step 3a wrote, and the `--doc` path that Step 3c substitutes; no corpus sink models these documents. A recorded decision, not the zero-guard.

### Recommendations for the owner

These are not security findings, and they do not count against the verdict above.

- **Spec challenge:** `an AC result whose ac_traceability has no story_file` — allowed by `task.331.ac-merge-refuses-another-documents-result.md:111`. Such a result merges without the document check (`finalise-rerun-scope.js:1241-1242`); the only guard left is the optional `--sha256`.
- **Spec challenge:** `finalise-rerun-scope.js merge` without `--doc` — allowed by `task.331.ac-merge-refuses-another-documents-result.md:121`. A caller that leaves out `--doc` skips the `scope-document-mismatch` check (`:1218-1221`). Gate 3 CR-4 recommends making `--doc` required.

**Agent summary:** PASS. Boundary recorded as internal (every input is pipeline-written; no sink fits). No secrets, unsafe calls, security TODOs or new dependencies. Since run 1 the delta is test-only.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

**Agent summary:** No compliance area applies: PR #962 changes only internal skill tooling, with no personal data, payments, UI or health data.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:20`

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `skills/finalise/SKILL.md:1038`
- Note: body-only SKILL.md edits; no catalog regeneration needed.

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE

**Agent summary:** CHANGELOG entry present; SKILL.md Step 3c documents the new refusals and stem-keyed paths; README and architecture docs not affected.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (gate 4, Quality Score 95/100, no open issues)
- Acceptance Criteria: ✅ 8/8 (4 re-judged, 4 carried; #6 graded from CI reading 1)
- PR Review & Tests: ✅ `task.331.pr-review.2.*.md` APPROVE (host requires no review)
- CI: ✅ CI reading 1: SUCCESS @ `7af1c0a2705e` over 6 checks (link-check, secret-scan, shellcheck, test, validate, branch check)
- Documentation: ✅ PASS
- Security Review: ✅ PASS (boundary internal, reason valid)
- Compliance Review: ⚠️ NOT_APPLICABLE (counts as pass)

**Outcome:** Task meets all Definition of Done criteria. The run-1 gap (#7) is closed.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-27T17:55Z
**Total Duration:** 3 minutes
**CI reading 1:** SUCCESS @ `7af1c0a2705e573582d6cfcb55a5befdc274996c` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section
- ✅ Sprint Review summary created
- Outward side-effects — the PR canonical comment, the tracker comment and close, the board move — fire **after** this file is committed and pushed (Step 7 publish boundary); their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here

**Next Steps:**

- Task is ready for Sprint Review
- No further action required
