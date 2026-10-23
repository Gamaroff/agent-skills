# Definition of Done Verification

**Story/Task:** task.211.migration-engine-monolith-and-domainless-prds
**Verification Started:** 2026-10-21T03:03Z

---

## Verification Results

## Step 1: QA Report Review ✅

**QA Report Found:** `task.211.qa.6.migration-engine-monolith-and-domainless-prds.md`
**Gate File Found:** `task.211.gate.6.migration-engine-monolith-and-domainless-prds.yml`
**PR Review Found:** `task.211.pr-review.1.migration-engine-monolith-and-domainless-prds.md` (Step 5c, verdict APPROVE)
**PR:** #712 (source: branch)

**Gate Status:** ✅ PASS
**Quality Score:** 95/100

**Success Criteria Coverage (from QA):** 8/8 PASS. A frontmatter-less PRD migrates, and an unclosed fence blocks. Outside links are re-pointed. A domain-less PRD blocks with `needs-domain`. `migration-guard.mjs` is deleted. Prefilter performance holds. `ci:fast`, `eval:all` and `bundle:check` pass. `validate` passes. Every new row is mutation-proven.

**NFR Validation (from QA):**

- Security: ✅ PASS (measured: 20 probes, 0 escaped)
- Performance: ✅ PASS
- Reliability: ✅ PASS
- Maintainability: ✅ PASS

**Immediate Actions from QA:** None. No issue blocks.
**Future Actions from QA:**

- CR-1 (low): a root-relative path into a dot-directory. Carried forward under route 2b.
- CR-2 (low, advisory): the `editFrontmatter` direct-call path.
- PR review PC-1 (low): the task's §3 Target omits two blocker codes that ship.

