# Definition of Done Verification

**Story/Task:** task.242.scope-finalise-re-runs
**Verification Started:** 2026-10-29T11:10Z

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ⚠️

**QA Report Found:** `task.242.qa.10.scope-finalise-re-runs.md`
**Gate File Found:** `task.242.gate.10.scope-finalise-re-runs.yml` (head `1ee28b5b`)
**PR:** #781 (source: branch)

**Gate Status:** ⚠️ CONCERNS
**Quality Score:** 90/100

**Open issue (from QA):** TASK-242-QA10-1 (medium): a path citation written with `./`, a leading `/`, backslashes or a `#L` anchor resolves to nothing. **Accepted by the operator on 2026-10-29 as a known limit** (develop-task halt option 2) and recorded in task § 3 *Citation paths*. The QA loop's granted budget (10 gates) was spent with gate 10.

**NFR Validation (from QA):**

- Security: ✅ PASS (`boundary: false`)
- Performance: ✅ PASS
- Reliability: ⚠️ CONCERNS (QA10-1, accepted limit)
- Maintainability: ✅ PASS

**PR review (Step 5c):** ✅ APPROVE — `task.242.pr-review.1.scope-finalise-re-runs.md` (2 low findings, both doc-only, fixed in the task document)

**Future actions from QA:** fix a test comment that names the wrong fixture file (code-review CR-2, cleanup).

**Prior DoD blocks in the body:** none.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #781)
**PR Review Decision:** null (the host requires no reviews). The "Tests & PR Approved?" column is satisfied by the Step 5c report `task.242.pr-review.1.scope-finalise-re-runs.md` (verdict ✅ APPROVE)
**Re-run scope:** full (no-prior-record) — 13 re-judged, 0 carried

### Acceptance Criteria

#### SC-1: scope returns full for each full reason, each pinned by a test

**Status:** ✅ PASS

- Code evidence: `shared/resources/finalise-rerun-scope.js:297`
- Test evidence: `shared/resources/tests/finalise-rerun-scope.test.mjs:223`
- Note: each of `no-prior-record` (:223), `prior-unreadable` (:239), `reopened` (:260), `head-not-ancestor` (:287) and the added `no-criteria` (:301) has its own temp-repo test. The suite runs per PR via `npm test`; 52/52 locally.

#### SC-2: six per-criterion scope reasons pinned; id-less `#N` ids match by hash

**Status:** ✅ PASS

- Code evidence: `shared/resources/finalise-rerun-scope.js:357`
- Test evidence: `shared/resources/tests/finalise-rerun-scope.test.mjs:321`
- Note: `new-criterion`, `criterion-changed` (:341), `reported-gap` (:359), `evidence-changed` (:373), `evidence-unresolved` (:419), `unchanged` (:321); id-less task (:482) and story (:521) fixtures.

#### SC-3: task.239 replay

**Status:** ✅ PASS

- Code evidence: `shared/resources/finalise-rerun-scope.js:507`
- Test evidence: `shared/resources/tests/finalise-rerun-scope.test.mjs:681`
- Note: the scope replay (:681) and the merge replay (:708). SC-11 PASS, G5 restored, G7 advisory and uncounted.

#### SC-4: merge restores carried status and citations; a differing verdict goes to advisories

**Status:** ✅ PASS

- Code evidence: `shared/resources/finalise-rerun-scope.js:689`
- Test evidence: `shared/resources/tests/finalise-rerun-scope.test.mjs:1609`
- Note: "agent returns FAIL" (:1609) and "agent omits it" (:1633).

#### SC-5: merge recomputes overall from the merged acs and docs

**Status:** ✅ PASS

- Code evidence: `shared/resources/finalise-rerun-scope.js:466`
- Test evidence: `shared/resources/tests/finalise-rerun-scope.test.mjs:1682`

#### SC-6: Step 3a runs scope; Step 3c runs merge and writes the AC record

**Status:** ✅ PASS

- Code evidence: `skills/finalise/SKILL.md:507`
- Test evidence: `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:1184`
- Note: `finalise-rerun-scope-blocks.test.mjs:161` also executes the real blocks. This run exercised both on itself, and wrote `task.242.dod.1.ac.json`.

