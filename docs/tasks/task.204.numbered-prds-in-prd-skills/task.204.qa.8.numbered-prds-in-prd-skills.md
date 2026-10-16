# QA Report: Task 204 - Numbered PRDs in the PRD skills (cycle 8)

**Task**: [task.204.numbered-prds-in-prd-skills.md](./task.204.numbered-prds-in-prd-skills.md)
**Gate File**: [task.204.gate.8.numbered-prds-in-prd-skills.yml](./task.204.gate.8.numbered-prds-in-prd-skills.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Testing Completed**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 8 at `80542c82` (fix commit `e8d205a3`), the one cycle granted on the second re-entry. Gate
7's findings are fixed and verified; no HIGH. The re-probe ran the migration review-prd offers end to
end on seven fixtures and found five reproduced mediums on that path, two of them defects in the
task-203 engine that develop already carries.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate-7 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 migration rewrites the bare word `prd` tree-wide | ✅ FIXED | gate-7 migration row (other PRD byte-identical), mutation-proven (token and basename filters) |
| CR-2 shard checks the file, not the target directory | ✅ FIXED | shard back-link case, mutation-proven |
| CR-3 (advisory) legacy PRD linking out of the working tree | ✅ FIXED | gate-7 CR-3 row, mutation-proven |

## New Findings This Cycle

- **[medium]** `skills/review-prd/SKILL.md:571` — apply failure drops the engine's findings and revert command (**CR-1**).
- **[medium]** `shared/resources/migrate-doc-numbering.mjs:724` — a legacy PRD with no frontmatter is offered an apply that always fails post-check (**CR-2**; engine, on develop too).
- **[medium]** `skills/review-prd/SKILL.md:416` — only one `--name`; two unnamed L3 PRDs can never clear (**CR-3**).
- **[medium]** `skills/create-prd/SKILL.md:436` — create-prd refuses the root placement the migration produces; the remedy loops (**CR-4**).
- **[medium]** `shared/resources/migrate-doc-numbering.mjs:1038` — links to `docs/prd.md` from outside the PRD tree are left dead after the move, and the run reports `ok` (**CR-5**; engine, on develop too).
- **[low, medium confidence]** `skills/create-prd/SKILL.md:359` — no block refuses a PRD_ROOT that is itself outside the working tree (CR-6, advisory).

Searched unscoped (safety re-probe): full `origin/develop...HEAD` diff, vendored copies excluded,
47 files. The reviewer ran every block from the live SKILL.md files in seven consumer-shaped git
fixtures (monolith with and without frontmatter, monolith plus root index, legacy PRDs with epics,
outside links, symlinked PRD root) and diffed every file the migration touched.

**Verified by QA**: CR-2 and CR-5 reproduced on this branch's engine and on develop's (`plan` dry-run
with 0 blockers then `apply` post-check-failed; `apply` ok with README's `[PRD](docs/prd.md)`
unchanged). Provenance: engine defects present on develop; develop's review-prd never reaches the
engine, and this task's scope is review-prd offering that migration — so they stay in `top_issues[]`.

---

## Review Methodology

Re-review scope: unscoped (prior gate: FAIL, reliability; security CONCERNS on containment —
`SAFETY_REPROBE=true` by judgement). One Explore reviewer with the SAFETY RE-PROBE directive plus an
instruction to exercise the migration path end to end; 340 s (completion notice `duration_ms`
340158). qa-task steps run by the orchestrator from the skill text loaded for cycle 6.

---

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 24
- Both allocation controls engage (`task.204.qa.8.security.run.json`). CR-6 is advisory.

### Reliability — CONCERNS
CR-1, CR-2, CR-3, CR-5.

### Maintainability — CONCERNS
CR-4.

### Performance — PASS

---

## Code Review

Anchors: CR-2, CR-3, CR-5 `ok`; CR-1, CR-4, CR-6 `unchecked-text` (no line text supplied).

**Correctness bugs (6):** CR-1..CR-5 medium/high — **promoted**; CR-6 low/medium — advisory.
**Cleanups (0).** **Boundary**: `boundary: true`, `probes_executed: 24`.

---

## Regression Testing

At `e8d205a3` (cycle 7, 5b): `npm run ci:fast` with `.agents/skills` parked, 5715 pass / 0 fail;
migrate-doc-numbering engine suite 44/44; `bundle:check` clean. `prd-skill-numbering.test.mjs`
39/39 at `80542c82`.

---

## Final Assessment

**Gate Status**: CONCERNS — five medium, no high. **Quality Score**: 50/100.
**Deployment Recommendation**: CONDITIONAL — CR-1..CR-5 closed, or moved to a follow-up with
review-prd refusing the shapes the migration cannot handle.
**Next Steps**: `/qa-fix` cycle 8 — the last budgeted cycle.
