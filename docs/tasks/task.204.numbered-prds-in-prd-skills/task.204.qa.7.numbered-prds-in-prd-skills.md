# QA Report: Task 204 - Numbered PRDs in the PRD skills (cycle 7)

**Task**: [task.204.numbered-prds-in-prd-skills.md](./task.204.numbered-prds-in-prd-skills.md)
**Gate File**: [task.204.gate.7.numbered-prds-in-prd-skills.yml](./task.204.gate.7.numbered-prds-in-prd-skills.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Testing Completed**: 2026-10-15
**Gate Status**: FAIL

---

## Executive Summary

Cycle 7 at `84b065af`, the last of the two cycles granted on re-entry. Gate 6's finding is fixed and
verified. The safety re-probe found a reproduced HIGH outside the containment class: the monolith
migration review-prd drives rewrites the bare word `prd` across the PRD tree, including `type: prd`
in every other PRD, and reports `ok`. One promoted medium and one advisory medium remain in the
containment class.

**Overall Assessment**: FAIL · **Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Gate-6 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 review-prd does not stop on a PRD outside the root; report directory uncontained | ✅ FIXED | gate-6 row, mutation-proven in cycle 6 (4 mutations) |

## New Findings This Cycle

- **[high]** `skills/review-prd/SKILL.md:563` (root cause `shared/resources/migrate-doc-numbering.mjs`, token pass) — migrating `docs/prd.md` rewrites every standalone `prd` under the root, `type: prd` included, and exits `ok` → keep undotted stems out of the token pass (**CR-1**, promoted).
- **[medium]** `skills/shard-prd/SKILL.md:124` — the guard checks the file's realpath, not the directory md-tree writes into → check the directory (**CR-2**, promoted).
- **[medium, medium confidence]** `skills/review-prd/SKILL.md:339` — the text-outside-root early exit precedes the realpath stop, so a legacy PRD above the root that symlinks out of the working tree is reported, not stopped (CR-3, advisory).

Searched unscoped (safety re-probe): full `origin/develop...HEAD` diff, vendored copies excluded,
57 files. The reviewer ran all ten blocks unchanged in scratch git repos over PRD_ROOT, DOMAIN,
FEATURE, FOUND_PRD, PRD_FILE, TITLE, PRD_INPUT and MIG_NAME, with dangling, live, directory and file
symlinks at the domain, stem, file and registry positions, and read the callees (doc-id.js
`appendPrdRow`, migrate-doc-numbering.mjs, resolve-paths.sh).

**CR-1 reproduced by QA**: a git fixture with `docs/prd/shop/prd.1.shop/prd.1.shop.md` (`type: prd`,
prose "The prd says hi."), a legacy `docs/prd.md` and a valid registry; the migration plan has no
blockers, apply returns `ok`, and the shop PRD's diff is `-type: prd` / `+type: prd.2.legacy` and
`-The prd says hi.` / `+The prd.2.legacy says hi.`.

**Provenance (step 5b)**: develop's engine, on the same fixture, gives the same diff — the defect is in
the task-203 engine. develop's review-prd has no reference to the engine (`grep -c` → 0); this branch
adds the apply block and the instruction (`--name docs/prd.md=<slug>`) that sends a root-level
`docs/prd.md` down it, and the task's own scope covers migrating that monolith. In scope: kept in
`top_issues[]`.

---

## Review Methodology

Re-review scope: unscoped (prior gate: security CONCERNS on containment — clause 1 `false`,
`SAFETY_REPROBE=true` by judgement, as in cycles 3, 5 and 6). One Explore reviewer with the SAFETY
RE-PROBE directive; 238 s (completion notice `duration_ms` 237986). This cycle's qa-task steps were
run by the orchestrator from the skill text loaded for cycle 6, not by a fresh `/qa-task` invocation.

Step 4b: as cycle 6 — no new fenced blocks; the one execution failure is the pre-existing Step 8
`git log --since` placeholder block, outside this diff.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0–2 | PASS | unchanged |
| Phase 1 (create-prd) | PASS | |
| Phase 3 (review-prd, shard-prd) | FAIL | CR-1 (migration), CR-2 (shard) |
| Phase 4 (tests) | PASS | 37 rows at 84b065af |

---

## NFR Assessment

### Security — CONCERNS
- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 24
- Controls `create-prd-allocate-slug` (11) and `create-prd-allocate-domain` (13), both `engages`
  (`task.204.qa.7.security.run.json`). CR-2 and CR-3 are reachable only through symlinks the
  repository never creates.

### Reliability — FAIL
CR-1: the migration the skill offers corrupts other documents and reports success.

### Performance — PASS · Maintainability — PASS

---

## Code Review

Anchors: all `ok`.

**Correctness bugs (3):**
- [high/high] `skills/review-prd/SKILL.md:563` — monolith migration rewrites the bare word `prd` tree-wide. **Promoted: CR-1.**
- [medium/high] `skills/shard-prd/SKILL.md:124` — shard guard checks the file, not the target directory. **Promoted: CR-2.**
- [medium/medium] `skills/review-prd/SKILL.md:339` — text-outside early exit precedes the realpath stop (advisory).

**Cleanups (0).** **Boundary**: `boundary: true`, `probes_executed: 24`.

---

## Regression Testing

At the 84b065af tree (cycle 6, 5b): `npm run ci:fast` with `.agents/skills` parked, 5713 pass / 0
fail; `bundle:check` clean; `validate` rc 0. `prd-skill-numbering.test.mjs` 37/37.

---

## Final Assessment

**Gate Status**: FAIL — one high, one promoted medium. **Quality Score**: 70/100.
**Deployment Recommendation**: BLOCKED — CR-1 and CR-2 closed.
**Next Steps**: `/qa-fix` cycle 7; the budget is then spent.