#### SC-7: the AC prompt's Step 0 reads `<RERUN_SCOPE>`; the Step 3 heading is byte-identical

**Status:** ✅ PASS

- Code evidence: `shared/resources/finalise-dod-ac-prompt.md:16`
- Test evidence: `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:1131`

#### SC-8: the DoD Step 2 block carries the scope line and the advisory list

**Status:** ✅ PASS

- Code evidence: `skills/finalise/SKILL.md:784`
- Test evidence: `evals/shared/tests/finalise-dod-prompt-contract.test.mjs:1229`

#### SC-9: the bug-mode table carries the `rerun-scope` skip marker; the test goes red without it

**Status:** ✅ PASS

- Code evidence: `skills/finalise/SKILL.md:102`
- Test evidence: `evals/shared/tests/finalise-bug-mode.test.mjs:139`
- Note: red-without-marker proof is M28 in the implementation report.

#### SC-10: performance not applicable

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.242.scope-finalise-re-runs/task.242.scope-finalise-re-runs.md:279`
- Test evidence: `NOT_APPLICABLE — § 8 states no performance bound`

#### SC-11: each § 8 guard mutation-proved

**Status:** ✅ PASS

- Code evidence: `docs/tasks/task.242.scope-finalise-re-runs/task.242.implementation.1.scope-finalise-re-runs-initial-run.md:98`
- Test evidence: `shared/resources/tests/finalise-rerun-scope.test.mjs:1862`
- Note: every guard in § 8's closed list maps to a mutation row (M1–M28) naming the test that went red. Each QA fix cycle added its own proofs.

#### SC-12: `ci:fast` and `bundle:check` pass on the PR head

**Status:** ✅ PASS

- Code evidence: `package.json:25`
- Test evidence: `.github/workflows/test.yml:55`
- Note: CI on `ba663028`: `test` (format:check + npm test) and `validate` (bundle check) both green. Locally on `1ee28b5b`, the one failing test (doc-links) failed on targets not yet committed; it passes 31/31 on the head.

#### SC-13: the CHANGELOG [Unreleased] entry

**Status:** ✅ PASS

- Code evidence: `CHANGELOG.md:9`
- Test evidence: `evals/shared/tests/changelog-entry-drift.test.mjs:1`
- Note: cites `(task 242)`, says the first run after upgrade is `full` (`no-prior-record`), and names the forced-full escape.

### Advisory (not a gap)

- **SC-1**: Known limit QA10-1, accepted by the operator and recorded in task § 3. A citation written with `./`, a leading `/`, backslashes or a `#L` anchor does not resolve. Outside every criterion's stated scope.

### Documentation

- **Skill file updated where behaviour changed**: ✅ PASS — `skills/finalise/SKILL.md:489`
- **AC prompt updated (shared source and bundled copies)**: ✅ PASS — `shared/resources/finalise-dod-ac-prompt.md:16`

**Agent summary:** 13/13 criteria PASS. Each behaviour criterion has code and per-PR tests (engine 52/52, contract 97/97 locally), the PR head is CI-green, SC-10 is explicitly N/A, and SC-13's CHANGELOG text matches.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/finalise-rerun-scope.js:33-40`
- Note: only Node built-ins and two local modules. No credential, token or connection string in the engine, the changed SKILL.md blocks or the tests.

### No new unsafe patterns (eval / exec / shell)

**Status:** ✅ PASS
- Evidence: `shared/resources/finalise-rerun-scope.js:222-228`
- Note: git runs through `execFileSync` with an argv array and no shell. A prior record's head must be 40 hex characters before it reaches git's argv. No eval, no `Function`, no `shell: true`.

### Caller-supplied write path (`--record-out`)

**Status:** ✅ PASS
- Evidence: `shared/resources/finalise-rerun-scope.js:905-914`
- Note: the only caller builds the path from its own document directory, `STEM` and `DOD_N`, and its block refuses empty or unsubstituted inputs first. The write happens only on `merged`; probe entry 2 confirmed this.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS — none in the changed files
- **dependency risk**: ⚠️ NOT_APPLICABLE — `package.json` unchanged; no new package