**Prior acceptance blocks in body:** 0

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS (agent returned ⚠️ PARTIAL: 9/10 PASS, with AC8 FAIL. The orchestrator judges AC8 met. See its entry and the deviation below.)
**PR Status:** OPEN (PR #712)
**PR Review Decision:** null. The host requires no reviews. The column is satisfied by `task.211.pr-review.1.migration-engine-monolith-and-domainless-prds.md` (Step 5c `/review-pr`, verdict ✅ APPROVE).

### Acceptance Criteria

#### AC1: A frontmatter-less PRD migrates with a clean check; an unclosed fence blocks and nothing moves

**Status:** ✅ PASS

- Code evidence: `shared/resources/migrate-doc-numbering.mjs:897`
- Test evidence: `shared/resources/tests/migrate-doc-numbering.test.mjs:1182` (also `:1208`, and eval `evals/shared/tests/prd-skill-numbering.test.mjs:951` gate-8). Both run per PR under `npm test` (`.github/workflows/test.yml:58`).

#### AC2: README `[PRD](docs/prd.md)` and `docs/` `[PRD](prd.md)` re-pointed

**Status:** ✅ PASS

- Code evidence: `shared/resources/migrate-doc-numbering.mjs:1265`
- Test evidence: `shared/resources/tests/migrate-doc-numbering.test.mjs:1241`. Also eval gate-8 (`:991-1010`) and gate-9/10 (`:1070`).

#### AC3: A domain-less PRD blocks with `needs-domain`; `<domain>/<slug>` places it; create-prd's keep block accepts it

**Status:** ✅ PASS

- Code evidence: `shared/resources/migrate-doc-numbering.mjs:598`
- Test evidence: `shared/resources/tests/migrate-doc-numbering.test.mjs:1308` (also `:1328`, `:1355`). The keep block is tested at `evals/shared/tests/prd-skill-numbering.test.mjs:1038`.

#### AC4: `migration-guard.mjs` refuses none of the three shapes, or no longer exists

**Status:** ✅ PASS

- Code evidence: the PR deletes `skills/review-prd/scripts/migration-guard.mjs`. Nothing under `skills/`, `shared/` or `evals/` references it.
- Test evidence: `evals/shared/tests/prd-skill-numbering.test.mjs:951` (gate-8 runs the plan and apply blocks over all three shapes).

#### AC5: The prefilter adds reads only for files that name a move source outside the root

**Status:** ✅ PASS

- Code evidence: `shared/resources/migrate-doc-numbering.mjs:1268`
- Test evidence: `shared/resources/tests/migrate-doc-numbering.test.mjs:1283`
- Note: the stale-reference scan (added in QA cycles 2–3, `:1439-1446`) is a separate loop, not the prefilter. When an outside source exists, it reads each in-scope tracked text file once. Row `:1698` pins this, and row `:1560` shows nothing is read when no outside source exists. The criterion bounds the prefilter, and the prefilter holds.

#### AC6: `ci:fast` and `eval:all` pass with `.agents/skills` moved aside; `bundle:check` is clean

**Status:** ✅ PASS

- Code evidence: `package.json:25`
- Test evidence: `.github/workflows/test.yml:58` (format:check, npm test, eval:all), and `validate.yml:128` for bundle check. The CI checkout has no `.agents/skills` (`.gitignore:22`). All 5 checks were green on `ee713f35`. qa-fix cycle 5 measured 6103 tests and 0 failures at `bce90253`. Every commit since is docs-only.

#### AC7: `npm run validate -- skills/review-prd/` passes

**Status:** ✅ PASS

- Code evidence: `package.json:51`
- Test evidence: `.github/workflows/validate.yml:67`. The validate check is green on PR #712, and QA report 6 records `ok`.

#### AC8: Every new row is mutation-proven

**Status:** ✅ PASS (orchestrator judgement; the agent returned ❌ FAIL)

- Code evidence: `task.211.implementation.1.migration-engine-monolith-and-domainless-prds-initial-run.md:79` (develop: 10 mutations, each turning at least one row red, and a row was added for the two that were unheld). Cycle fix results are at `:170`, `:180`, `:190`, `:200` and `:210`: 9, 11, 9, 7 and 3 mutations, all red. One mutation exposed an unreachable guard, which was removed, and one exposed a redundant filter, which was also removed. QA report 6 `:161-162` re-proves both cycle-5 fixes.
- Test evidence: `NOT_APPLICABLE: process criterion`. No per-PR test can assert that a mutation turned a row red.
- Agent's reading: the criterion was read as "each **row**". The evidence is recorded per mutation, with no row-by-row map, so that reading is a FAIL.
- Orchestrator's reading: the task defines the criterion itself, in §8 Testing Strategy (`task.211…md:194`): "**Mutation-proven**: revert each **fix** and name the row that goes red." Under that definition the committed evidence covers every fix in every cycle (49 mutations, all red or acted on). This is a judgement, recorded here and in the deviation below. It is not presented as the agent's verdict.

#### AC9: review-prd's plan block documents `needs-domain` and the `<domain>/<slug>` form

**Status:** ✅ PASS

- Code evidence: `skills/review-prd/SKILL.md:445` (and `:412-413`)
- Test evidence: `evals/shared/tests/prd-skill-numbering.test.mjs:1024` (it slices the live plan block out of SKILL.md and runs it per PR).

#### AC10: The CHANGELOG entry names the `--name` form and the new blocker

**Status:** ✅ PASS

- Code evidence: `CHANGELOG.md:40` (the BREAKING entry citing task 211 names `--name <path>=<domain>/<slug>` at `:47` and `needs-domain` at `:50`)
- Test evidence: `evals/shared/tests/changelog-entry-drift.test.mjs`. This is a post-merge guard.

### Documentation

- **CHANGELOG entry for task 211**: ✅ PASS (`CHANGELOG.md:40`)
- **review-prd SKILL.md blocks and blocker instructions**: ✅ PASS (`skills/review-prd/SKILL.md:445`)
- **Bundled engine copy regenerated**: ✅ PASS (`skills/review-prd/references/migrate-doc-numbering.mjs:1`). The bundle check is green.
- **Contributor traps doc**: ✅ PASS (`docs/contributing/traps.md`)

**Agent summary:** 9 of 10 success criteria pass, each on a per-PR test lane that is green on head `ee713f35`. The agent failed AC8 on a per-row reading, and AC5 passes with a caveat about the stale-reference scan's reads.

**Deviation recorded, not hidden:** the AC agent's AC8 FAIL was overridden by orchestrator judgement. The override rests on the criterion's own definition in task §8, which is per fix, and on the per-cycle mutation records committed in the implementation report and the QA reports. No row-by-row mutation map exists. If the criterion is meant per row, this DoD overstates it.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ✅ PASS

### Security domain inference (Step 1)

**Status:** ⚠️ NOT_APPLICABLE

- No citation found
- Note: the deliverable is a local Node CLI. It has no API, UI, schema, auth or infra config, so the task/refactoring checklist applies. The caller-supplied `--name` value is covered by probe mode.

### No hardcoded secrets introduced

**Status:** ✅ PASS

- Evidence: a grep of the PR diff's added lines finds 0 credential literals.

### No new unsafe patterns (eval/exec/shell)

**Status:** ✅ PASS

- Evidence: `shared/resources/migrate-doc-numbering.mjs:232`
- Note: the only child process is `spawnSync("git", args)`, which runs with no shell. The `.exec(` hits in the diff are calls on a RegExp.

### Caller-supplied path segments contained (`--name`)

**Status:** ✅ PASS

- Evidence: `shared/resources/migrate-doc-numbering.mjs:243`
- Note: `parseNameValue` splits on `/`, allows at most 2 parts, and checks each part against `doc-id.js` `SLUG_RE`. The probe below confirms it holds.

### Removed guard's refusals preserved

**Status:** ✅ PASS

- Evidence: `docs/tasks/task.211.migration-engine-monolith-and-domainless-prds/task.211.migration-engine-monolith-and-domainless-prds.md:206`
- Note: the three shapes the guard refused are now caught by the engine's `unclosed-frontmatter`, `displaced-frontmatter`, `needs-domain` and `stale-reference` blockers, before `--apply` runs.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS. The diff adds none.
- **dependency risk**: ⚠️ NOT_APPLICABLE. `package.json` is not in the diff, and the engine imports only `node:` built-ins and `./doc-id.js`.

### Probe Results

**Candidates executed:** 31. **Reproduced:** 0

✅ **The boundary held.** Every candidate returned its expected verdict: `engages`, with 5 legitimate cases accepted, 26 hostile cases refused, and 0 escapes.

- /finalise ran the probe from the security agent's plan: 1 control (`shared/resources/migrate-doc-numbering.mjs#parseNameValue`, `--sink path`). The record is at `task.211.dod.1.security.run.json`, and the cases are in `task.211.dod.1.security.cases.json`. QA cycle 6 ran 20 cases. This plan adds 11 more: newline and CR, hyphen forms, a homoglyph, a Unicode slash, an encoded slash, trailing NUL and trailing slash, and one more legitimate name.

**Agent summary:** the task/refactoring checklist passes. `parseNameValue` is the one containment check for caller-supplied path segments, and the probe shows it engages. `frontmatterState` and `outsideReferences` return enums or arrays, so unit tests cover them rather than the probe engine.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None (NOT_APPLICABLE)

### GDPR / PCI-DSS / WCAG / HIPAA

**Status:** ⚠️ NOT_APPLICABLE

- No citation found
- Note: this is an internal refactor of a document-migration CLI and the review-prd skill. It touches no personal, payment or health data, and the diff contains no UI files.

**Agent summary:** no compliance area applies.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS

- Evidence: `CHANGELOG.md:40`
- Note: the entry is under `## [Unreleased]`, cites `(task 211)`, is marked BREAKING, and covers all four new blockers, the `--name <domain>/<slug>` form and the guard removal.

### API/type-specific docs updated

**Status:** ✅ PASS

- Evidence: `skills/review-prd/SKILL.md:445`
- Note: all four blocker codes are documented. Only the SKILL.md body changed, so the catalog needs no regeneration.

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE

- No citation found
- Note: README links review-prd only through the catalog. The change adds no public API, config key or top-level command.

**Agent summary:** the CHANGELOG cites task 211, and review-prd SKILL.md documents every new blocker code.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

**Summary:**

- QA Report: ✅ PASS (Quality Score: 95/100, gate 6)
- Acceptance Criteria: ✅ 10/10 (AC8 by orchestrator judgement, recorded in Step 2)
- PR Review & Tests: ✅ the Step 5c `/review-pr` verdict is APPROVE (the host requires no reviews). Per-PR test lanes are green.
- CI: ✅ reading 1 is SUCCESS @ `ee713f35c8eb` over 5 checks (link-check, shellcheck, test, validate, branch policy)
- Documentation: ✅ PASS
- Security Review: ✅ PASS (probe: 31 executed, 0 reproduced, 0 escaped)
- Compliance Review: ⚠️ NOT_APPLICABLE (counts as pass)

**Outcome:** the task meets every Definition of Done criterion and is ready for acceptance. Three low items are open as follow-ups: CR-1, CR-2 and PC-1.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-10-21T03:10Z
**Total Duration:** ~7 minutes
**CI reading 1:** SUCCESS @ `ee713f35c8eb` (the acceptance decision, Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed. It is recorded on the PR canonical summary comment and in the implementation report (Step 7 publish boundary).

**Artifacts Generated:**

- ✅ Task document updated with a DoD verification section, `status: accepted`, and a Change Log acceptance row
- ✅ Task registry row ticked (see the implementation report for the `registry-tick.js` reason)
- ✅ Sprint Review summary created (`sprint-review-summary.md`)
- ✅ Security probe record `task.211.dod.1.security.run.json` and cases `task.211.dod.1.security.cases.json`
- Outward side-effects fire **after** this file is committed and pushed (Step 7 publish boundary): the PR canonical comment, the tracker comment and close, and the board move. Their outcomes are recorded on the PR canonical comment and in the implementation report's Decisions Log, not here.

**Next Steps:**

- The task is ready for Sprint Review and merge.
- Follow-ups: PC-1 (bring task §3 Target in line with `BLOCKER_CODES`), CR-1 (dot-directory root-relative path) and CR-2 (`editFrontmatter` on a displaced block).