### Probe Results

**Candidates executed:** 17 — **reproduced:** 0

✅ **The boundary held** — every candidate returned its expected verdict.

- Probe run by /finalise from the security agent's plan — 2 control(s) (`finalise-rerun-scope.js#isReopened` against Step 2's reopen rule: 10 cases; the `merge` CLI's no-record-on-unparseable-answer guard: 7 cases), record `docs/tasks/task.242.scope-finalise-re-runs/task.242.dod.1.security.run.json`. Escapes: 0. Refusals: 0.
- `boundary: true` here, where QA gates 1–10 recorded `boundary: false`: the agent read `scope()`'s carry verdict and `isReopened` as classifiers under the probe rule. Reported unreachable by any engine form, so they rest on the 52 unit tests: scope's carry/re-judge classification (needs committed repository state), `resolveCitation` (takes a Set/Map argument), and merge's carried-verdict restoration (visible only in `--json` stdout). Not probed and not a finding: a duplicate `ac_id` in the agent's YAML resolves last-wins (`finalise-rerun-scope.js:673`).

**Agent summary:** The checklist passes with citations. Two controls were probed (17 candidates) and none reproduced. `--record-out` is a write path the caller builds, not a boundary.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

### GDPR / PCI-DSS / WCAG / HIPAA

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: an internal change to /finalise tooling. No personal data (the only email-like string is a `user.email=t@t` placeholder in temp-repo test fixtures), no payments, no UI, no health data. The AC record holds commit heads, criterion hashes, verdicts and file citations only.

**Agent summary:** No compliance area applies.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:9`
- Note: `(task 242)` under `## [Unreleased]` / `### Changed`. Covers the AC record, `scope`/`merge`, the advisory listing, the first run after upgrade being `full`, the forced-full escape, and bug mode being unchanged.

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `skills/finalise/SKILL.md:488`
- Note: SKILL.md documents the re-run scope step and the `rerun-scope` bug-mode row. Shared resources and bundled copies are updated. Frontmatter is unchanged, so the catalog needs no regeneration.

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE
- No citation found
- Note: no public API, config key, CLI command or catalog entry changed.

**Agent summary:** The CHANGELOG entry and the finalise docs are in place. README and architecture docs need no change.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ⚠️ CONCERNS (quality score 90/100). The one open medium, TASK-242-QA10-1, was accepted by the operator on 2026-10-29 as a known limit and is recorded in task § 3. Judged non-blocking: no success criterion covers path normalisation, no committed record uses the affected shapes, and the gate's own condition is "fixed and re-reviewed, **or accepted as a recorded limit**"
- Acceptance Criteria: ✅ 13/13 (full run, no prior record)
- PR Review & Tests: ✅ Step 5c `/review-pr` APPROVE (no host reviews required); `test` CI lane green
- Documentation: ✅ CHANGELOG and SKILL.md updated
- Security Review: ✅ PASS — boundary probed, 17 executed, 0 reproduced
- Compliance Review: ⚠️ NOT_APPLICABLE (counts as pass)
- CI reading 1: ✅ SUCCESS @ `ba663028b020` over 6 checks

**Outcome:** The task meets all Definition of Done criteria and is ready for acceptance.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-10-29T11:20Z
**Total Duration:** ~10 minutes
**CI reading 1:** SUCCESS @ `ba663028b02002dc84d7b7a0e9e23f59321b5174` (the acceptance decision — Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary)

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section, `status: accepted`, and a Change Log row
- ✅ Task registry row ticked (`registry-tick.js`)
- ✅ Sprint Review summary created
- ✅ AC record `task.242.dod.1.ac.json`, so the next `/finalise` run on this task is scoped
- ✅ Security probe record `task.242.dod.1.security.run.json` and its cases
- Outward side-effects — the PR canonical comment, the tracker comment and close, the board move — fire **after** this file is committed and pushed (Step 7 publish boundary); their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here

**Next Steps:**

- Task is ready for Sprint Review
- Merge PR #781 when ready (operator decision)
